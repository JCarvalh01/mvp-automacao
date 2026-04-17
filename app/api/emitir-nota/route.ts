import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type EmitirNotaBody = {
  invoiceId?: number | string;
  clientId?: number | string;
  partnerCompanyId?: number | string | null;
  competencyDate?: string;
  tomadorDocumento?: string;
  taxCode?: string;
  serviceCity?: string;
  serviceValue?: number | string;
  serviceDescription?: string;
  cancelKey?: string | null;
};

type InvoiceRow = {
  id: number;
  client_id: number;
  partner_company_id: number | null;
  status: string | null;
  pdf_url?: string | null;
  xml_url?: string | null;
  pdf_path?: string | null;
  xml_path?: string | null;
  nfse_key?: string | null;
  error_message?: string | null;
};

type ClientRow = {
  id: number;
  cnpj: string | null;
  password: string | null;
  emissor_password?: string | null;
  partner_company_id: number | null;
  is_active: boolean | null;
  is_blocked?: boolean | null;
  plan_type?: string | null;
  notes_limit?: number | null;
  subscription_status?: string | null;
  last_payment_at?: string | null;
  subscription_expires_at?: string | null;
};

type PartnerCompanyRow = {
  id: number;
  is_blocked?: boolean | null;
  payment_status?: string | null;
  last_payment_at?: string | null;
  subscription_expires_at?: string | null;
};

type JobRow = {
  id: number;
  status: string | null;
  created_at?: string | null;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

function onlyDigits(value: string | number | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : NaN;
  }

  const raw = String(value ?? "").trim();
  if (!raw) return NaN;

  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");

  let normalized = raw.replace(/\s/g, "");

  if (hasComma && hasDot) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = normalized.replace(",", ".");
  }

  const num = Number(normalized);
  return Number.isFinite(num) ? num : NaN;
}

function getMonthStartIso() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  return start.toISOString();
}

function getEffectiveNotesLimit(
  planType: string | null | undefined,
  dbNotesLimit?: number | null
) {
  const plano = String(planType || "").trim().toLowerCase();

  if (plano === "full") return 999999;
  if (plano === "essencial") return 10;

  if (typeof dbNotesLimit === "number" && Number.isFinite(dbNotesLimit)) {
    return dbNotesLimit;
  }

  return 0;
}

function isSubscriptionBlocked(status: string | null | undefined) {
  const value = String(status || "").trim().toLowerCase();

  if (!value) return false;

  return ["inactive", "expired", "canceled", "cancelled", "blocked"].includes(
    value
  );
}

function isExpiredDate(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return false;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return false;

  return date.getTime() < Date.now();
}

function isFinalInvoiceSuccess(invoice: InvoiceRow | null | undefined) {
  if (!invoice) return false;

  const status = String(invoice.status || "").trim().toLowerCase();
  const hasStatusSuccess = status === "success";
  const hasNfseKey = Boolean(String(invoice.nfse_key || "").trim());

  return hasStatusSuccess && hasNfseKey;
}

async function bloquearClientePorVencimento(clientId: number) {
  return await supabaseAdmin
    .from("clients")
    .update({
      is_blocked: true,
      subscription_status: "expired",
    })
    .eq("id", clientId);
}

async function bloquearEmpresaPorVencimento(partnerCompanyId: number) {
  return await supabaseAdmin
    .from("partner_companies")
    .update({
      is_blocked: true,
      payment_status: "expired",
    })
    .eq("id", partnerCompanyId);
}

async function logJob(params: {
  jobId: number;
  invoiceId: number;
  level?: "debug" | "info" | "warning" | "error";
  message: string;
  meta?: any;
}) {
  try {
    await supabaseAdmin.from("invoice_job_logs").insert({
      job_id: params.jobId,
      invoice_id: params.invoiceId,
      level: params.level || "info",
      message: params.message,
      meta: params.meta ?? null,
    });
  } catch (err) {
    console.error("Erro ao salvar log do job:", err);
  }
}

