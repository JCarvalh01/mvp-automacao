import fs from "fs/promises";
import { emitirNfseViaAutomacao } from "@/lib/nfseAutomation";
import { uploadArquivoParaStorage, supabaseAdmin } from "@/lib/storage";

type EmitirNotaServiceInput = {
  invoiceId: number;
  partnerCompanyId: number;
  clientId: number;
  cnpjEmpresa: string;
  senhaEmpresa: string;
  competencyDate: string;
  tomadorDocumento: string;
  taxCode: string;
  serviceCity: string;
  serviceValue: number;
  serviceDescription: string;
};

function limparDocumento(valor: string) {
  return String(valor || "").replace(/\D/g, "");
}

function montarNomeBaseArquivo(input: {
  partnerCompanyId: number;
  clientId: number;
  invoiceId: number;
}) {
  return `${input.partnerCompanyId}/${input.clientId}/${input.invoiceId}`;
}

export async function emitirNotaCompleta(input: EmitirNotaServiceInput) {
  const nomeBase = montarNomeBaseArquivo({
    partnerCompanyId: input.partnerCompanyId,
    clientId: input.clientId,
    invoiceId: input.invoiceId,
  });

  let pdfPathLocal: string | null = null;
  let xmlPathLocal: string | null = null;

  try {
    await supabaseAdmin
      .from("invoices")
      .update({
        status: "processing",
        error_message: null,
      })
      .eq("id", input.invoiceId);

    const result = await emitirNfseViaAutomacao({
      cnpjEmpresa: limparDocumento(input.cnpjEmpresa),
      senhaEmpresa: input.senhaEmpresa,
      competencyDate: input.competencyDate,
      tomadorDocumento: limparDocumento(input.tomadorDocumento),
      taxCode: input.taxCode,
      serviceCity: input.serviceCity,
      serviceValue: Number(input.serviceValue),
      serviceDescription: input.serviceDescription,
    });

    pdfPathLocal = result.pdfPath || null;
    xmlPathLocal = result.xmlPath || null;

    if (!result.success) {
      await supabaseAdmin
        .from("invoices")
        .update({
          status: "error",
          error_message: result.message || "Erro na automação",
        })
        .eq("id", input.invoiceId);

      return {
        success: false,
        message: result.message || "Erro na automação",
        nfseKey: null,
        pdfUrl: null,
        xmlUrl: null,
      };
    }

    let pdfUrl: string | null = result.pdfUrl || null;
    let xmlUrl: string | null = result.xmlUrl || null;
    let pdfPathStorage: string | null = null;
    let xmlPathStorage: string | null = null;

    if (pdfPathLocal) {
      const uploadPdf = await uploadArquivoParaStorage({
        bucket: "notas-fiscais",
        filePathLocal: pdfPathLocal,
        filePathStorage: `${nomeBase}.pdf`,
        contentType: "application/pdf",
      });

      pdfUrl = uploadPdf.publicUrl;
      pdfPathStorage = uploadPdf.storagePath;
    }

    if (xmlPathLocal) {
      const uploadXml = await uploadArquivoParaStorage({
        bucket: "notas-fiscais",
        filePathLocal: xmlPathLocal,
        filePathStorage: `${nomeBase}.xml`,
        contentType: "application/xml",
      });

      xmlUrl = uploadXml.publicUrl;
      xmlPathStorage = uploadXml.storagePath;
    }

    await supabaseAdmin
      .from("invoices")
      .update({
        status: "success",
        error_message: null,
        nfse_key: result.nfseKey || null,
        pdf_url: pdfUrl,
        xml_url: xmlUrl,
        pdf_path: pdfPathStorage,
        xml_path: xmlPathStorage,
      })
      .eq("id", input.invoiceId);

    return {
      success: true,
      message: result.message || "Nota emitida com sucesso",
      nfseKey: result.nfseKey || null,
      pdfUrl,
      xmlUrl,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro interno ao emitir nota";

    await supabaseAdmin
      .from("invoices")
      .update({
        status: "error",
        error_message: message,
      })
      .eq("id", input.invoiceId);

    return {
      success: false,
      message,
      nfseKey: null,
      pdfUrl: null,
      xmlUrl: null,
    };
  } finally {
    if (pdfPathLocal) {
      await fs.unlink(pdfPathLocal).catch(() => null);
    }

    if (xmlPathLocal) {
      await fs.unlink(xmlPathLocal).catch(() => null);
    }
  }
}