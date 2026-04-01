"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabaseClient";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import ProtectedPageLoader from "@/components/ProtectedPageLoader";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { getPartnerCompanySession } from "@/lib/session";
import EmpresaPageShell from "@/components/EmpresaPageShell";

type Empresa = {
  id: number;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  user_id: number;
};

type Cliente = {
  id: number;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  password?: string | null;
  is_active: boolean;
};

type LinhaPlanilha = {
  client_id: number | string;
  cnpj_emissor: string;
  competency_date: string;
  tomador_documento: string;
  tax_code: string;
  service_city: string;
  service_value: number | string;
  service_description: string;
};

type LinhaValidada = {
  linhaNumero: number;
  client_id: number;
  cnpj_emissor: string;
  competency_date: string;
  tomador_documento: string;
  tax_code: string;
  service_city: string;
  service_value: number;
  service_description: string;
  erros: string[];
  status?: "pending" | "processing" | "success" | "error" | "canceled";
  mensagemStatus?: string;
  pdfBlob?: Blob | null;
  xmlBlob?: Blob | null;
  pdf_url?: string | null;
  xml_url?: string | null;
  nfse_key?: string | null;
  invoice_id?: number;
};

type ApiEmitirResponse = {
  success: boolean;
  message?: string;
  error?: string;
  canceled?: boolean;
  status?: string | null;
  nfseKey?: string | null;
  pdfUrl?: string | null;
  xmlUrl?: string | null;
  invoice?: {
    id?: number;
    nfse_key?: string | null;
    pdf_url?: string | null;
    xml_url?: string | null;
    status?: string | null;
    error_message?: string | null;
  };
};

function limparDocumento(valor: unknown) {
  return String(valor ?? "").replace(/\D/g, "");
}

function formatarDocumento(valor: string | null | undefined) {
  const digits = limparDocumento(valor);

  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2")
      .slice(0, 14);
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18);
}