async function buscarInvoice(invoiceId: number) {
  const { data, error } = await supabaseAdmin
    .from("invoices")
    .select(`
      id,
      client_id,
      partner_company_id,
      status,
      pdf_url,
      xml_url,
      pdf_path,
      xml_path,
      nfse_key,
      error_message
    `)
    .eq("id", invoiceId)
    .single();

  return {
    data: (data as InvoiceRow | null) || null,
    error,
  };
}

async function buscarCliente(clientId: number) {
  const { data, error } = await supabaseAdmin
    .from("clients")
    .select(
      "id, cnpj, password, emissor_password, partner_company_id, is_active, is_blocked, plan_type, notes_limit, subscription_status, last_payment_at, subscription_expires_at"
    )
    .eq("id", clientId)
    .single();

  return {
    data: (data as ClientRow | null) || null,
    error,
  };
}

async function buscarEmpresaParceira(partnerCompanyId: number) {
  const { data, error } = await supabaseAdmin
    .from("partner_companies")
    .select(
      "id, is_blocked, payment_status, last_payment_at, subscription_expires_at"
    )
    .eq("id", partnerCompanyId)
    .single();

  return {
    data: (data as PartnerCompanyRow | null) || null,
    error,
  };
}

async function buscarJobAtivo(invoiceId: number) {
  const { data, error } = await supabaseAdmin
    .from("invoice_jobs")
    .select("id, status, created_at")
    .eq("invoice_id", invoiceId)
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    data: (data as JobRow | null) || null,
    error,
  };
}

