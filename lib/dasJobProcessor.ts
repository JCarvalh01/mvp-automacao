import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  consultarDasNoGoverno,
  DasAutomationEntry,
  DasPaymentStatus,
} from "@/lib/dasAutomation";

type DasJobStatus = "queued" | "processing" | "done" | "retry" | "error";

type DasSyncJob = {
  id: number;
  partner_company_id: number;
  client_id: number;
  year: number;
  month: number;
  competency_label: string;
  status: DasJobStatus;
  attempt_count: number;
  max_attempts: number;
  locked_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  next_retry_at: string | null;
  last_error: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type ClientRow = {
  id: number;
  name: string;
  cnpj: string;
  partner_company_id: number;
  is_active: boolean;
};

export type ProcessOneDasJobResult =
  | {
      ok: true;
      message: string;
      jobId: number | null;
      processed: boolean;
    }
  | {
      ok: false;
      message: string;
      jobId: number | null;
      processed: boolean;
    };

function nowIso() {
  return new Date().toISOString();
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function buildRetrySchedule(attemptCount: number) {
  if (attemptCount <= 1) return addMinutes(new Date(), 30).toISOString();
  if (attemptCount === 2) return addMinutes(new Date(), 90).toISOString();
  if (attemptCount === 3) return addMinutes(new Date(), 240).toISOString();
  return addMinutes(new Date(), 720).toISOString();
}

function buildCompetencyLabel(year: number, month: number) {
  return `${String(month).padStart(2, "0")}/${year}`;
}

async function pickEligibleJob(jobId?: number): Promise<DasSyncJob | null> {
  if (jobId) {
    const { data, error } = await supabaseAdmin
      .from("das_sync_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (error) throw error;
    return (data as DasSyncJob | null) || null;
  }

  const now = nowIso();

  const { data, error } = await supabaseAdmin
    .from("das_sync_jobs")
    .select("*")
    .in("status", ["queued", "retry"])
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) throw error;

  const jobs = (data || []) as DasSyncJob[];
  if (!jobs.length) return null;

  const staleLockThreshold = Date.now() - 20 * 60_000;

  const eligible = jobs.find((job) => {
    if (!job.locked_at) return true;
    return new Date(job.locked_at).getTime() < staleLockThreshold;
  });

  return eligible || null;
}

async function lockJob(job: DasSyncJob): Promise<DasSyncJob | null> {
  const nextAttempt = (job.attempt_count || 0) + 1;
  const timestamp = nowIso();

  const { data, error } = await supabaseAdmin
    .from("das_sync_jobs")
    .update({
      status: "processing",
      attempt_count: nextAttempt,
      locked_at: timestamp,
      started_at: job.started_at || timestamp,
      finished_at: null,
      last_error: null,
    })
    .eq("id", job.id)
    .eq("attempt_count", job.attempt_count)
    .select("*")
    .maybeSingle();

  if (error) throw error;

  return (data as DasSyncJob | null) || null;
}

async function finishJob(jobId: number, data: Partial<DasSyncJob>) {
  const { error } = await supabaseAdmin
    .from("das_sync_jobs")
    .update({
      ...data,
      locked_at: null,
      finished_at: nowIso(),
    })
    .eq("id", jobId);

  if (error) throw error;
}

async function retryJob(job: DasSyncJob, reason: string) {
  const nextRetryAt = buildRetrySchedule(job.attempt_count);

  if (job.attempt_count >= job.max_attempts) {
    await finishJob(job.id, {
      status: "error",
      last_error: reason,
      next_retry_at: null,
    });
    return;
  }

  const { error } = await supabaseAdmin
    .from("das_sync_jobs")
    .update({
      status: "retry",
      last_error: reason,
      next_retry_at: nextRetryAt,
      locked_at: null,
      finished_at: null,
    })
    .eq("id", job.id);

  if (error) throw error;
}

async function getClient(clientId: number): Promise<ClientRow | null> {
  const { data, error } = await supabaseAdmin
    .from("clients")
    .select("id, name, cnpj, partner_company_id, is_active")
    .eq("id", clientId)
    .maybeSingle();

  if (error) throw error;
  return (data as ClientRow | null) || null;
}

async function upsertDasPayments(
  partnerCompanyId: number,
  clientId: number,
  entries: DasAutomationEntry[]
) {
  if (!entries.length) return;

  const rows = entries.map((entry) => ({
    partner_company_id: partnerCompanyId,
    client_id: clientId,
    year: entry.year,
    month: entry.month,
    competency_label: entry.competencyLabel,
    due_date: entry.dueDate,
    amount: entry.amount,
    status: entry.status,
    paid_at: entry.paidAt,
    payment_method: null,
    notes: null,
    government_message: entry.governmentMessage,
    last_checked_at: nowIso(),
  }));

  const { error } = await supabaseAdmin
    .from("das_payments")
    .upsert(rows, { onConflict: "client_id,year,month" });

  if (error) throw error;
}

async function upsertUnavailablePayment(params: {
  partnerCompanyId: number;
  clientId: number;
  year: number;
  month: number;
  message: string;
}) {
  const { partnerCompanyId, clientId, year, month, message } = params;

  const row = {
    partner_company_id: partnerCompanyId,
    client_id: clientId,
    year,
    month,
    competency_label: buildCompetencyLabel(year, month),
    due_date: null,
    amount: null,
    status: "unavailable" as DasPaymentStatus,
    paid_at: null,
    payment_method: null,
    notes: null,
    government_message: message,
    last_checked_at: nowIso(),
  };

  const { error } = await supabaseAdmin
    .from("das_payments")
    .upsert(row, { onConflict: "client_id,year,month" });

  if (error) throw error;
}

export async function processOneDasJob(jobId?: number): Promise<ProcessOneDasJobResult> {
  try {
    const picked = await pickEligibleJob(jobId);

    if (!picked) {
      return {
        ok: true,
        processed: false,
        jobId: null,
        message: "Nenhum job elegível encontrado na fila.",
      };
    }

    const locked = await lockJob(picked);

    if (!locked) {
      return {
        ok: true,
        processed: false,
        jobId: picked.id,
        message: "Job já foi capturado por outro processamento.",
      };
    }

    const client = await getClient(locked.client_id);

    if (!client || !client.is_active) {
      await finishJob(locked.id, {
        status: "error",
        last_error: "Cliente inexistente ou inativo para processamento do DAS.",
      });

      return {
        ok: false,
        processed: true,
        jobId: locked.id,
        message: "Cliente inexistente ou inativo.",
      };
    }

    if (!client.cnpj) {
      await finishJob(locked.id, {
        status: "error",
        last_error: "Cliente sem CNPJ cadastrado.",
      });

      return {
        ok: false,
        processed: true,
        jobId: locked.id,
        message: "Cliente sem CNPJ cadastrado.",
      };
    }

    const consultation = await consultarDasNoGoverno({
      cnpj: client.cnpj,
      year: locked.year,
    });

    if (!consultation.success) {
      await upsertUnavailablePayment({
        partnerCompanyId: locked.partner_company_id,
        clientId: locked.client_id,
        year: locked.year,
        month: locked.month,
        message: consultation.message,
      });

      if (consultation.blocked) {
        await retryJob(locked, consultation.message);

        return {
          ok: false,
          processed: true,
          jobId: locked.id,
          message: `Job reprogramado por bloqueio: ${consultation.message}`,
        };
      }

      await retryJob(locked, consultation.message);

      return {
        ok: false,
        processed: true,
        jobId: locked.id,
        message: `Job reprogramado por falha de leitura: ${consultation.message}`,
      };
    }

    await upsertDasPayments(
      locked.partner_company_id,
      locked.client_id,
      consultation.entries
    );

    const targetMonthFound = consultation.entries.some(
      (entry) => entry.year === locked.year && entry.month === locked.month
    );

    if (!targetMonthFound) {
      await upsertUnavailablePayment({
        partnerCompanyId: locked.partner_company_id,
        clientId: locked.client_id,
        year: locked.year,
        month: locked.month,
        message:
          "A consulta anual foi concluída, mas a competência alvo não apareceu de forma confiável na tabela do governo.",
      });
    }

    await finishJob(locked.id, {
      status: "done",
      last_error: null,
      next_retry_at: null,
    });

    return {
      ok: true,
      processed: true,
      jobId: locked.id,
      message: "Job processado com sucesso.",
    };
  } catch (error) {
    return {
      ok: false,
      processed: false,
      jobId: jobId || null,
      message: error instanceof Error ? error.message : "Erro inesperado no processador de DAS.",
    };
  }
}