function formatarValor(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function sanitizeFileName(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .trim()
    .replace(/^_+|_+$/g, "");
}

function formatarCompetenciaParaArquivo(valor: string) {
  return String(valor || "").trim().replace(/\//g, "-");
}

function getStatusConfig(status?: LinhaValidada["status"]) {
  switch (status) {
    case "success":
      return {
        label: "Emitida",
        bg: "#dcfce7",
        border: "#86efac",
        color: "#166534",
      };
    case "processing":
      return {
        label: "Processando",
        bg: "#dbeafe",
        border: "#93c5fd",
        color: "#1d4ed8",
      };
    case "error":
      return {
        label: "Erro",
        bg: "#fee2e2",
        border: "#fca5a5",
        color: "#991b1b",
      };
    case "canceled":
      return {
        label: "Cancelada",
        bg: "#e5e7eb",
        border: "#cbd5e1",
        color: "#334155",
      };
    case "pending":
    default:
      return {
        label: "Pendente",
        bg: "#fef3c7",
        border: "#fcd34d",
        color: "#92400e",
      };
  }
}

function getTodayLocalDate() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export default function EmitirMassaPage() {
  const { loading: loadingAccess, authorized } = useProtectedRoute(["partner_company"]);

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [linhas, setLinhas] = useState<LinhaValidada[]>([]);
  const [arquivo, setArquivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingInicial, setLoadingInicial] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [progresso, setProgresso] = useState(0);

  const canceladoRef = useRef(false);

  useEffect(() => {
    if (!loadingAccess && authorized) {
      carregarDadosIniciais();
    }
  }, [loadingAccess, authorized]);

  async function carregarDadosIniciais() {
    try {
      setLoadingInicial(true);
      setMensagem("");
      setErro("");

      const empresaSessao = getPartnerCompanySession();

      if (!empresaSessao?.id) {
        setErro("Empresa não encontrada na sessão.");
        setLoadingInicial(false);
        return;
      }

      const { data: empresaData, error: empresaError } = await supabase
        .from("partner_companies")
        .select("*")
        .eq("id", empresaSessao.id)
        .single();

      if (empresaError || !empresaData) {
        setErro("Nenhuma empresa parceira encontrada.");
        setLoadingInicial(false);
        return;
      }

      setEmpresa(empresaData as Empresa);

      const { data: clientesData, error: clientesError } = await supabase
        .from("clients")
        .select("*")
        .eq("partner_company_id", empresaData.id)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (clientesError) {
        setErro("Erro ao carregar clientes da empresa.");
        setLoadingInicial(false);
        return;
      }

      setClientes((clientesData || []) as Cliente[]);
      setLoadingInicial(false);
    } catch (e) {
      console.error(e);
      setErro("Erro inesperado ao carregar a página.");
      setLoadingInicial(false);
    }
  }

  function limparMensagens() {
    setMensagem("");
    setErro("");
  }

  function normalizarTexto(valor: unknown) {
    return String(valor ?? "").trim();
  }

  function normalizarNumero(valor: unknown) {
    if (typeof valor === "number") return valor;

    const texto = String(valor ?? "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim();

    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : NaN;
  }

  function normalizarInteiro(valor: unknown) {
    const numero = Number(String(valor ?? "").trim());
    return Number.isInteger(numero) ? numero : NaN;
  }

  function excelDateToISO(value: number) {
    const utcDays = Math.floor(value - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    const month = `${dateInfo.getUTCMonth() + 1}`.padStart(2, "0");
    const day = `${dateInfo.getUTCDate()}`.padStart(2, "0");
    return `${dateInfo.getUTCFullYear()}-${month}-${day}`;
  }

  function normalizarData(valor: unknown) {
    if (typeof valor === "number") {
      return excelDateToISO(valor);
    }

    const texto = String(valor ?? "").trim();

    if (!texto) return "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      return texto;
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
      const [dia, mes, ano] = texto.split("/");
      return `${ano}-${mes}-${dia}`;
    }

    return texto;
  }

  function buscarClientePorId(clientId: number) {
    return clientes.find((cliente) => cliente.id === clientId) || null;
  }

  function buscarClientePorIdECnpj(clientId: number, cnpjEmissor: string) {
    const cnpjLimpo = limparDocumento(cnpjEmissor);

    return (
      clientes.find(
        (cliente) =>
          cliente.id === clientId && limparDocumento(cliente.cnpj) === cnpjLimpo
      ) || null
    );
  }

  function atualizarLinha(index: number, patch: Partial<LinhaValidada>) {
    setLinhas((prev) => {
      const novas = [...prev];
      novas[index] = {
        ...novas[index],
        ...patch,
      };
      return novas;
    });
  }

  async function baixarArquivoComoBlob(url: string) {
    const resposta = await fetch(url);
    if (!resposta.ok) {
      throw new Error(`Falha ao baixar arquivo: ${resposta.status}`);
    }
    return await resposta.blob();
  }

  async function hidratarArquivosDaLinha(index: number, linha: LinhaValidada) {
    let pdfBlob: Blob | null = linha.pdfBlob || null;
    let xmlBlob: Blob | null = linha.xmlBlob || null;

    if (linha.pdf_url && !pdfBlob) {
      try {
        pdfBlob = await baixarArquivoComoBlob(linha.pdf_url);
      } catch (e) {
        console.error("Erro ao baixar PDF da linha:", e);
      }
    }

    if (linha.xml_url && !xmlBlob) {
      try {
        xmlBlob = await baixarArquivoComoBlob(linha.xml_url);
      } catch (e) {
        console.error("Erro ao baixar XML da linha:", e);
      }
    }

    if (pdfBlob !== linha.pdfBlob || xmlBlob !== linha.xmlBlob) {
      atualizarLinha(index, {
        pdfBlob,
        xmlBlob,
      });
    }
  }

  async function acompanharInvoice(index: number, invoiceId: number) {
    const maxTentativas = 120;

    for (let tentativa = 0; tentativa < maxTentativas; tentativa++) {
      if (canceladoRef.current) {
        await solicitarCancelamentoBackend(invoiceId);
      }

      const { data, error } = await supabase
        .from("invoices")
        .select("id, status, error_message, pdf_url, xml_url, nfse_key")
        .eq("id", invoiceId)
        .single();

      if (!error && data) {
        const statusAtual = String(data.status || "").toLowerCase();

        if (statusAtual === "success") {
          atualizarLinha(index, {
            status: "success",
            mensagemStatus: "Emitida com sucesso.",
            pdf_url: data.pdf_url || null,
            xml_url: data.xml_url || null,
            nfse_key: data.nfse_key || null,
            invoice_id: data.id,
          });

          await hidratarArquivosDaLinha(index, {
            ...linhas[index],
            status: "success",
            mensagemStatus: "Emitida com sucesso.",
            pdf_url: data.pdf_url || null,
            xml_url: data.xml_url || null,
            nfse_key: data.nfse_key || null,
            invoice_id: data.id,
          });

          return "success" as const;
        }

        if (statusAtual === "error" || statusAtual === "erro") {
          atualizarLinha(index, {
            status: "error",
            mensagemStatus: data.error_message || "Erro ao emitir nota.",
            pdf_url: data.pdf_url || null,
            xml_url: data.xml_url || null,
            nfse_key: data.nfse_key || null,
            invoice_id: data.id,
          });
          return "error" as const;
        }

        if (statusAtual === "canceled" || statusAtual === "cancelada") {
          atualizarLinha(index, {
            status: "canceled",
            mensagemStatus: "Emissão cancelada pelo usuário.",
            invoice_id: data.id,
          });
          return "canceled" as const;
        }

        atualizarLinha(index, {
          status: "processing",
          mensagemStatus: "Nota em emissão. Aguarde a conclusão.",
          pdf_url: data.pdf_url || null,
          xml_url: data.xml_url || null,
          nfse_key: data.nfse_key || null,
          invoice_id: data.id,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    atualizarLinha(index, {
      status: "processing",
      mensagemStatus: "A emissão ainda está em processamento. Aguarde mais um pouco.",
      invoice_id: invoiceId,
    });

    return "processing" as const;
  }

  function validarLinha(linha: LinhaPlanilha, index: number): LinhaValidada {
    const client_id = normalizarInteiro(linha.client_id);
    const cnpj_emissor = limparDocumento(linha.cnpj_emissor);
    const competency_date = normalizarData(linha.competency_date);
    const tomador_documento = limparDocumento(linha.tomador_documento);
    const tax_code = normalizarTexto(linha.tax_code);
    const service_city = normalizarTexto(linha.service_city);
    const service_value = normalizarNumero(linha.service_value);
    const service_description = normalizarTexto(linha.service_description);

    const erros: string[] = [];

    if (!Number.isInteger(client_id)) {
      erros.push("client_id inválido.");
    }

    if (!cnpj_emissor) {
      erros.push("CNPJ do emissor não informado.");
    }

    if (Number.isInteger(client_id) && cnpj_emissor) {
      const cliente = buscarClientePorIdECnpj(client_id, cnpj_emissor);

      if (!cliente) {
        erros.push("client_id e cnpj_emissor não correspondem ao mesmo cliente da empresa.");
      } else if (!cliente.password?.trim()) {
        erros.push("Cliente emissor sem senha do Emissor Nacional.");
      }
    } else if (Number.isInteger(client_id) && !buscarClientePorId(client_id)) {
      erros.push("client_id não pertence à empresa logada.");
    }

    if (!competency_date) {
      erros.push("Data de competência não informada.");
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(competency_date)) {
      erros.push("Data inválida. Use YYYY-MM-DD ou DD/MM/YYYY.");
    }

    if (!tomador_documento) erros.push("Documento do tomador não informado.");
    if (!tax_code) erros.push("Código de tributação não informado.");
    if (!service_city) erros.push("Local da prestação não informado.");

    if (!Number.isFinite(service_value) || service_value <= 0) {
      erros.push("Valor da prestação inválido.");
    }

    if (!service_description) {
      erros.push("Descrição do serviço não informada.");
    }

    return {
      linhaNumero: index + 2,
      client_id: Number.isInteger(client_id) ? client_id : 0,
      cnpj_emissor,
      competency_date,
      tomador_documento,
      tax_code,
      service_city,
      service_value: Number.isFinite(service_value) ? service_value : 0,
      service_description,
      erros,
      status: "pending",
      mensagemStatus: "",
      pdfBlob: null,
      xmlBlob: null,
      pdf_url: null,
      xml_url: null,
      nfse_key: null,
      invoice_id: undefined,
    };
  }

  async function lerPlanilha(e: React.ChangeEvent<HTMLInputElement>) {
    limparMensagens();

    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setArquivo(file.name);

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const primeiraAba = workbook.Sheets[workbook.SheetNames[0]];

      const json = XLSX.utils.sheet_to_json<LinhaPlanilha>(primeiraAba, {
        defval: "",
      });

      if (!json.length) {
        setLinhas([]);
        setErro("A planilha está vazia.");
        return;
      }

      const validadas = json.map((linha, index) => validarLinha(linha, index));
      setLinhas(validadas);
      setProgresso(0);
      canceladoRef.current = false;

      const totalErros = validadas.filter((linha) => linha.erros.length > 0).length;

      if (totalErros > 0) {
        setErro(`A planilha possui ${totalErros} linha(s) com erro. Corrija antes de emitir.`);
      } else {
        setMensagem("Planilha carregada e validada com sucesso.");
      }
    } catch (err) {
      console.error(err);
      setErro("Erro ao ler a planilha.");
      setLinhas([]);
      setArquivo("");
    }
  }

  function limparPlanilha() {
    canceladoRef.current = false;
    setLinhas([]);
    setArquivo("");
    setMensagem("");
    setErro("");
    setProgresso(0);
  }

  async function solicitarCancelamentoBackend(invoiceId?: number) {
    if (!invoiceId) return;

    try {
      await fetch("/api/cancelar-emissao", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cancelKey: String(invoiceId),
        }),
      });
    } catch (error) {
      console.error("Erro ao solicitar cancelamento no backend:", error);
    }
  }

  async function pararEmissao() {
    canceladoRef.current = true;
    setMensagem("Solicitação de cancelamento enviada. Aguarde a atualização das linhas.");
    setErro("");

    const linhasProcessando = linhas.filter((linha) => linha.status === "processing");

    await Promise.all(
      linhasProcessando.map((linha) => solicitarCancelamentoBackend(linha.invoice_id))
    );
  }

  async function baixarModeloPlanilha() {
    const clienteBase = clientes[0];

    const dados = [
      {
        client_id: clienteBase?.id || 1,
        cnpj_emissor: clienteBase?.cnpj || "11222333000199",
        competency_date: getTodayLocalDate(),
        tomador_documento: "12345678000199",
        tax_code: "260101",
        service_city: "São Paulo - SP",
        service_value: 1500,
        service_description: "Serviços administrativos",
      },
      {
        client_id: clienteBase?.id || 1,
        cnpj_emissor: clienteBase?.cnpj || "11222333000199",
        competency_date: getTodayLocalDate(),
        tomador_documento: "98765432000155",
        tax_code: "260101",
        service_city: "Osasco - SP",
        service_value: 980.5,
        service_description: "Consultoria fiscal",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(dados);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "modelo");
    XLSX.writeFile(workbook, "modelo-emissao-massa-padronizado.xlsx");
  }

  async function marcarInvoiceComoCancelada(invoiceId?: number) {
    if (!invoiceId) return;

    const { error } = await supabase
      .from("invoices")
      .update({
        status: "canceled",
        error_message: "Emissão cancelada pelo usuário.",
      })
      .eq("id", invoiceId);

    if (error) {
      console.error("Erro ao marcar invoice como cancelada:", error);
    }
  }

  async function emitirNotas() {
    limparMensagens();

    if (!empresa) {
      setErro("Empresa não identificada.");
      return;
    }

    if (!linhas.length) {
      setErro("Carregue uma planilha antes de emitir.");
      return;
    }

    const linhasComErroValidacao = linhas.filter((linha) => linha.erros.length > 0);

    if (linhasComErroValidacao.length > 0) {
      setErro("Existem linhas com erro. Corrija a planilha antes de emitir.");
      return;
    }

    setLoading(true);
    canceladoRef.current = false;

    try {
      for (let i = 0; i < linhas.length; i++) {
        if (canceladoRef.current) {
          setLinhas((prev) =>
            prev.map((linha, idx) =>
              idx >= i && linha.status === "pending"
                ? {
                    ...linha,
                    status: "canceled",
                    mensagemStatus: "Emissão cancelada pelo usuário.",
                  }
                : linha
            )
          );
          break;
        }

        const linha = linhas[i];

        atualizarLinha(i, {
          status: "processing",
          mensagemStatus: "Preparando emissão...",
        });

        setProgresso(Math.round((i / linhas.length) * 100));

        try {
          const cliente = buscarClientePorIdECnpj(linha.client_id, linha.cnpj_emissor);

          if (!cliente) {
            throw new Error(
              "O emissor desta linha não corresponde ao client_id e cnpj_emissor informados."
            );
          }

          const cnpjEmpresaFinal = limparDocumento(cliente.cnpj);
          const senhaEmissor = cliente.password?.trim() || "";

          if (!cnpjEmpresaFinal) {
            throw new Error("Cliente emissor sem CNPJ válido.");
          }

          if (!senhaEmissor) {
            throw new Error("Cliente emissor sem senha do Emissor Nacional.");
          }

          const payload = {
            partner_company_id: empresa.id,
            client_id: linha.client_id,
            competency_date: linha.competency_date,
            service_taker: linha.tomador_documento,
            tax_code: linha.tax_code,
            service_city: linha.service_city,
            service_value: Number(linha.service_value),
            service_description: linha.service_description,
            nfse_key: null,
            pdf_url: null,
            xml_url: null,
            status: "pending",
            error_message: null,
          };

          const { data, error } = await supabase
            .from("invoices")
            .insert([payload])
            .select()
            .single();

          if (error || !data) {
            throw new Error(error?.message || "Erro ao salvar a nota no banco.");
          }

          atualizarLinha(i, {
            invoice_id: data.id,
            status: "processing",
            mensagemStatus: "Enviada para emissão. Aguardando processamento...",
          });

          if (canceladoRef.current) {
            await solicitarCancelamentoBackend(data.id);
          }

          const respostaAutomacao = await fetch("/api/emitir-nota", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              invoiceId: data.id,
              clientId: linha.client_id,
              partnerCompanyId: empresa.id,
              competencyDate: linha.competency_date,
              tomadorDocumento: linha.tomador_documento,
              taxCode: linha.tax_code,
              serviceCity: linha.service_city,
              serviceValue: Number(linha.service_value),
              serviceDescription: linha.service_description,
              cancelKey: String(data.id),
            }),
          });

          const resultadoAutomacao: ApiEmitirResponse = await respostaAutomacao.json();

          if (!resultadoAutomacao.success) {
            if (
              resultadoAutomacao.canceled ||
              canceladoRef.current ||
              String(resultadoAutomacao.message || "").includes("Emissão cancelada pelo usuário.")
            ) {
              await marcarInvoiceComoCancelada(data.id);

              atualizarLinha(i, {
                status: "canceled",
                mensagemStatus: "Emissão cancelada pelo usuário.",
                invoice_id: data.id,
              });
            } else {
              throw new Error(
                resultadoAutomacao.invoice?.error_message ||
                  resultadoAutomacao.message ||
                  "Erro na automação."
              );
            }
          } else {
            const statusRetorno =
              resultadoAutomacao.invoice?.status ||
              resultadoAutomacao.status ||
              "queued";

            if (
              statusRetorno === "queued" ||
              statusRetorno === "pending" ||
              statusRetorno === "processing"
            ) {
              atualizarLinha(i, {
                status: "processing",
                mensagemStatus: "Nota em emissão. Aguarde a conclusão.",
                pdf_url: resultadoAutomacao.invoice?.pdf_url || resultadoAutomacao.pdfUrl || null,
                xml_url: resultadoAutomacao.invoice?.xml_url || resultadoAutomacao.xmlUrl || null,
                nfse_key:
                  resultadoAutomacao.invoice?.nfse_key || resultadoAutomacao.nfseKey || null,
                invoice_id: data.id,
              });

              const resultadoFinal = await acompanharInvoice(i, data.id);

              if (resultadoFinal === "processing") {
                setMensagem("Existem notas ainda em processamento. Aguarde a conclusão.");
              }
            } else if (statusRetorno === "success") {
              const pdfUrl = resultadoAutomacao.invoice?.pdf_url || resultadoAutomacao.pdfUrl || null;
              const xmlUrl = resultadoAutomacao.invoice?.xml_url || resultadoAutomacao.xmlUrl || null;
              const nfseKey =
                resultadoAutomacao.invoice?.nfse_key || resultadoAutomacao.nfseKey || null;

              atualizarLinha(i, {
                status: "success",
                mensagemStatus:
                  resultadoAutomacao.invoice?.error_message
                    ? "Emitida com aviso."
                    : "Emitida com sucesso.",
                pdf_url: pdfUrl,
                xml_url: xmlUrl,
                nfse_key: nfseKey,
                invoice_id: data.id,
              });

              await hidratarArquivosDaLinha(i, {
                ...linha,
                status: "success",
                mensagemStatus:
                  resultadoAutomacao.invoice?.error_message
                    ? "Emitida com aviso."
                    : "Emitida com sucesso.",
                pdf_url: pdfUrl,
                xml_url: xmlUrl,
                nfse_key: nfseKey,
                invoice_id: data.id,
              });
            } else {
              throw new Error(
                resultadoAutomacao.invoice?.error_message ||
                  resultadoAutomacao.message ||
                  "Erro ao emitir nota."
              );
            }
          }
        } catch (erroLinha: any) {
          const mensagemErro = String(erroLinha?.message || "Erro ao emitir esta linha.");

          if (
            canceladoRef.current ||
            mensagemErro.includes("Target page, context or browser has been closed") ||
            mensagemErro.includes("EMISSAO_CANCELADA_USUARIO") ||
            mensagemErro.includes("Emissão cancelada pelo usuário.")
          ) {
            const invoiceIdAtual = linhas[i]?.invoice_id;
            await marcarInvoiceComoCancelada(invoiceIdAtual);

            atualizarLinha(i, {
              status: "canceled",
              mensagemStatus: "Emissão cancelada pelo usuário.",
            });
          } else {
            atualizarLinha(i, {
              status: "error",
              mensagemStatus: mensagemErro,
            });
          }
        }

        setProgresso(Math.round(((i + 1) / linhas.length) * 100));
      }

      const linhasFinais = await new Promise<LinhaValidada[]>((resolve) => {
        setLinhas((prev) => {
          resolve(prev);
          return prev;
        });
      });

      const totalSucesso = linhasFinais.filter((linha) => linha.status === "success").length;
      const totalEmProcessamento = linhasFinais.filter((linha) => linha.status === "processing").length;
      const totalErrosEmissao = linhasFinais.filter((linha) => linha.status === "error").length;
      const totalCanceladas = linhasFinais.filter((linha) => linha.status === "canceled").length;

      if (canceladoRef.current) {
        setMensagem("Solicitação de cancelamento enviada. As linhas foram atualizadas.");
        setErro("");
      } else if (totalEmProcessamento > 0) {
        setMensagem(
          `${totalSucesso} nota(s) concluída(s). ${totalEmProcessamento} ainda em processamento.`
        );
        setErro(
          totalErrosEmissao > 0 || totalCanceladas > 0
            ? "Algumas linhas não foram concluídas. Verifique a coluna de status."
            : ""
        );
      } else {
        if (totalSucesso > 0) {
          setMensagem(`${totalSucesso} nota(s) emitida(s) com sucesso.`);
        }

        if (totalErrosEmissao > 0 || totalCanceladas > 0) {
          setErro("Algumas linhas não foram emitidas. Verifique a coluna de status.");
        }
      }
    } catch (err) {
      console.error(err);
      setErro("Erro geral ao emitir notas em massa.");
    }

    setLoading(false);
  }

  async function gerarZipArquivos() {
    const emitidasComArquivos = linhas.filter(
      (linha) => linha.status === "success" && (linha.pdfBlob || linha.xmlBlob || linha.pdf_url || linha.xml_url)
    );

    if (!emitidasComArquivos.length) {
      setErro("Nenhum PDF/XML disponível para gerar ZIP.");
      return;
    }

    try {
      setLoading(true);
      setMensagem("");
      setErro("");

      const zip = new JSZip();

      for (let index = 0; index < emitidasComArquivos.length; index++) {
        const linha = emitidasComArquivos[index];
        const cliente = buscarClientePorId(linha.client_id);
        const nomeCliente = sanitizeFileName(cliente?.name || `cliente_${linha.client_id}`);
        const competencia = formatarCompetenciaParaArquivo(linha.competency_date || "");
        const numeroBase = linha.invoice_id || linha.linhaNumero;

        let pdfBlob = linha.pdfBlob || null;
        let xmlBlob = linha.xmlBlob || null;

        if (!pdfBlob && linha.pdf_url) {
          try {
            pdfBlob = await baixarArquivoComoBlob(linha.pdf_url);
          } catch (e) {
            console.error("Erro ao baixar PDF para ZIP:", e);
          }
        }

        if (!xmlBlob && linha.xml_url) {
          try {
            xmlBlob = await baixarArquivoComoBlob(linha.xml_url);
          } catch (e) {
            console.error("Erro ao baixar XML para ZIP:", e);
          }
        }

        if (pdfBlob) {
          const pdfFileName = `${nomeCliente}_nota_${numeroBase}_${competencia}.pdf`;
          zip.file(pdfFileName, pdfBlob);
        }

        if (xmlBlob) {
          const xmlFileName = `${nomeCliente}_nota_${numeroBase}_${competencia}.xml`;
          zip.file(xmlFileName, xmlBlob);
        }
      }

      const conteudoZip = await zip.generateAsync({ type: "blob" });
      saveAs(conteudoZip, "notas-emitidas.zip");
      setMensagem("ZIP gerado com sucesso.");
    } catch (err) {
      console.error(err);
      setErro("Erro ao gerar o arquivo ZIP.");
    }

    setLoading(false);
  }

  const totalErrosValidacao = useMemo(
    () => linhas.filter((linha) => linha.erros.length > 0).length,
    [linhas]
  );

  const totalErrosEmissao = useMemo(
    () => linhas.filter((linha) => linha.status === "error").length,
    [linhas]
  );

  const totalComErro = useMemo(
    () =>
      linhas.filter(
        (linha) => linha.erros.length > 0 || linha.status === "error"
      ).length,
    [linhas]
  );

  const totalValidas = useMemo(
    () => linhas.filter((linha) => linha.erros.length === 0).length,
    [linhas]
  );

  const totalCanceladas = useMemo(
    () => linhas.filter((linha) => linha.status === "canceled").length,
    [linhas]
  );

  const totalProcessando = useMemo(
    () => linhas.filter((linha) => linha.status === "processing").length,
    [linhas]
  );

  const totalEmitidas = useMemo(
    () => linhas.filter((linha) => linha.status === "success").length,
    [linhas]
  );

  if (loadingAccess) {
    return <ProtectedPageLoader label="Validando acesso da empresa..." />;
  }

  if (!authorized) {
    return null;
  }

  return (
    <EmpresaPageShell
      title="Emissão em Massa"
      subtitle="Envie uma planilha para gerar várias notas fiscais com validação, progresso, cancelamento e download final em ZIP."
    >
      <div style={pageWrapStyle}>
        <div style={backgroundGlowTopStyle} />
        <div style={backgroundGlowBottomStyle} />

        <div style={containerStyle}>
          <section style={heroCardStyle}>
            <div style={heroContentStyle}>
              <span style={heroTagStyle}>Módulo fiscal</span>
              <h2 style={heroTitleStyle}>Emissão em massa no padrão SaaS do MVP</h2>
              <p style={heroTextStyle}>
                Importe uma planilha, valide as linhas automaticamente, acompanhe o progresso
                da emissão e gere um ZIP final com PDFs e XMLs das notas emitidas.
              </p>

              <div style={heroPillsStyle}>
                <span style={heroPillStyle}>Validação automática</span>
                <span style={heroPillStyle}>Cancelamento de emissão</span>
                <span style={heroPillStyle}>ZIP com arquivos</span>
              </div>
            </div>

            <div style={heroInfoCardStyle}>
              <span style={heroInfoLabelStyle}>Empresa logada</span>
              <strong style={heroInfoValueStyle}>{empresa?.name || "Carregando..."}</strong>
              <span style={heroInfoSubStyle}>
                {empresa?.cnpj ? formatarDocumento(empresa.cnpj) : "CNPJ não disponível"}
              </span>
            </div>
          </section>

          <section style={statsGridStyle}>
            <div style={statCardStyle}>
              <span style={statLabelStyle}>Total de linhas</span>
              <strong style={statValueStyle}>{linhas.length}</strong>
            </div>

            <div style={statCardStyle}>
              <span style={statLabelStyle}>Linhas válidas</span>
              <strong style={statValueStyle}>{totalValidas}</strong>
            </div>

            <div style={statCardStyle}>
              <span style={statLabelStyle}>Linhas com erro</span>
              <strong style={statValueStyle}>{totalComErro}</strong>
            </div>

            <div style={statCardStyle}>
              <span style={statLabelStyle}>Emitidas</span>
              <strong style={statValueStyle}>{totalEmitidas}</strong>
            </div>

            <div style={statCardStyle}>
              <span style={statLabelStyle}>Processando</span>
              <strong style={statValueStyle}>{totalProcessando}</strong>
            </div>

            <div style={statCardStyle}>
              <span style={statLabelStyle}>Canceladas</span>
              <strong style={statValueStyle}>{totalCanceladas}</strong>
            </div>
          </section>

          <section style={mainCardStyle}>
            <div style={topBarStyle}>
              <div>
                <h3 style={cardTitleStyle}>Importação da planilha</h3>
                <p style={cardTextStyle}>
                  Use um arquivo .xlsx, .xls ou .csv com o modelo padrão do sistema.
                </p>
              </div>

              <div style={topActionsStyle}>
                <button onClick={baixarModeloPlanilha} style={softBlueButtonStyle}>
                  Baixar modelo
                </button>

                <label style={primaryButtonStyle}>
                  Selecionar planilha
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={lerPlanilha}
                    hidden
                  />
                </label>

                <button
                  onClick={limparPlanilha}
                  disabled={loading}
                  style={loading ? disabledButtonStyle : secondaryButtonStyle}
                >
                  Limpar planilha
                </button>

                <Link href="/notas" style={darkLinkButtonStyle}>
                  Notas emitidas
                </Link>
              </div>
            </div>

            {loadingInicial && <div style={infoMessageStyle}>Carregando clientes da empresa...</div>}

            {arquivo && (
              <div style={fileInfoStyle}>
                <strong>Arquivo carregado:</strong> {arquivo}
              </div>
            )}

            {loading && (
              <div style={progressCardStyle}>
                <div style={progressHeaderStyle}>
                  <span>Progresso da emissão em massa</span>
                  <strong>{progresso}%</strong>
                </div>

                <div style={progressBarStyle}>
                  <div style={{ ...progressFillStyle, width: `${progresso}%` }} />
                </div>

                <p style={progressTextStyle}>
                  O sistema está emitindo as notas e atualizando o status real de cada linha.
                </p>
              </div>
            )}

            {mensagem && <div style={successMessageStyle}>{mensagem}</div>}
            {erro && <div style={errorMessageStyle}>{erro}</div>}

            {linhas.length > 0 && (
              <div style={inlineStatsInfoStyle}>
                <span>
                  <strong>Erros de validação:</strong> {totalErrosValidacao}
                </span>
                <span>
                  <strong>Erros de emissão:</strong> {totalErrosEmissao}
                </span>
              </div>
            )}

            <div style={modelInfoBoxStyle}>
              <h4 style={modelTitleStyle}>Colunas obrigatórias da planilha</h4>
              <p style={modelTextStyle}>
                <strong>
                  client_id, cnpj_emissor, competency_date, tomador_documento, tax_code,
                  service_city, service_value, service_description
                </strong>
              </p>
            </div>

            {linhas.length > 0 && (
              <>
                <div style={actionBarStyle}>
                  <button
                    onClick={emitirNotas}
                    disabled={loading || totalErrosValidacao > 0 || loadingInicial}
                    style={
                      loading || totalErrosValidacao > 0 || loadingInicial
                        ? disabledButtonStyle
                        : primaryWideButtonStyle
                    }
                  >
                    {loading ? "Emitindo..." : "Emitir notas em massa"}
                  </button>

                  <button
                    onClick={pararEmissao}
                    disabled={!loading && totalProcessando === 0}
                    style={!loading && totalProcessando === 0 ? disabledDangerButtonStyle : dangerButtonStyle}
                  >
                    Parar emissão
                  </button>

                  <button
                    onClick={gerarZipArquivos}
                    disabled={loading || totalEmitidas === 0}
                    style={loading || totalEmitidas === 0 ? disabledGreenButtonStyle : greenButtonStyle}
                  >
                    Gerar ZIP com PDFs e XMLs
                  </button>
                </div>

                <div style={tableOuterStyle}>
                  <div style={tableInnerStyle}>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Linha</th>
                          <th style={thStyle}>Client ID</th>
                          <th style={thStyle}>CNPJ emissor</th>
                          <th style={thStyle}>Tomador</th>
                          <th style={thStyle}>Cód. tributação</th>
                          <th style={thStyle}>Local</th>
                          <th style={thStyle}>Valor</th>
                          <th style={thStyle}>Descrição</th>
                          <th style={thStyle}>Competência</th>
                          <th style={thStyle}>Validação</th>
                          <th style={thStyle}>Status da emissão</th>
                        </tr>
                      </thead>

                      <tbody>
                        {linhas.map((linha) => {
                          const status = getStatusConfig(linha.status);

                          return (
                            <tr key={linha.linhaNumero} style={trStyle}>
                              <td style={tdStyle}>#{linha.linhaNumero}</td>
                              <td style={tdStyle}>{linha.client_id || "-"}</td>
                              <td style={tdStyle}>{formatarDocumento(linha.cnpj_emissor) || "-"}</td>
                              <td style={tdStyle}>
                                {formatarDocumento(linha.tomador_documento) || "-"}
                              </td>
                              <td style={tdStyle}>{linha.tax_code || "-"}</td>
                              <td style={tdStyle}>{linha.service_city || "-"}</td>
                              <td style={tdStyle}>{formatarValor(Number(linha.service_value || 0))}</td>
                              <td
                                style={{
                                  ...tdStyle,
                                  minWidth: 260,
                                  whiteSpace: "normal",
                                  lineHeight: 1.55,
                                }}
                              >
                                {linha.service_description || "-"}
                              </td>
                              <td style={tdStyle}>{linha.competency_date || "-"}</td>
                              <td style={tdStyle}>
                                {linha.erros.length === 0 ? (
                                  <span
                                    style={{
                                      ...pillStyle,
                                      backgroundColor: "#dcfce7",
                                      borderColor: "#86efac",
                                      color: "#166534",
                                    }}
                                  >
                                    Linha válida
                                  </span>
                                ) : (
                                  <div style={errorListStyle}>
                                    {linha.erros.map((item, index) => (
                                      <span
                                        key={index}
                                        style={{
                                          ...pillStyle,
                                          backgroundColor: "#fee2e2",
                                          borderColor: "#fca5a5",
                                          color: "#991b1b",
                                        }}
                                      >
                                        {item}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td style={tdStyle}>
                                <div style={statusCellStyle}>
                                  <span
                                    style={{
                                      ...pillStyle,
                                      backgroundColor: status.bg,
                                      borderColor: status.border,
                                      color: status.color,
                                    }}
                                  >
                                    {linha.mensagemStatus || status.label}
                                  </span>

                                  {linha.nfse_key && (
                                    <span style={miniKeyStyle}>Chave: {linha.nfse_key}</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </EmpresaPageShell>
  );
}

const pageWrapStyle: CSSProperties = {
  position: "relative",
  overflow: "hidden",
};

const backgroundGlowTopStyle: CSSProperties = {
  position: "absolute",
  top: "-120px",
  right: "-120px",
  width: "280px",
  height: "280px",
  borderRadius: "999px",
  background: "rgba(59, 130, 246, 0.18)",
  filter: "blur(70px)",
  pointerEvents: "none",
};

const backgroundGlowBottomStyle: CSSProperties = {
  position: "absolute",
  bottom: "-140px",
  left: "-100px",
  width: "260px",
  height: "260px",
  borderRadius: "999px",
  background: "rgba(14, 165, 233, 0.14)",
  filter: "blur(70px)",
  pointerEvents: "none",
};

const containerStyle: CSSProperties = {
  maxWidth: "1450px",
  margin: "0 auto",
  position: "relative",
  zIndex: 1,
};

const heroCardStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "stretch",
  gap: "20px",
  padding: "28px",
  borderRadius: "28px",
  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #1d4ed8 100%)",
  color: "#ffffff",
  marginBottom: "24px",
  boxShadow: "0 24px 70px rgba(15, 23, 42, 0.28)",
  flexWrap: "wrap",
  border: "1px solid rgba(255,255,255,0.08)",
};

const heroContentStyle: CSSProperties = {
  flex: 1,
  minWidth: "320px",
  maxWidth: "840px",
};

const heroTagStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  fontSize: "12px",
  fontWeight: 800,
  color: "#dbeafe",
  backgroundColor: "rgba(255,255,255,0.09)",
  padding: "8px 12px",
  borderRadius: "999px",
  marginBottom: "14px",
  border: "1px solid rgba(255,255,255,0.1)",
};

const heroTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "30px",
  fontWeight: 900,
  lineHeight: 1.15,
};

const heroTextStyle: CSSProperties = {
  marginTop: "12px",
  marginBottom: 0,
  color: "#dbeafe",
  fontSize: "15px",
  lineHeight: 1.7,
  maxWidth: "760px",
};

const heroPillsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "18px",
};

const heroPillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.08)",
  color: "#e2e8f0",
  fontSize: "12px",
  fontWeight: 700,
  border: "1px solid rgba(255,255,255,0.1)",
};

const heroInfoCardStyle: CSSProperties = {
  minWidth: "260px",
  maxWidth: "320px",
  padding: "20px",
  borderRadius: "22px",
  backgroundColor: "rgba(255,255,255,0.09)",
  border: "1px solid rgba(255,255,255,0.1)",
  backdropFilter: "blur(12px)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const heroInfoLabelStyle: CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#cbd5e1",
  marginBottom: "8px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const heroInfoValueStyle: CSSProperties = {
  fontSize: "20px",
  fontWeight: 900,
  lineHeight: 1.3,
};

const heroInfoSubStyle: CSSProperties = {
  marginTop: "8px",
  color: "#dbeafe",
  fontSize: "13px",
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "24px",
};

const statCardStyle: CSSProperties = {
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
  border: "1px solid #dbe7f5",
  borderRadius: "22px",
  padding: "18px",
  boxShadow: "0 12px 35px rgba(15, 23, 42, 0.06)",
};

const statLabelStyle: CSSProperties = {
  display: "block",
  color: "#64748b",
  fontSize: "13px",
  marginBottom: "8px",
};

const statValueStyle: CSSProperties = {
  fontSize: "28px",
  color: "#0f172a",
  fontWeight: 900,
  lineHeight: 1,
};

const mainCardStyle: CSSProperties = {
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
  border: "1px solid #dbe7f5",
  borderRadius: "28px",
  padding: "24px",
  boxShadow: "0 18px 50px rgba(15, 23, 42, 0.08)",
};

const topBarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "18px",
  flexWrap: "wrap",
  marginBottom: "18px",
};

const cardTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 900,
  color: "#0f172a",
};

const cardTextStyle: CSSProperties = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.6,
};

const topActionsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const buttonBaseStyle: CSSProperties = {
  minHeight: "46px",
  padding: "0 16px",
  borderRadius: "14px",
  fontWeight: 800,
  fontSize: "14px",
  cursor: "pointer",
  border: "1px solid transparent",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
};

const primaryButtonStyle: CSSProperties = {
  ...buttonBaseStyle,
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: "#fff",
  boxShadow: "0 14px 28px rgba(37, 99, 235, 0.22)",
};

const primaryWideButtonStyle: CSSProperties = {
  ...primaryButtonStyle,
};

const secondaryButtonStyle: CSSProperties = {
  ...buttonBaseStyle,
  backgroundColor: "#ffffff",
  color: "#334155",
  border: "1px solid #cbd5e1",
};

const softBlueButtonStyle: CSSProperties = {
  ...buttonBaseStyle,
  backgroundColor: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
};

const darkLinkButtonStyle: CSSProperties = {
  ...buttonBaseStyle,
  backgroundColor: "#0f172a",
  color: "#ffffff",
  border: "1px solid #0f172a",
};

const greenButtonStyle: CSSProperties = {
  ...buttonBaseStyle,
  backgroundColor: "#059669",
  color: "#fff",
  border: "1px solid #059669",
};

const dangerButtonStyle: CSSProperties = {
  ...buttonBaseStyle,
  backgroundColor: "#dc2626",
  color: "#fff",
  border: "1px solid #dc2626",
};

const disabledButtonStyle: CSSProperties = {
  ...primaryWideButtonStyle,
  opacity: 0.6,
  cursor: "not-allowed",
};

const disabledGreenButtonStyle: CSSProperties = {
  ...greenButtonStyle,
  opacity: 0.6,
  cursor: "not-allowed",
};

const disabledDangerButtonStyle: CSSProperties = {
  ...dangerButtonStyle,
  opacity: 0.6,
  cursor: "not-allowed",
};

const infoMessageStyle: CSSProperties = {
  marginBottom: "16px",
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1d4ed8",
  borderRadius: "16px",
  padding: "14px 16px",
  fontSize: "14px",
  fontWeight: 700,
};

const fileInfoStyle: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#334155",
  borderRadius: "16px",
  padding: "14px 16px",
  marginBottom: "16px",
  fontSize: "14px",
};

const progressCardStyle: CSSProperties = {
  marginBottom: "16px",
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "18px",
  padding: "16px",
};

const progressHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "12px",
  fontSize: "14px",
  color: "#1d4ed8",
  fontWeight: 800,
};

const progressBarStyle: CSSProperties = {
  width: "100%",
  height: "14px",
  background: "#dbeafe",
  borderRadius: "999px",
  overflow: "hidden",
};

const progressFillStyle: CSSProperties = {
  height: "100%",
  background: "linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%)",
  borderRadius: "999px",
  transition: "width 0.25s ease",
};

const progressTextStyle: CSSProperties = {
  margin: "12px 0 0",
  color: "#334155",
  lineHeight: 1.5,
  fontSize: "14px",
};

const successMessageStyle: CSSProperties = {
  marginBottom: "16px",
  backgroundColor: "#ecfdf5",
  border: "1px solid #a7f3d0",
  color: "#065f46",
  borderRadius: "16px",
  padding: "12px 14px",
  fontSize: "14px",
  fontWeight: 700,
};

const errorMessageStyle: CSSProperties = {
  marginBottom: "16px",
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  borderRadius: "16px",
  padding: "12px 14px",
  fontSize: "14px",
  fontWeight: 700,
};

const inlineStatsInfoStyle: CSSProperties = {
  display: "flex",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "16px",
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#334155",
  borderRadius: "16px",
  padding: "12px 14px",
  fontSize: "14px",
  lineHeight: 1.5,
};

const modelInfoBoxStyle: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  padding: "16px",
  marginBottom: "18px",
};

const modelTitleStyle: CSSProperties = {
  margin: "0 0 8px",
  fontSize: "16px",
  color: "#0f172a",
};

const modelTextStyle: CSSProperties = {
  margin: 0,
  color: "#475569",
  lineHeight: 1.55,
  fontSize: "14px",
};

const actionBarStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "18px",
};

const tableOuterStyle: CSSProperties = {
  overflowX: "auto",
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
  background: "#ffffff",
};

const tableInnerStyle: CSSProperties = {
  minWidth: "1600px",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#fff",
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "16px 14px",
  fontSize: "13px",
  color: "#475569",
  fontWeight: 900,
  borderBottom: "1px solid #e2e8f0",
  whiteSpace: "nowrap",
  background: "#f8fafc",
  position: "sticky",
  top: 0,
};

const trStyle: CSSProperties = {
  borderBottom: "1px solid #f1f5f9",
};

const tdStyle: CSSProperties = {
  padding: "15px 14px",
  fontSize: "14px",
  color: "#0f172a",
  verticalAlign: "top",
  whiteSpace: "nowrap",
};

const pillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "7px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
  width: "fit-content",
  lineHeight: 1.4,
  border: "1px solid transparent",
};

const errorListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const statusCellStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const miniKeyStyle: CSSProperties = {
  fontSize: "12px",
  color: "#475569",
  lineHeight: 1.4,
};