async function marcarInvoicePending(invoiceId: number) {
  return await supabaseAdmin
    .from("invoices")
    .update({
      status: "pending",
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);
}

async function marcarInvoiceQueued(invoiceId: number) {
  return await supabaseAdmin
    .from("invoices")
    .update({
      status: "queued",
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);
}

async function marcarInvoiceErro(invoiceId: number, mensagem: string) {
  return await supabaseAdmin
    .from("invoices")
    .update({
      status: "error",
      error_message: mensagem,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);
}

async function contarNotasSuccessDoMes(clientId: number) {
  const { count, error } = await supabaseAdmin
    .from("invoices")
    .select("id", { count: "estimated", head: true })
    .eq("client_id", clientId)
    .eq("status", "success")
    .gte("created_at", getMonthStartIso());

  return {
    count: count || 0,
    error,
  };
}

async function criarJobEmissao(params: {
  invoiceId: number;
  clientId: number;
  partnerCompanyId: number | null;
  payload: any;
}) {
  const insertPayload = {
    invoice_id: params.invoiceId,
    client_id: params.clientId,
    partner_company_id: params.partnerCompanyId,
    job_type: "emit_nfse",
    status: "queued",
    attempts: 0,
    max_attempts: 3,
    locked_at: null,
    started_at: null,
    finished_at: null,
    cancel_requested: false,
    cancel_requested_at: null,
    error_message: null,
    payload: params.payload,
    result: null,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("invoice_jobs")
    .insert(insertPayload)
    .select("id, status, created_at")
    .single();

  return {
    data: (data as JobRow | null) || null,
    error,
  };
}

async function dispararProcessamentoFilaEmBackground() {
  const appUrl =
    String(process.env.NEXT_PUBLIC_APP_URL || "").trim() ||
    "https://www.mvp-automacao.com";

  const target = `${appUrl.replace(/\/$/, "")}/api/jobs/process`;

  try {
    fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }).catch((error) => {
      console.error("Erro ao disparar processamento da fila:", error);
    });
  } catch (error) {
    console.error("Erro ao iniciar disparo da fila:", error);
  }
}

export async function POST(request: Request) {
  let invoiceId: number | null = null;
  let clientIdParsed = NaN;
  let partnerCompanyIdParsed = NaN;

  try {
    const body = (await request.json()) as EmitirNotaBody;

    const invoiceIdParsed = toNumber(body.invoiceId);
    clientIdParsed = toNumber(body.clientId);
    partnerCompanyIdParsed = toNumber(body.partnerCompanyId);
    const serviceValueParsed = toNumber(body.serviceValue);

    const isClienteDiretoPeloBody =
      body.partnerCompanyId === null ||
      body.partnerCompanyId === undefined ||
      String(body.partnerCompanyId).trim() === "";

    invoiceId = Number.isNaN(invoiceIdParsed) ? null : invoiceIdParsed;

    const competencyDate = String(body.competencyDate ?? "").trim();
    const tomadorDocumento = onlyDigits(body.tomadorDocumento);
    const taxCode = String(body.taxCode ?? "").trim();
    const serviceCity = String(body.serviceCity ?? "").trim();
    const serviceDescription = String(body.serviceDescription ?? "").trim();
    const cancelKey =
      String(body.cancelKey ?? "").trim() || (invoiceId ? String(invoiceId) : null);

    if (
      !invoiceId ||
      Number.isNaN(clientIdParsed) ||
      (!isClienteDiretoPeloBody && Number.isNaN(partnerCompanyIdParsed)) ||
      !competencyDate ||
      !tomadorDocumento ||
      !taxCode ||
      !serviceCity ||
      !serviceDescription ||
      Number.isNaN(serviceValueParsed) ||
      serviceValueParsed <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Dados obrigatórios inválidos ou não enviados.",
        },
        { status: 400 }
      );
    }

    const { data: invoiceAtual, error: invoiceError } = await buscarInvoice(invoiceId);

    if (invoiceError || !invoiceAtual) {
      console.error("Invoice não encontrada:", invoiceError);

      return NextResponse.json(
        {
          success: false,
          message: "Registro da nota não encontrado.",
        },
        { status: 404 }
      );
    }

    const invoice = invoiceAtual;

    if (isFinalInvoiceSuccess(invoice)) {
      return NextResponse.json(
        {
          success: true,
          message: "Nota já emitida anteriormente.",
          status: "success",
          invoice: {
            id: invoice.id,
            status: invoice.status,
            nfse_key: invoice.nfse_key,
            pdf_url: invoice.pdf_url,
            xml_url: invoice.xml_url,
            pdf_path: invoice.pdf_path,
            xml_path: invoice.xml_path,
            error_message: invoice.error_message,
          },
        },
        { status: 200 }
      );
    }

    if (Number(invoice.client_id) !== clientIdParsed) {
      return NextResponse.json(
        {
          success: false,
          message: "A nota não pertence ao cliente informado.",
        },
        { status: 400 }
      );
    }

    if (
      !isClienteDiretoPeloBody &&
      Number(invoice.partner_company_id) !== partnerCompanyIdParsed
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "A nota não pertence à empresa informada.",
        },
        { status: 400 }
      );
    }

    if (isClienteDiretoPeloBody && invoice.partner_company_id !== null) {
      await marcarInvoiceErro(
        invoiceId,
        "Inconsistência de emissão: a nota está vinculada a uma empresa."
      );

      return NextResponse.json(
        {
          success: false,
          message: "A nota informada não pertence a um cliente direto.",
        },
        { status: 400 }
      );
    }

    const { data: clienteAtual, error: clientError } = await buscarCliente(clientIdParsed);

    if (clientError || !clienteAtual) {
      await marcarInvoiceErro(invoiceId, "Cliente não encontrado.");
      return NextResponse.json(
        {
          success: false,
          message: "Cliente não encontrado.",
        },
        { status: 404 }
      );
    }

    const cliente = clienteAtual;
    const senhaEmissor = String(
      cliente.emissor_password || cliente.password || ""
    ).trim();
    const clienteVinculadoEmpresa = Boolean(cliente.partner_company_id);
    const partnerCompanyIdEfetivo = clienteVinculadoEmpresa
      ? Number(cliente.partner_company_id)
      : null;

    if (clienteVinculadoEmpresa) {
      if (isClienteDiretoPeloBody) {
        await marcarInvoiceErro(
          invoiceId,
          "Cliente vinculado à empresa não pode emitir como cliente direto."
        );

        return NextResponse.json(
          {
            success: false,
            message: "Este cliente está vinculado a uma empresa parceira.",
          },
          { status: 400 }
        );
      }

      if (Number(cliente.partner_company_id) !== partnerCompanyIdParsed) {
        await marcarInvoiceErro(invoiceId, "Cliente não pertence à empresa informada.");
        return NextResponse.json(
          {
            success: false,
            message: "Cliente não pertence à empresa informada.",
          },
          { status: 400 }
        );
      }

      if (Number(invoice.partner_company_id) !== Number(cliente.partner_company_id)) {
        await marcarInvoiceErro(
          invoiceId,
          "Inconsistência entre nota e empresa do cliente."
        );

        return NextResponse.json(
          {
            success: false,
            message: "A nota não corresponde à empresa do cliente informado.",
          },
          { status: 400 }
        );
      }
    } else {
      if (!isClienteDiretoPeloBody) {
        await marcarInvoiceErro(
          invoiceId,
          "Cliente direto não pode emitir vinculado a empresa."
        );

        return NextResponse.json(
          {
            success: false,
            message: "Este cliente não pertence a uma empresa parceira.",
          },
          { status: 400 }
        );
      }

      if (invoice.partner_company_id !== null) {
        await marcarInvoiceErro(
          invoiceId,
          "Inconsistência entre nota e cliente direto."
        );

        return NextResponse.json(
          {
            success: false,
            message: "A nota não corresponde a um cliente direto.",
          },
          { status: 400 }
        );
      }
    }

    if (!cliente.is_active) {
      await marcarInvoiceErro(invoiceId, "Cliente inativo.");
      return NextResponse.json(
        {
          success: false,
          message: "Cliente inativo.",
        },
        { status: 400 }
      );
    }

    if (!onlyDigits(cliente.cnpj)) {
      await marcarInvoiceErro(invoiceId, "CNPJ do cliente não encontrado.");
      return NextResponse.json(
        {
          success: false,
          message: "CNPJ do cliente não encontrado.",
        },
        { status: 400 }
      );
    }

    if (!senhaEmissor) {
      await marcarInvoiceErro(invoiceId, "Senha do Emissor Nacional não cadastrada.");
      return NextResponse.json(
        {
          success: false,
          message: "Senha do Emissor Nacional não cadastrada.",
        },
        { status: 400 }
      );
    }

    if (clienteVinculadoEmpresa) {
      const { data: empresaAtual, error: empresaError } =
        await buscarEmpresaParceira(partnerCompanyIdEfetivo!);

      if (empresaError || !empresaAtual) {
        await marcarInvoiceErro(invoiceId, "Empresa não encontrada.");
        return NextResponse.json(
          {
            success: false,
            message: "Empresa não encontrada.",
          },
          { status: 404 }
        );
      }

      const empresa = empresaAtual;
      const paymentStatus = String(empresa.payment_status || "")
        .trim()
        .toLowerCase();

      const empresaExpirada = isExpiredDate(empresa.subscription_expires_at);

      if (empresaExpirada) {
        await bloquearEmpresaPorVencimento(empresa.id);
      }

      if (cliente.is_blocked) {
        await marcarInvoiceErro(invoiceId, "Cliente bloqueado.");
        return NextResponse.json(
          {
            success: false,
            message: "Seu acesso está bloqueado no momento.",
          },
          { status: 403 }
        );
      }

      if (empresa.is_blocked || empresaExpirada || paymentStatus !== "paid") {
        await marcarInvoiceErro(
          invoiceId,
          "Empresa bloqueada por falta de pagamento."
        );

        return NextResponse.json(
          {
            success: false,
            message: "A empresa responsável está com pagamento pendente.",
          },
          { status: 403 }
        );
      }
    } else {
      const clienteExpirado = isExpiredDate(cliente.subscription_expires_at);

      if (clienteExpirado) {
        await bloquearClientePorVencimento(cliente.id);
      }

      if (cliente.is_blocked || clienteExpirado) {
        await marcarInvoiceErro(invoiceId, "Cliente bloqueado por falta de pagamento.");
        return NextResponse.json(
          {
            success: false,
            message: "Seu acesso está bloqueado por falta de pagamento.",
          },
          { status: 403 }
        );
      }

      if (isSubscriptionBlocked(cliente.subscription_status) || clienteExpirado) {
        await marcarInvoiceErro(invoiceId, "Assinatura inativa ou expirada.");
        return NextResponse.json(
          {
            success: false,
            message: "Sua assinatura está inativa. Regularize seu plano para emitir.",
          },
          { status: 403 }
        );
      }

      const limite = getEffectiveNotesLimit(cliente.plan_type, cliente.notes_limit);

      if (limite > 0) {
        const { count: notasMes, error: notasError } =
          await contarNotasSuccessDoMes(cliente.id);

        if (notasError) {
          console.error("Erro ao contar notas do mês:", notasError);
        } else if (notasMes >= limite) {
          await marcarInvoiceErro(
            invoiceId,
            "Limite mensal de notas atingido para o plano atual."
          );

          return NextResponse.json(
            {
              success: false,
              message: "Você atingiu o limite mensal de notas do seu plano.",
            },
            { status: 403 }
          );
        }
      }
    }

    const { data: jobAtivo } = await buscarJobAtivo(invoiceId);

    if (jobAtivo) {
      await marcarInvoiceQueued(invoiceId);

      await dispararProcessamentoFilaEmBackground();

      return NextResponse.json(
        {
          success: true,
          message: "A emissão já está em andamento.",
          status: jobAtivo.status || "queued",
          jobId: jobAtivo.id,
          invoice: {
            id: invoiceId,
            status: jobAtivo.status || "queued",
            nfse_key: invoice.nfse_key || null,
            pdf_url: invoice.pdf_url || null,
            xml_url: invoice.xml_url || null,
            error_message: null,
          },
        },
        { status: 200 }
      );
    }

    await marcarInvoicePending(invoiceId);

    const jobPayload = {
      invoiceId,
      clientId: clientIdParsed,
      partnerCompanyId: isClienteDiretoPeloBody ? null : partnerCompanyIdParsed,
      competencyDate,
      tomadorDocumento,
      taxCode,
      serviceCity,
      serviceValue: serviceValueParsed,
      serviceDescription,
      cancelKey,
    };

    const { data: jobCriado, error: createJobError } = await criarJobEmissao({
      invoiceId,
      clientId: clientIdParsed,
      partnerCompanyId: isClienteDiretoPeloBody ? null : partnerCompanyIdParsed,
      payload: jobPayload,
    });

    if (createJobError || !jobCriado) {
      console.error("Erro ao criar job da emissão:", createJobError);

      await marcarInvoiceErro(invoiceId, "Não foi possível enfileirar a emissão.");

      return NextResponse.json(
        {
          success: false,
          message: "Não foi possível enfileirar a emissão.",
        },
        { status: 500 }
      );
    }

    await marcarInvoiceQueued(invoiceId);

    await logJob({
      jobId: jobCriado.id,
      invoiceId,
      level: "info",
      message: "Job de emissão criado com sucesso.",
      meta: {
        invoiceId,
        clientId: clientIdParsed,
        partnerCompanyId: isClienteDiretoPeloBody ? null : partnerCompanyIdParsed,
        competencyDate,
        tomadorDocumento,
        taxCode,
        serviceCity,
        serviceValue: serviceValueParsed,
      },
    });

    void dispararProcessamentoFilaEmBackground();

    return NextResponse.json(
      {
        success: true,
        message: "Emissão enfileirada com sucesso.",
        status: "queued",
        jobId: jobCriado.id,
        invoice: {
          id: invoiceId,
          status: "queued",
          nfse_key: invoice.nfse_key || null,
          pdf_url: invoice.pdf_url || null,
          xml_url: invoice.xml_url || null,
          error_message: null,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Erro em /api/emitir-nota:", error);

    if (invoiceId) {
      await marcarInvoiceErro(
        invoiceId,
        String(error?.message || "Erro inesperado ao enfileirar emissão.")
      ).catch(() => null);
    }

    return NextResponse.json(
      {
        success: false,
        message: String(error?.message || "Erro inesperado ao enfileirar emissão."),
      },
      { status: 500 }
    );
  }
}