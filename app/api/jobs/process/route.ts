import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { emitirNfseViaAutomacao } from "@/lib/nfseAutomation";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InvoiceJob = {
  id: number;
  invoice_id: number;
  partner_company_id: number | null;
  client_id: number;
  job_type: string;
  status: "queued" | "processing" | "success" | "error" | "canceled";
  attempts: number;
  max_attempts: number;
  locked_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  cancel_requested: boolean;
  cancel_requested_at: string | null;
  error_message: string | null;
  payload: any;
  result: any;
  created_at: string;
  updated_at: string;
};

type ClientRow = {
  id: number;
  cnpj: string | null;
  password: string | null;
  partner_company_id: number | null;
  is_active: boolean | null;
};

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

function getFileExtension(filePath: string, fallback: string) {
  const ext = path.extname(filePath || "").replace(".", "").toLowerCase();
  return ext || fallback;
}

async function uploadFileToStorage(params: {
  localPath: string | null | undefined;
  bucket: string;
  destinationPath: string;
  contentType: string;
}) {
  const { localPath, bucket, destinationPath, contentType } = params;

  if (!localPath) return null;

  const fileBuffer = await fs.readFile(localPath);

  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(destinationPath, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Erro ao enviar arquivo para o Storage: ${uploadError.message}`);
  }

  const { data: publicData } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(destinationPath);

  return publicData?.publicUrl || null;
}

async function safeUnlink(filePath?: string | null) {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch {
    // ignora limpeza local
  }
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

async function buscarProximoJob(): Promise<InvoiceJob | null> {
  const { data, error } = await supabaseAdmin
    .from("invoice_jobs")
    .select("*")
    .eq("status", "queued")
    .eq("job_type", "emit_nfse")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as InvoiceJob | null) || null;
}

async function travarJob(jobId: number) {
  const agora = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("invoice_jobs")
    .update({
      status: "processing",
      locked_at: agora,
      started_at: agora,
    })
    .eq("id", jobId)
    .eq("status", "queued")
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function incrementarTentativa(job: InvoiceJob) {
  const proximaTentativa = Number(job.attempts || 0) + 1;

  const { error } = await supabaseAdmin
    .from("invoice_jobs")
    .update({
      attempts: proximaTentativa,
    })
    .eq("id", job.id);

  if (error) {
    throw new Error(error.message);
  }

  return proximaTentativa;
}

async function finalizarJobSucesso(jobId: number, result: any) {
  const agora = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("invoice_jobs")
    .update({
      status: "success",
      finished_at: agora,
      locked_at: null,
      result,
      error_message: null,
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(error.message);
  }
}

async function finalizarJobErro(job: InvoiceJob, mensagem: string, result: any = null) {
  const agora = new Date().toISOString();
  const excedeu = Number(job.attempts || 0) >= Number(job.max_attempts || 3);
  const novoStatus = excedeu ? "error" : "queued";

  const { error } = await supabaseAdmin
    .from("invoice_jobs")
    .update({
      status: novoStatus,
      finished_at: excedeu ? agora : null,
      locked_at: null,
      error_message: mensagem,
      result,
    })
    .eq("id", job.id);

  if (error) {
    throw new Error(error.message);
  }
}

async function finalizarJobCancelado(jobId: number, mensagem = "Emissão cancelada pelo usuário.") {
  const agora = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("invoice_jobs")
    .update({
      status: "canceled",
      finished_at: agora,
      locked_at: null,
      error_message: mensagem,
      result: { canceled: true, message: mensagem },
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(error.message);
  }
}

async function atualizarInvoiceParaProcessando(invoiceId: number) {
  const { error } = await supabaseAdmin
    .from("invoices")
    .update({
      status: "processing",
      error_message: null,
    })
    .eq("id", invoiceId);

  if (error) {
    throw new Error(error.message);
  }
}

async function atualizarInvoiceParaSucesso(invoiceId: number, result: any) {
  const bucketName = "nfse-files";

  const nfseKeyFinal = result?.nfseKey || null;
  const pdfPathFinal: string | null = result?.pdfPath || null;
  const xmlPathFinal: string | null = result?.xmlPath || null;

  let pdfUrlFinal: string | null = null;
  let xmlUrlFinal: string | null = null;
  let storageWarning: string | null = null;

  try {
    if (pdfPathFinal) {
      const pdfExt = getFileExtension(pdfPathFinal, "pdf");

      pdfUrlFinal = await uploadFileToStorage({
        localPath: pdfPathFinal,
        bucket: bucketName,
        destinationPath: `invoices/${invoiceId}/danfse-${invoiceId}-${Date.now()}.${pdfExt}`,
        contentType: "application/pdf",
      });
    }

    if (xmlPathFinal) {
      const xmlExt = getFileExtension(xmlPathFinal, "xml");

      xmlUrlFinal = await uploadFileToStorage({
        localPath: xmlPathFinal,
        bucket: bucketName,
        destinationPath: `invoices/${invoiceId}/xml-${invoiceId}-${Date.now()}.${xmlExt}`,
        contentType: "application/xml",
      });
    }
  } catch (storageError: any) {
    console.error("Erro ao subir arquivos para o Storage:", storageError);
    storageWarning =
      storageError?.message || "Nota emitida, mas houve erro ao salvar PDF/XML no Storage.";
  } finally {
    await safeUnlink(pdfPathFinal);
    await safeUnlink(xmlPathFinal);
  }

  const { error } = await supabaseAdmin
    .from("invoices")
    .update({
      status: "success",
      error_message: storageWarning,
      nfse_key: nfseKeyFinal,
      pdf_url: pdfUrlFinal,
      xml_url: xmlUrlFinal,
      pdf_path: pdfPathFinal,
      xml_path: xmlPathFinal,
    })
    .eq("id", invoiceId);

  if (error) {
    throw new Error(error.message);
  }

  return {
    nfseKey: nfseKeyFinal,
    pdfUrl: pdfUrlFinal,
    xmlUrl: xmlUrlFinal,
    pdfPath: pdfPathFinal,
    xmlPath: xmlPathFinal,
    warning: storageWarning,
  };
}

async function atualizarInvoiceParaErro(invoiceId: number, mensagem: string) {
  const { error } = await supabaseAdmin
    .from("invoices")
    .update({
      status: "error",
      error_message: mensagem,
    })
    .eq("id", invoiceId);

  if (error) {
    throw new Error(error.message);
  }
}

async function atualizarInvoiceParaCancelada(
  invoiceId: number,
  mensagem = "Emissão cancelada pelo usuário."
) {
  const { error } = await supabaseAdmin
    .from("invoices")
    .update({
      status: "canceled",
      error_message: mensagem,
    })
    .eq("id", invoiceId);

  if (error) {
    throw new Error(error.message);
  }
}

async function buscarCliente(clientId: number): Promise<ClientRow> {
  const { data, error } = await supabaseAdmin
    .from("clients")
    .select("id, cnpj, password, partner_company_id, is_active")
    .eq("id", clientId)
    .single();

  if (error || !data) {
    throw new Error("Cliente do job não encontrado.");
  }

  return data as ClientRow;
}

async function processarJob(job: InvoiceJob) {
  await logJob({
    jobId: job.id,
    invoiceId: job.invoice_id,
    level: "info",
    message: "Iniciando processamento do job.",
    meta: { attempts: job.attempts, max_attempts: job.max_attempts },
  });

  const payload = job.payload || {};

  if (job.cancel_requested) {
    await logJob({
      jobId: job.id,
      invoiceId: job.invoice_id,
      level: "warning",
      message: "Job marcado como cancelado antes do processamento.",
    });

    await atualizarInvoiceParaCancelada(job.invoice_id);
    await finalizarJobCancelado(job.id);
    return {
      success: false,
      canceled: true,
      message: "Job cancelado antes do processamento.",
    };
  }

  const cliente = await buscarCliente(job.client_id);

  if (!cliente.is_active) {
    throw new Error("Cliente inativo.");
  }

  if (!cliente.cnpj || !cliente.password?.trim()) {
    throw new Error("Cliente sem dados fiscais completos para emissão.");
  }

  await atualizarInvoiceParaProcessando(job.invoice_id);

  await logJob({
    jobId: job.id,
    invoiceId: job.invoice_id,
    level: "info",
    message: "Chamando automação de emissão.",
    meta: {
      competencyDate: payload.competencyDate,
      tomadorDocumento: payload.tomadorDocumento,
      taxCode: payload.taxCode,
      serviceCity: payload.serviceCity,
      serviceValue: payload.serviceValue,
    },
  });

  const resultado = await emitirNfseViaAutomacao({
    cnpjEmpresa: cliente.cnpj,
    senhaEmpresa: cliente.password,
    competencyDate: payload.competencyDate,
    tomadorDocumento: payload.tomadorDocumento,
    taxCode: payload.taxCode,
    serviceCity: payload.serviceCity,
    serviceValue: payload.serviceValue,
    serviceDescription: payload.serviceDescription,
  } as any);

  if (!resultado.success) {
    const mensagem = resultado.message || "Falha na automação.";

    if (
      mensagem.includes("EMISSAO_CANCELADA_USUARIO") ||
      mensagem.includes("Emissão cancelada pelo usuário.")
    ) {
      throw new Error("EMISSAO_CANCELADA_USUARIO");
    }

    throw new Error(mensagem);
  }

  if (!resultado.nfseKey) {
    throw new Error("Nota emitida sem chave de acesso.");
  }

  const storageResult = await atualizarInvoiceParaSucesso(job.invoice_id, resultado);

  await logJob({
    jobId: job.id,
    invoiceId: job.invoice_id,
    level: storageResult.warning ? "warning" : "info",
    message: storageResult.warning
      ? "Job processado com sucesso, mas com aviso no storage."
      : "Job processado com sucesso.",
    meta: {
      nfseKey: storageResult.nfseKey,
      pdfUrl: storageResult.pdfUrl,
      xmlUrl: storageResult.xmlUrl,
      pdfPath: storageResult.pdfPath,
      xmlPath: storageResult.xmlPath,
      warning: storageResult.warning,
    },
  });

  await finalizarJobSucesso(job.id, {
    success: true,
    ...storageResult,
  });

  return {
    success: true,
    jobId: job.id,
    invoiceId: job.invoice_id,
    result: {
      success: true,
      ...storageResult,
    },
  };
}

export async function POST(_request: NextRequest) {
  try {
    const job = await buscarProximoJob();

    if (!job) {
      return NextResponse.json({
        success: true,
        processed: false,
        message: "Nenhum job pendente na fila.",
      });
    }

    const travado = await travarJob(job.id);

    if (!travado) {
      return NextResponse.json({
        success: true,
        processed: false,
        message: "Job já foi capturado por outro processo.",
      });
    }

    const jobAtualizado: InvoiceJob = {
      ...job,
      status: "processing",
      locked_at: new Date().toISOString(),
      started_at: job.started_at || new Date().toISOString(),
    };

    const attemptsAtual = await incrementarTentativa(jobAtualizado);

    const jobComTentativa: InvoiceJob = {
      ...jobAtualizado,
      attempts: attemptsAtual,
    };

    try {
      const resultado = await processarJob(jobComTentativa);

      return NextResponse.json({
        ...resultado,
        processed: true,
      });
    } catch (error: any) {
      const mensagemErro = String(error?.message || "Erro ao processar job.");

      await logJob({
        jobId: jobComTentativa.id,
        invoiceId: jobComTentativa.invoice_id,
        level: "error",
        message: "Erro ao processar job.",
        meta: {
          error: mensagemErro,
          attempt: jobComTentativa.attempts,
        },
      });

      if (
        mensagemErro.includes("EMISSAO_CANCELADA_USUARIO") ||
        mensagemErro.includes("cancelada pelo usuário")
      ) {
        await atualizarInvoiceParaCancelada(
          jobComTentativa.invoice_id,
          "Emissão cancelada pelo usuário."
        );

        await finalizarJobCancelado(
          jobComTentativa.id,
          "Emissão cancelada pelo usuário."
        );

        return NextResponse.json({
          success: false,
          processed: true,
          canceled: true,
          message: "Emissão cancelada pelo usuário.",
        });
      }

      const excedeu =
        Number(jobComTentativa.attempts || 0) >=
        Number(jobComTentativa.max_attempts || 3);

      if (excedeu) {
        await atualizarInvoiceParaErro(jobComTentativa.invoice_id, mensagemErro);
      }

      await finalizarJobErro(jobComTentativa, mensagemErro, {
        lastError: mensagemErro,
        attempt: jobComTentativa.attempts,
      });

      return NextResponse.json({
        success: false,
        processed: true,
        willRetry: !excedeu,
        message: mensagemErro,
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        processed: false,
        message: String(error?.message || "Erro geral ao processar fila."),
      },
      { status: 500 }
    );
  }
}