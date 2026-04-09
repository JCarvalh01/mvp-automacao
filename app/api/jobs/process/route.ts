import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  emissor_password?: string | null;
  partner_company_id: number | null;
  is_active: boolean | null;
};

type WorkerResult = {
  success: boolean;
  message?: string | null;
  nfseKey?: string | null;
  pdfUrl?: string | null;
  xmlUrl?: string | null;
  pdfBase64?: string | null;
  xmlBase64?: string | null;
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

const STALE_JOB_MINUTES = 8;
const WORKER_TIMEOUT_MS = 1000 * 60 * 6;
const STORAGE_BUCKET = "nfse-files";
const NFSE_PORTAL_BASE_URL = "https://www.nfse.gov.br";

function getSenhaEmissor(cliente: ClientRow) {
  return String(cliente.emissor_password || cliente.password || "").trim();
}

function getStaleJobIsoDate() {
  return new Date(Date.now() - STALE_JOB_MINUTES * 60 * 1000).toISOString();
}

function normalizarUrlArquivo(valor: string | null | undefined) {
  const url = String(valor || "").trim();
  if (!url) return null;

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${NFSE_PORTAL_BASE_URL}${url}`;
  }

  return null;
}

async function uploadBase64ToStorage(params: {
  base64: string | null | undefined;
  bucket: string;
  destinationPath: string;
  contentType: string;
}) {
  const { base64, bucket, destinationPath, contentType } = params;

  if (!base64) return null;

  const fileBuffer = Buffer.from(base64, "base64");

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

async function atualizarInvoiceParaPending(invoiceId: number, mensagem?: string | null) {
  const { error } = await supabaseAdmin
    .from("invoices")
    .update({
      status: "pending",
      error_message: mensagem || null,
    })
    .eq("id", invoiceId);

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

async function atualizarInvoiceParaSucesso(invoiceId: number, result: WorkerResult) {
  const nfseKeyFinal = result?.nfseKey || null;

  const pdfUrlRecebida = String(result?.pdfUrl || "").trim();
  const xmlUrlRecebida = String(result?.xmlUrl || "").trim();

  let pdfUrlFinal: string | null = null;
  let xmlUrlFinal: string | null = null;
  let storageWarning: string | null = null;

  console.log("ATUALIZAR INVOICE PARA SUCESSO:", {
    invoiceId,
    nfseKeyFinal,
    hasPdfBase64: Boolean(result?.pdfBase64),
    hasXmlBase64: Boolean(result?.xmlBase64),
    pdfUrlRecebida,
    xmlUrlRecebida,
  });

  try {
    if (result?.pdfBase64) {
      pdfUrlFinal = await uploadBase64ToStorage({
        base64: result.pdfBase64,
        bucket: STORAGE_BUCKET,
        destinationPath: `invoices/${invoiceId}/danfse-${nfseKeyFinal || invoiceId}.pdf`,
        contentType: "application/pdf",
      });
    }

    if (result?.xmlBase64) {
      xmlUrlFinal = await uploadBase64ToStorage({
        base64: result.xmlBase64,
        bucket: STORAGE_BUCKET,
        destinationPath: `invoices/${invoiceId}/xml-${nfseKeyFinal || invoiceId}.xml`,
        contentType: "application/xml",
      });
    }

    if (!pdfUrlFinal) {
      pdfUrlFinal = normalizarUrlArquivo(pdfUrlRecebida);
    }

    if (!xmlUrlFinal) {
      xmlUrlFinal = normalizarUrlArquivo(xmlUrlRecebida);
    }

    if (!pdfUrlFinal || !xmlUrlFinal) {
      storageWarning =
        "Nota emitida, mas PDF/XML não foram salvos no Storage. URLs do worker vieram vazias ou incompletas.";
    }
  } catch (storageError: any) {
    console.error("Erro ao subir arquivos para o Storage:", storageError);

    pdfUrlFinal = pdfUrlFinal || normalizarUrlArquivo(pdfUrlRecebida);
    xmlUrlFinal = xmlUrlFinal || normalizarUrlArquivo(xmlUrlRecebida);

    storageWarning =
      storageError?.message ||
      "Nota emitida, mas houve erro ao salvar PDF/XML no Storage.";
  }

  const { error } = await supabaseAdmin
    .from("invoices")
    .update({
      status: "success",
      error_message: storageWarning,
      nfse_key: nfseKeyFinal,
      pdf_url: pdfUrlFinal,
      xml_url: xmlUrlFinal,
      pdf_path: null,
      xml_path: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  if (error) {
    throw new Error(error.message);
  }

  return {
    nfseKey: nfseKeyFinal,
    pdfUrl: pdfUrlFinal,
    xmlUrl: xmlUrlFinal,
    warning: storageWarning,
  };
}

async function liberarJobsTravados() {
  const staleIso = getStaleJobIsoDate();

  const { data: jobsTravados, error } = await supabaseAdmin
    .from("invoice_jobs")
    .select("*")
    .eq("status", "processing")
    .eq("job_type", "emit_nfse")
    .lt("locked_at", staleIso);

  if (error) {
    throw new Error(`Erro ao buscar jobs travados: ${error.message}`);
  }

  const lista = (jobsTravados as InvoiceJob[] | null) || [];

  for (const job of lista) {
    const excedeu = Number(job.attempts || 0) >= Number(job.max_attempts || 3);

    if (excedeu) {
      await supabaseAdmin
        .from("invoice_jobs")
        .update({
          status: "error",
          finished_at: new Date().toISOString(),
          locked_at: null,
          error_message:
            "Job travado em processamento por tempo excedido. Limite de tentativas atingido.",
          result: {
            lastError:
              "Job travado em processamento por tempo excedido. Limite de tentativas atingido.",
            staleRecovery: true,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      await atualizarInvoiceParaErro(
        job.invoice_id,
        "A emissão falhou após ficar travada em processamento."
      );

      await logJob({
        jobId: job.id,
        invoiceId: job.invoice_id,
        level: "error",
        message: "Job travado finalizado como erro por exceder tentativas.",
        meta: {
          attempts: job.attempts,
          max_attempts: job.max_attempts,
          locked_at: job.locked_at,
        },
      });

      continue;
    }

    await supabaseAdmin
      .from("invoice_jobs")
      .update({
        status: "queued",
        locked_at: null,
        started_at: null,
        error_message: "Job recuperado automaticamente após travar em processing.",
        result: {
          staleRecovery: true,
          message: "Job recuperado automaticamente após travar em processing.",
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    await atualizarInvoiceParaPending(
      job.invoice_id,
      "Job recuperado automaticamente após travar em processamento."
    );

    await logJob({
      jobId: job.id,
      invoiceId: job.invoice_id,
      level: "warning",
      message: "Job travado recuperado automaticamente para a fila.",
      meta: {
        attempts: job.attempts,
        max_attempts: job.max_attempts,
        locked_at: job.locked_at,
      },
    });
  }

  return lista.length;
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
      updated_at: agora,
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
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  if (error) {
    throw new Error(error.message);
  }

  return proximaTentativa;
}

async function finalizarJobSucesso(jobId: number, result: any) {
  const agora = new Date().toISOString();

  const resultPayload = result?.result ?? result ?? null;
  const errorMessageFinal =
    resultPayload?.warning ||
    (resultPayload?.pdfUrl && resultPayload?.xmlUrl ? null : "Arquivos PDF/XML pendentes ou indisponíveis.");

  const { error } = await supabaseAdmin
    .from("invoice_jobs")
    .update({
      status: "success",
      finished_at: agora,
      locked_at: null,
      result: resultPayload,
      error_message: errorMessageFinal,
      updated_at: agora,
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
      updated_at: agora,
    })
    .eq("id", job.id);

  if (error) {
    throw new Error(error.message);
  }
}

async function finalizarJobCancelado(
  jobId: number,
  mensagem = "Emissão cancelada pelo usuário."
) {
  const agora = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("invoice_jobs")
    .update({
      status: "canceled",
      finished_at: agora,
      locked_at: null,
      error_message: mensagem,
      result: { canceled: true, message: mensagem },
      updated_at: agora,
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(error.message);
  }
}

async function buscarCliente(clientId: number): Promise<ClientRow> {
  const { data, error } = await supabaseAdmin
    .from("clients")
    .select("id, cnpj, password, emissor_password, partner_company_id, is_active")
    .eq("id", clientId)
    .single();

  if (error || !data) {
    throw new Error("Cliente do job não encontrado.");
  }

  return data as ClientRow;
}

async function chamarWorkerEmissao(job: InvoiceJob, cliente: ClientRow) {
  const WORKER_URL = String(process.env.NFSE_WORKER_URL || "").trim();

  if (!WORKER_URL) {
    throw new Error("NFSE_WORKER_URL não configurado.");
  }

  const payload = job.payload || {};
  const senhaEmissor = getSenhaEmissor(cliente);

  if (!cliente.cnpj || !senhaEmissor) {
    throw new Error("Cliente sem dados fiscais completos para emissão.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, WORKER_TIMEOUT_MS);

  try {
    const response = await fetch(`${WORKER_URL}/emitir`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "bypass-tunnel-reminder": "1",
        "User-Agent": "mvp-automacao-worker-client",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        cnpjEmpresa: cliente.cnpj,
        senhaEmpresa: senhaEmissor,
        competencyDate: payload.competencyDate,
        tomadorDocumento: payload.tomadorDocumento,
        taxCode: payload.taxCode,
        serviceCity: payload.serviceCity,
        serviceValue: payload.serviceValue,
        serviceDescription: payload.serviceDescription,
        cancelKey: payload.cancelKey || String(job.invoice_id),
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    const resultado = (await response.json().catch(() => null)) as WorkerResult | null;

    console.log("RESULTADO WORKER:", {
      success: resultado?.success,
      message: resultado?.message,
      nfseKey: resultado?.nfseKey,
      hasPdfBase64: Boolean(resultado?.pdfBase64),
      hasXmlBase64: Boolean(resultado?.xmlBase64),
      pdfUrl: resultado?.pdfUrl || null,
      xmlUrl: resultado?.xmlUrl || null,
    });

    if (!response.ok) {
      throw new Error(resultado?.message || "Erro ao chamar worker.");
    }

    return resultado;
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("Tempo limite excedido ao aguardar o worker de emissão.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
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
  const senhaEmissor = getSenhaEmissor(cliente);

  if (!cliente.is_active) {
    throw new Error("Cliente inativo.");
  }

  if (!cliente.cnpj || !senhaEmissor) {
    throw new Error("Cliente sem dados fiscais completos para emissão.");
  }

  await atualizarInvoiceParaProcessando(job.invoice_id);

  await logJob({
    jobId: job.id,
    invoiceId: job.invoice_id,
    level: "info",
    message: "Chamando worker externo de emissão.",
    meta: {
      competencyDate: payload.competencyDate,
      tomadorDocumento: payload.tomadorDocumento,
      taxCode: payload.taxCode,
      serviceCity: payload.serviceCity,
      serviceValue: payload.serviceValue,
      workerUrl: process.env.NFSE_WORKER_URL || null,
    },
  });

  const resultado = await chamarWorkerEmissao(job, cliente);

  if (!resultado?.success) {
    const mensagem = resultado?.message || "Falha na automação.";

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
      warning: storageResult.warning,
    },
  });

  await finalizarJobSucesso(job.id, {
    success: true,
    jobId: job.id,
    invoiceId: job.invoice_id,
    result: {
      success: true,
      ...storageResult,
    },
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
    const recuperados = await liberarJobsTravados();

    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    let canceledCount = 0;
    const resultados: any[] = [];

    while (true) {
      const job = await buscarProximoJob();

      if (!job) {
        break;
      }

      const travado = await travarJob(job.id);

      if (!travado) {
        continue;
      }

      const agora = new Date().toISOString();

      const jobAtualizado: InvoiceJob = {
        ...job,
        status: "processing",
        locked_at: agora,
        started_at: job.started_at || agora,
      };

      const attemptsAtual = await incrementarTentativa(jobAtualizado);

      const jobComTentativa: InvoiceJob = {
        ...jobAtualizado,
        attempts: attemptsAtual,
      };

      try {
        const resultado = await processarJob(jobComTentativa);

        processedCount += 1;

        if (resultado?.canceled) {
          canceledCount += 1;
        } else if (resultado?.success) {
          successCount += 1;
        }

        resultados.push({
          jobId: jobComTentativa.id,
          invoiceId: jobComTentativa.invoice_id,
          success: Boolean(resultado?.success),
          canceled: Boolean(resultado?.canceled),
          message: resultado?.message || null,
          result: resultado?.result || null,
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

          processedCount += 1;
          canceledCount += 1;

          resultados.push({
            jobId: jobComTentativa.id,
            invoiceId: jobComTentativa.invoice_id,
            success: false,
            canceled: true,
            message: "Emissão cancelada pelo usuário.",
          });

          continue;
        }

        const excedeu =
          Number(jobComTentativa.attempts || 0) >=
          Number(jobComTentativa.max_attempts || 3);

        if (excedeu) {
          await atualizarInvoiceParaErro(jobComTentativa.invoice_id, mensagemErro);
        } else {
          await atualizarInvoiceParaPending(
            jobComTentativa.invoice_id,
            "Tentando novamente a emissão após falha temporária."
          );
        }

        await finalizarJobErro(jobComTentativa, mensagemErro, {
          lastError: mensagemErro,
          attempt: jobComTentativa.attempts,
        });

        processedCount += 1;
        errorCount += 1;

        resultados.push({
          jobId: jobComTentativa.id,
          invoiceId: jobComTentativa.invoice_id,
          success: false,
          canceled: false,
          willRetry: !excedeu,
          message: mensagemErro,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount > 0,
      processedCount,
      successCount,
      errorCount,
      canceledCount,
      recovered_stale_jobs: recuperados,
      resultados,
      message:
        processedCount > 0
          ? "Fila processada completamente."
          : "Nenhum job pendente na fila.",
    });
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