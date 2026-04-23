"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabaseClient";
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
  client_type: string;
  mei_created_at: string | null;
  is_active: boolean;
  partner_company_id: number | null;
};

type UltimaNota = {
  id?: number;
  competency_date: string;
  service_taker: string;
  tax_code: string;
  service_city: string;
  service_value: number;
  service_description: string;
  pdf_url?: string | null;
  xml_url?: string | null;
  nfse_key?: string | null;
  status?: string | null;
  error_message?: string | null;
};

type ApiEmitirResponse = {
  success: boolean;
  message?: string;
  error?: string;
  canceled?: boolean;
  jobId?: number | null;
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

function getTodayLocalDate() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function limparDocumento(valor: string | null | undefined) {
  return String(valor || "").replace(/\D/g, "");
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

function parseValorMonetario(valor: string) {
  const texto = String(valor || "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();

  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : NaN;
}

function statusNormalizado(status?: string | null) {
  return String(status || "").trim().toLowerCase();
}

function notaFoiGerada(status?: string | null, nfseKey?: string | null) {
  const valor = statusNormalizado(status);
  return valor === "success" || valor === "sucesso" || Boolean(String(nfseKey || "").trim());
}

function getStatusMeta(
  status?: string | null,
  nfseKey?: string | null,
  pdfUrl?: string | null,
  xmlUrl?: string | null
) {
  const valor = statusNormalizado(status);
  const temChave = Boolean(String(nfseKey || "").trim());
  const temArquivo = Boolean(String(pdfUrl || "").trim() || String(xmlUrl || "").trim());

  if (valor.includes("success") || valor.includes("sucesso") || temChave) {
    return {
      label: temArquivo ? "Emitida com sucesso" : "Emitida",
      bg: "#dcfce7",
      border: "#86efac",
      color: "#166534",
    };
  }

  if (valor.includes("processing")) {
    return {
      label: "Processando",
      bg: "#dbeafe",
      border: "#93c5fd",
      color: "#1d4ed8",
    };
  }

  if (valor.includes("queued")) {
    return {
      label: "Na fila",
      bg: "#fef3c7",
      border: "#fcd34d",
      color: "#92400e",
    };
  }

  if (valor.includes("pending")) {
    return {
      label: "Pendente",
      bg: "#fef3c7",
      border: "#fcd34d",
      color: "#92400e",
    };
  }

  if (valor.includes("canceled") || valor.includes("cancelada")) {
    return {
      label: "Cancelada",
      bg: "#e5e7eb",
      border: "#cbd5e1",
      color: "#334155",
    };
  }

  if (valor.includes("erro") || valor.includes("error")) {
    return {
      label: "Erro",
      bg: "#fee2e2",
      border: "#fca5a5",
      color: "#991b1b",
    };
  }

  return {
    label: status || "-",
    bg: "#f1f5f9",
    border: "#cbd5e1",
    color: "#334155",
  };
}

export default function EmitirNotaPage() {
  const { isLoading: loadingAccess, isAuthorized: authorized } = useProtectedRoute();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const [clientIdFromUrl, setClientIdFromUrl] = useState("");

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [acompanhandoNota, setAcompanhandoNota] = useState(false);

  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<"sucesso" | "erro" | "aviso" | "">("");

  const [ultimaNota, setUltimaNota] = useState<UltimaNota | null>(null);

  const [clientId, setClientId] = useState("");
  const [competencyDate, setCompetencyDate] = useState(getTodayLocalDate());
  const [serviceTaker, setServiceTaker] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [serviceCity, setServiceCity] = useState("São Paulo - SP");
  const [serviceValue, setServiceValue] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const clientIdParam = params.get("client_id") || "";
    setClientIdFromUrl(clientIdParam);
  }, []);

  useEffect(() => {
    if (!loadingAccess && authorized) {
      carregarDados();
    }
  }, [loadingAccess, authorized, clientIdFromUrl]);

  useEffect(() => {
    if (!clientes.length) {
      setClienteSelecionado(null);
      return;
    }

    const cliente =
      clientes.find((item) => String(item.id) === String(clientId)) || null;

    setClienteSelecionado(cliente);
  }, [clientes, clientId]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  async function carregarDados() {
    try {
      setLoading(true);
      setMensagem("");
      setTipoMensagem("");

      const empresaSessao = getPartnerCompanySession();

      if (!empresaSessao?.id) {
        setMensagem("Empresa não encontrada na sessão.");
        setTipoMensagem("erro");
        setLoading(false);
        return;
      }

      const empresaId = empresaSessao.id;

      const { data: empresaData, error: empresaError } = await supabase
        .from("partner_companies")
        .select("*")
        .eq("id", empresaId)
        .single();

      if (empresaError || !empresaData) {
        console.log("Erro ao buscar empresa:", empresaError);
        setMensagem("Nenhuma empresa parceira encontrada.");
        setTipoMensagem("erro");
        setLoading(false);
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
        console.log("Erro ao buscar clientes:", clientesError);
        setMensagem("Erro ao carregar clientes.");
        setTipoMensagem("erro");
        setLoading(false);
        return;
      }

      const listaClientes = (clientesData || []) as Cliente[];
      setClientes(listaClientes);

      if (clientIdFromUrl) {
        const clienteEncontrado =
          listaClientes.find(
            (cliente) => String(cliente.id) === String(clientIdFromUrl)
          ) || null;

        if (clienteEncontrado) {
          setClientId(String(clienteEncontrado.id));
          setClienteSelecionado(clienteEncontrado);
        } else {
          setClientId("");
          setClienteSelecionado(null);
        }
      }

      if (!clientIdFromUrl && listaClientes.length === 1) {
        setClientId(String(listaClientes[0].id));
        setClienteSelecionado(listaClientes[0]);
      }

      setLoading(false);
    } catch (error) {
      console.log("Erro inesperado:", error);
      setMensagem("Erro inesperado ao carregar a página.");
      setTipoMensagem("erro");
      setLoading(false);
    }
  }

  function resetarFormularioAposEnvio() {
    setCompetencyDate(getTodayLocalDate());
    setTaxCode("");
    setServiceCity("São Paulo - SP");
    setServiceValue("");
    setServiceDescription("");
    setServiceTaker("");
  }

  function pararAcompanhamento() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setAcompanhandoNota(false);
    setSalvando(false);
  }

  async function iniciarAcompanhamentoNota(invoiceId: number, notaBase: UltimaNota) {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    setAcompanhandoNota(true);
    setSalvando(true);

    let tentativas = 0;
    const maxTentativas = 120;

    pollingRef.current = setInterval(async () => {
      tentativas += 1;

      try {
        const { data, error } = await supabase
          .from("invoices")
          .select(
            "id, competency_date, service_taker, tax_code, service_city, service_value, service_description, pdf_url, xml_url, nfse_key, status, error_message"
          )
          .eq("id", invoiceId)
          .single();

        if (error || !data) {
          if (tentativas >= maxTentativas) {
            pararAcompanhamento();
            setMensagem("Não foi possível acompanhar a conclusão da emissão.");
            setTipoMensagem("erro");
          }
          return;
        }

        const notaAtualizada: UltimaNota = {
          id: data.id,
          competency_date: data.competency_date || notaBase.competency_date,
          service_taker: data.service_taker || notaBase.service_taker,
          tax_code: data.tax_code || notaBase.tax_code,
          service_city: data.service_city || notaBase.service_city,
          service_value: Number(data.service_value ?? notaBase.service_value ?? 0),
          service_description: data.service_description || notaBase.service_description,
          pdf_url: data.pdf_url || null,
          xml_url: data.xml_url || null,
          nfse_key: data.nfse_key || null,
          status: data.status || null,
          error_message: data.error_message || null,
        };

        setUltimaNota(notaAtualizada);

        const statusAtual = statusNormalizado(data.status);
        const temChave = Boolean(String(data.nfse_key || "").trim());
        const temPdf = Boolean(String(data.pdf_url || "").trim());
        const temXml = Boolean(String(data.xml_url || "").trim());

        if (statusAtual === "error" || statusAtual === "erro") {
          pararAcompanhamento();
          setMensagem(data.error_message || "Erro ao concluir a emissão da nota.");
          setTipoMensagem("erro");
          return;
        }

        if (statusAtual === "canceled" || statusAtual === "cancelada") {
          pararAcompanhamento();
          setMensagem("Emissão cancelada.");
          setTipoMensagem("aviso");
          return;
        }

        if (
          statusAtual === "success" ||
          statusAtual === "sucesso" ||
          temChave ||
          temPdf ||
          temXml
        ) {
          pararAcompanhamento();

          if (temPdf || temXml) {
            setMensagem("Nota emitida com sucesso!");
            setTipoMensagem("sucesso");
          } else {
            setMensagem("Nota emitida com sucesso. PDF/XML ainda estão sendo liberados.");
            setTipoMensagem("aviso");
          }

          return;
        }

        setMensagem("Emitindo nota fiscal... aguarde a conclusão.");
        setTipoMensagem("aviso");

        if (tentativas >= maxTentativas) {
          pararAcompanhamento();
          setMensagem("A emissão ainda está em processamento. Aguarde mais um pouco.");
          setTipoMensagem("aviso");
        }
      } catch (error) {
        console.log("Erro ao acompanhar nota:", error);

        if (tentativas >= maxTentativas) {
          pararAcompanhamento();
          setMensagem("Erro ao acompanhar a emissão da nota.");
          setTipoMensagem("erro");
        }
      }
    }, 2000);
  }

  const statusMeta = getStatusMeta(
    ultimaNota?.status,
    ultimaNota?.nfse_key,
    ultimaNota?.pdf_url,
    ultimaNota?.xml_url
  );
  const notaGerada = notaFoiGerada(ultimaNota?.status, ultimaNota?.nfse_key);
  const podeAbrirPdf = Boolean(ultimaNota?.pdf_url);
  const podeAbrirXml = Boolean(ultimaNota?.xml_url);
  const exibindoProcessamento = salvando || acompanhandoNota;

  function validarFormulario() {
    if (!empresa) {
      setMensagem("Empresa não encontrada.");
      setTipoMensagem("erro");
      return false;
    }

    if (!clientId) {
      setMensagem("Selecione um cliente.");
      setTipoMensagem("erro");
      return false;
    }

    if (!clienteSelecionado) {
      setMensagem("Cliente selecionado não encontrado.");
      setTipoMensagem("erro");
      return false;
    }

    if (clienteSelecionado.partner_company_id !== empresa.id) {
      setMensagem("Cliente não pertence à empresa logada.");
      setTipoMensagem("erro");
      return false;
    }

    if (!clienteSelecionado.is_active) {
      setMensagem("Este cliente está inativo.");
      setTipoMensagem("erro");
      return false;
    }

    if (!limparDocumento(clienteSelecionado.cnpj)) {
      setMensagem("O CNPJ do cliente não foi encontrado.");
      setTipoMensagem("erro");
      return false;
    }

    if (!String(clienteSelecionado.password || "").trim()) {
      setMensagem("Este cliente não possui senha do Emissor Nacional cadastrada.");
      setTipoMensagem("erro");
      return false;
    }

    if (!competencyDate) {
      setMensagem("Informe a data de competência.");
      setTipoMensagem("erro");
      return false;
    }

    if (!serviceTaker.trim()) {
      setMensagem("Informe o CPF/CNPJ do tomador do serviço.");
      setTipoMensagem("erro");
      return false;
    }

    if (!taxCode.trim()) {
      setMensagem("Informe o código de tributação nacional.");
      setTipoMensagem("erro");
      return false;
    }

    if (!serviceCity.trim()) {
      setMensagem("Informe o local da prestação.");
      setTipoMensagem("erro");
      return false;
    }

    const valor = parseValorMonetario(serviceValue);
    if (!serviceValue || Number.isNaN(valor) || valor <= 0) {
      setMensagem("Informe um valor válido para a prestação.");
      setTipoMensagem("erro");
      return false;
    }

    if (!serviceDescription.trim()) {
      setMensagem("Informe a descrição do serviço.");
      setTipoMensagem("erro");
      return false;
    }

    return true;
  }

  function baixarPDF() {
    if (!ultimaNota?.pdf_url) {
      alert("PDF ainda não disponível. Aguarde a liberação do arquivo.");
      return;
    }

    window.open(ultimaNota.pdf_url, "_blank");
  }

  function baixarXML() {
    if (!ultimaNota?.xml_url) {
      alert("XML ainda não disponível. Aguarde a liberação do arquivo.");
      return;
    }

    window.open(ultimaNota.xml_url, "_blank");
  }

  async function emitirNota() {
    if (salvando || acompanhandoNota) return;

    setMensagem("");
    setTipoMensagem("");

    if (!validarFormulario()) return;
    if (!empresa || !clienteSelecionado) return;

    try {
      setSalvando(true);

      const descricaoFinal = serviceDescription.trim();
      const valorFinal = parseValorMonetario(serviceValue);
      const tomadorFinal = limparDocumento(serviceTaker.trim());

      const payload = {
        client_id: Number(clientId),
        partner_company_id: empresa.id,
        competency_date: competencyDate,
        service_taker: tomadorFinal,
        tax_code: taxCode.trim(),
        service_city: serviceCity.trim(),
        service_value: valorFinal,
        service_description: descricaoFinal,
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
        console.log("Erro ao salvar nota no banco:", error);
        setMensagem(`Erro ao salvar nota: ${error?.message || "falha desconhecida"}`);
        setTipoMensagem("erro");
        setSalvando(false);
        return;
      }

      const notaBase: UltimaNota = {
        id: data.id,
        competency_date: competencyDate,
        service_taker: tomadorFinal,
        tax_code: taxCode.trim(),
        service_city: serviceCity.trim(),
        service_value: valorFinal,
        service_description: descricaoFinal,
        pdf_url: null,
        xml_url: null,
        nfse_key: null,
        status: "queued",
        error_message: null,
      };

      setUltimaNota(notaBase);
      setMensagem("Emitindo nota fiscal... aguarde a conclusão.");
      setTipoMensagem("aviso");
      resetarFormularioAposEnvio();

      fetch("/api/emitir-nota", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoiceId: data.id,
          clientId: Number(clientId),
          partnerCompanyId: empresa.id,
          competencyDate,
          tomadorDocumento: tomadorFinal,
          taxCode: taxCode.trim(),
          serviceCity: serviceCity.trim(),
          serviceValue: valorFinal,
          serviceDescription: descricaoFinal,
          cancelKey: String(data.id),
        }),
      })
        .then(async (res) => {
          const resultadoAutomacao: ApiEmitirResponse | null = await res
            .json()
            .catch(() => null);

          if (!resultadoAutomacao) return;

          const notaRetorno: UltimaNota = {
            id: resultadoAutomacao.invoice?.id || data.id,
            competency_date: competencyDate,
            service_taker: tomadorFinal,
            tax_code: taxCode.trim(),
            service_city: serviceCity.trim(),
            service_value: valorFinal,
            service_description: descricaoFinal,
            pdf_url:
              resultadoAutomacao.invoice?.pdf_url ||
              resultadoAutomacao.pdfUrl ||
              null,
            xml_url:
              resultadoAutomacao.invoice?.xml_url ||
              resultadoAutomacao.xmlUrl ||
              null,
            nfse_key:
              resultadoAutomacao.invoice?.nfse_key ||
              resultadoAutomacao.nfseKey ||
              null,
            status:
              resultadoAutomacao.invoice?.status ||
              resultadoAutomacao.status ||
              "queued",
            error_message:
              resultadoAutomacao.invoice?.error_message ||
              resultadoAutomacao.message ||
              resultadoAutomacao.error ||
              null,
          };

          setUltimaNota((atual) => ({
            ...(atual || notaBase),
            ...notaRetorno,
          }));
        })
        .catch((fetchError) => {
          console.log("Erro ao chamar /api/emitir-nota:", fetchError);
        });

      await iniciarAcompanhamentoNota(data.id, notaBase);
    } catch (error) {
      console.log(error);
      setMensagem("Erro inesperado ao emitir a nota.");
      setTipoMensagem("erro");
      setSalvando(false);
    }
  }

  if (loadingAccess) {
    return <ProtectedPageLoader label="Validando acesso da empresa..." />;
  }

  if (!authorized) {
    return null;
  }

  return (
    <EmpresaPageShell
      title="Emissão de Nota Fiscal"
      subtitle="Emita notas de forma rápida, organizada e vinculada aos clientes da empresa parceira."
    >
      <div style={pageWrapStyle}>
        <div style={backgroundGlowTopStyle} />
        <div style={backgroundGlowBottomStyle} />

        <div style={containerStyle}>
          <section style={heroCardStyle}>
            <div style={heroContentStyle}>
              <span style={heroTagStyle}>Módulo fiscal</span>
              <h2 style={heroTitleStyle}>Emissão individual para clientes da empresa</h2>
              <p style={heroTextStyle}>
                Preencha os dados da prestação, gere a nota com segurança e acompanhe o
                retorno da automação com PDF, XML e chave da NFS-e.
              </p>

              <div style={heroPillsStyle}>
                <span style={heroPillStyle}>Fluxo seguro</span>
                <span style={heroPillStyle}>PDF e XML</span>
                <span style={heroPillStyle}>Padrão MVP</span>
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

          <section style={mainGridStyle}>
            <div style={formCardStyle}>
              <div style={cardHeaderStyle}>
                <div>
                  <h3 style={cardTitleStyle}>Dados da nota</h3>
                  <p style={cardTextStyle}>
                    Informe os dados principais da prestação do serviço e conclua a emissão
                    no padrão operacional do MVP.
                  </p>
                </div>

                <Link href="/notas" style={topLinkStyle}>
                  Ver histórico
                </Link>
              </div>

              {loading ? (
                <div style={loadingBoxStyle}>Carregando dados da empresa e dos clientes...</div>
              ) : (
                <>
                  {exibindoProcessamento && (
                    <div style={processingBannerStyle}>
                      <div style={processingDotStyle} />
                      <div>
                        <strong style={processingTitleStyle}>Emitindo nota fiscal...</strong>
                        <p style={processingTextStyle}>
                          Aguarde. Estamos processando a emissão e liberaremos PDF/XML assim
                          que a nota for concluída.
                        </p>
                      </div>
                    </div>
                  )}

                  <div style={gridStyle}>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Cliente</label>
                      <select
                        value={clientId}
                        onChange={(e) => {
                          const novoId = e.target.value;
                          setClientId(novoId);

                          const cliente =
                            clientes.find((item) => String(item.id) === String(novoId)) || null;

                          setClienteSelecionado(cliente);
                        }}
                        style={inputStyle}
                        disabled={exibindoProcessamento}
                      >
                        <option value="">Selecione um cliente</option>
                        {clientes.map((cliente) => (
                          <option key={cliente.id} value={cliente.id}>
                            {cliente.name} - {cliente.cnpj}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={fieldStyle}>
                      <label style={labelStyle}>Data de competência</label>
                      <input
                        type="date"
                        value={competencyDate}
                        onChange={(e) => setCompetencyDate(e.target.value)}
                        style={inputStyle}
                        disabled={exibindoProcessamento}
                      />
                    </div>

                    <div style={fieldStyle}>
                      <label style={labelStyle}>Tomador do serviço</label>
                      <input
                        value={serviceTaker}
                        onChange={(e) => setServiceTaker(formatarDocumento(e.target.value))}
                        placeholder="CPF/CNPJ do tomador no emissor"
                        style={inputStyle}
                        disabled={exibindoProcessamento}
                      />
                    </div>

                    <div style={fieldStyle}>
                      <label style={labelStyle}>Código de tributação nacional</label>
                      <input
                        value={taxCode}
                        onChange={(e) => setTaxCode(e.target.value)}
                        placeholder="Ex.: 260101"
                        style={inputStyle}
                        disabled={exibindoProcessamento}
                      />
                    </div>

                    <div style={fieldStyle}>
                      <label style={labelStyle}>Local da prestação</label>
                      <input
                        value={serviceCity}
                        onChange={(e) => setServiceCity(e.target.value)}
                        placeholder="Ex.: São Paulo - SP"
                        style={inputStyle}
                        disabled={exibindoProcessamento}
                      />
                    </div>

                    <div style={fieldStyle}>
                      <label style={labelStyle}>Valor da prestação</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={serviceValue}
                        onChange={(e) => setServiceValue(e.target.value)}
                        placeholder="Ex.: 1500,00"
                        style={inputStyle}
                        disabled={exibindoProcessamento}
                      />
                    </div>

                    <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                      <label style={labelStyle}>Descrição do serviço</label>
                      <textarea
                        value={serviceDescription}
                        onChange={(e) => setServiceDescription(e.target.value)}
                        placeholder="Descreva o serviço prestado"
                        style={textareaStyle}
                        disabled={exibindoProcessamento}
                      />
                    </div>
                  </div>

                  <div style={infoBoxStyle}>
                    Esta área é exclusiva para <strong>emissão de nota fiscal</strong>.
                  </div>

                  <div style={actionsStyle}>
                    <button
                      onClick={emitirNota}
                      disabled={exibindoProcessamento}
                      style={exibindoProcessamento ? disabledButtonStyle : buttonStyle}
                    >
                      {exibindoProcessamento ? "Processando emissão..." : "Emitir nota"}
                    </button>
                  </div>

                  {mensagem && (
                    <div
                      style={
                        tipoMensagem === "erro"
                          ? errorMessageStyle
                          : tipoMensagem === "aviso"
                          ? warningMessageStyle
                          : successMessageStyle
                      }
                    >
                      {mensagem}
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={rightColumnStyle}>
              <div style={sideCardStyle}>
                <div style={cardHeaderSimpleStyle}>
                  <h3 style={sideTitleStyle}>Resumo do cliente</h3>
                  <p style={sideTextStyle}>
                    Confira os dados antes de concluir a emissão.
                  </p>
                </div>

                {clienteSelecionado ? (
                  <div style={clientSummaryStyle}>
                    <div style={summaryItemLightStyle}>
                      <span style={summaryLabelStyle}>Nome</span>
                      <p style={summaryValueLightStyle}>{clienteSelecionado.name}</p>
                    </div>

                    <div style={summaryItemLightStyle}>
                      <span style={summaryLabelStyle}>CNPJ</span>
                      <p style={summaryValueLightStyle}>
                        {formatarDocumento(clienteSelecionado.cnpj) || "Não informado"}
                      </p>
                    </div>

                    <div style={summaryItemLightStyle}>
                      <span style={summaryLabelStyle}>Email</span>
                      <p style={summaryValueLightStyle}>
                        {clienteSelecionado.email || "Não informado"}
                      </p>
                    </div>

                    <div style={summaryItemLightStyle}>
                      <span style={summaryLabelStyle}>Telefone</span>
                      <p style={summaryValueLightStyle}>
                        {clienteSelecionado.phone || "Não informado"}
                      </p>
                    </div>

                    <div style={summaryItemLightStyle}>
                      <span style={summaryLabelStyle}>Endereço</span>
                      <p style={summaryValueLightStyle}>
                        {clienteSelecionado.address || "Não informado"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={emptySideBoxStyle}>
                    Selecione um cliente para visualizar o resumo completo aqui.
                  </div>
                )}
              </div>

              {ultimaNota && (
                <div style={resultCardStyle}>
                  <div style={resultHeaderStyle}>
                    <div>
                      <span style={resultTagStyle}>Última emissão</span>
                      <h3 style={resultTitleStyle}>Resultado da emissão</h3>
                    </div>

                    <span
                      style={{
                        ...resultStatusBadgeStyle,
                        backgroundColor: statusMeta.bg,
                        borderColor: statusMeta.border,
                        color: statusMeta.color,
                      }}
                    >
                      {statusMeta.label}
                    </span>
                  </div>

                  <div style={resultInfoGridStyle}>
                    <div style={resultItemStyle}>
                      <span style={summaryLabelDarkStyle}>Valor</span>
                      <p style={summaryValueDarkStyle}>{formatarValor(ultimaNota.service_value)}</p>
                    </div>

                    <div style={resultItemStyle}>
                      <span style={summaryLabelDarkStyle}>Competência</span>
                      <p style={summaryValueDarkStyle}>{ultimaNota.competency_date}</p>
                    </div>

                    <div style={resultItemStyle}>
                      <span style={summaryLabelDarkStyle}>Tomador</span>
                      <p style={summaryValueDarkStyle}>
                        {formatarDocumento(ultimaNota.service_taker)}
                      </p>
                    </div>

                    <div style={resultItemStyle}>
                      <span style={summaryLabelDarkStyle}>Local da prestação</span>
                      <p style={summaryValueDarkStyle}>{ultimaNota.service_city}</p>
                    </div>
                  </div>

                  <div style={summaryItemWhiteInDarkStyle}>
                    <span style={summaryLabelStyle}>Descrição</span>
                    <p style={summaryValueLightStyle}>{ultimaNota.service_description}</p>
                  </div>

                  {ultimaNota.nfse_key && (
                    <div style={resultHighlightBoxStyle}>
                      <span style={summaryLabelDarkStyle}>Chave/Número da NFS-e</span>
                      <p style={highlightValueStyle}>{ultimaNota.nfse_key}</p>
                    </div>
                  )}

                  {ultimaNota.error_message && (
                    <div style={inlineErrorBoxStyle}>
                      <strong style={inlineErrorTitleStyle}>Aviso da automação</strong>
                      <p style={inlineErrorTextStyle}>{ultimaNota.error_message}</p>
                    </div>
                  )}

                  <div style={downloadButtonsStyle}>
                    {podeAbrirPdf && (
                      <button style={secondaryButtonStyle} onClick={baixarPDF}>
                        Abrir PDF
                      </button>
                    )}

                    {podeAbrirXml && (
                      <button style={secondaryButtonStyle} onClick={baixarXML}>
                        Abrir XML
                      </button>
                    )}
                  </div>

                  {!notaGerada && (
                    <div style={resultPendingFilesStyle}>
                      Os arquivos serão liberados somente após a nota ser gerada.
                    </div>
                  )}

                  {notaGerada && !podeAbrirPdf && !podeAbrirXml && (
                    <div style={resultPendingFilesStyle}>
                      A nota já foi emitida. PDF/XML ainda estão sendo liberados.
                    </div>
                  )}
                </div>
              )}
            </div>
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
  maxWidth: "1280px",
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
  maxWidth: "780px",
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
  maxWidth: "720px",
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

const mainGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.7fr) minmax(320px, 0.95fr)",
  gap: "24px",
  alignItems: "start",
};

const formCardStyle: CSSProperties = {
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
  border: "1px solid #dbe7f5",
  borderRadius: "28px",
  padding: "28px",
  boxShadow: "0 18px 50px rgba(15, 23, 42, 0.08)",
  position: "relative",
};

const rightColumnStyle: CSSProperties = {
  display: "grid",
  gap: "20px",
};

const sideCardStyle: CSSProperties = {
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
  border: "1px solid #dbe7f5",
  borderRadius: "28px",
  padding: "24px",
  boxShadow: "0 18px 50px rgba(15, 23, 42, 0.08)",
};

const resultCardStyle: CSSProperties = {
  background: "linear-gradient(180deg, #0f172a 0%, #172554 100%)",
  border: "1px solid rgba(191, 219, 254, 0.18)",
  borderRadius: "28px",
  padding: "24px",
  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.22)",
  color: "#ffffff",
};

const cardHeaderStyle: CSSProperties = {
  marginBottom: "22px",
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const cardHeaderSimpleStyle: CSSProperties = {
  marginBottom: "22px",
};

const cardTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 900,
  color: "#0f172a",
};

const sideTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "22px",
  fontWeight: 900,
  color: "#0f172a",
};

const cardTextStyle: CSSProperties = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.6,
  maxWidth: "720px",
};

const sideTextStyle: CSSProperties = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.6,
};

const topLinkStyle: CSSProperties = {
  textDecoration: "none",
  backgroundColor: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "14px",
  fontWeight: 800,
  display: "inline-flex",
  alignItems: "center",
};

const loadingBoxStyle: CSSProperties = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  padding: "18px",
  color: "#475569",
  fontSize: "14px",
};

const processingBannerStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "14px",
  marginBottom: "18px",
  padding: "16px 18px",
  borderRadius: "18px",
  background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
  border: "1px solid #93c5fd",
};

const processingDotStyle: CSSProperties = {
  width: "12px",
  height: "12px",
  borderRadius: "999px",
  backgroundColor: "#2563eb",
  marginTop: "5px",
  boxShadow: "0 0 0 6px rgba(37, 99, 235, 0.15)",
  flexShrink: 0,
};

const processingTitleStyle: CSSProperties = {
  display: "block",
  color: "#1d4ed8",
  fontSize: "14px",
  marginBottom: "4px",
};

const processingTextStyle: CSSProperties = {
  margin: 0,
  color: "#334155",
  fontSize: "14px",
  lineHeight: 1.5,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "18px",
};

const fieldStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const labelStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 800,
  color: "#334155",
};

const inputStyle: CSSProperties = {
  width: "100%",
  height: "52px",
  borderRadius: "16px",
  border: "1px solid #cbd5e1",
  padding: "0 15px",
  fontSize: "14px",
  backgroundColor: "#ffffff",
  outline: "none",
  color: "#0f172a",
  boxSizing: "border-box",
  boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.03)",
};

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: "132px",
  borderRadius: "16px",
  border: "1px solid #cbd5e1",
  padding: "14px",
  fontSize: "14px",
  backgroundColor: "#ffffff",
  outline: "none",
  color: "#0f172a",
  resize: "vertical",
  boxSizing: "border-box",
  boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.03)",
};

const infoBoxStyle: CSSProperties = {
  marginTop: "22px",
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1d4ed8",
  borderRadius: "18px",
  padding: "14px 16px",
  fontSize: "14px",
  lineHeight: 1.7,
};

const actionsStyle: CSSProperties = {
  marginTop: "24px",
};

const buttonStyle: CSSProperties = {
  width: "100%",
  height: "54px",
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: "#fff",
  border: "none",
  borderRadius: "16px",
  fontSize: "15px",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 14px 28px rgba(37, 99, 235, 0.24)",
};

const disabledButtonStyle: CSSProperties = {
  ...buttonStyle,
  opacity: 0.72,
  cursor: "not-allowed",
};

const clientSummaryStyle: CSSProperties = {
  display: "grid",
  gap: "14px",
};

const summaryItemLightStyle: CSSProperties = {
  backgroundColor: "rgba(248, 250, 252, 0.96)",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  padding: "14px",
};

const summaryItemWhiteInDarkStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid rgba(226, 232, 240, 0.85)",
  borderRadius: "16px",
  padding: "14px",
  marginTop: "14px",
};

const summaryLabelStyle: CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#94a3b8",
  marginBottom: "6px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 700,
};

const summaryLabelDarkStyle: CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#94a3b8",
  marginBottom: "6px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 700,
};

const summaryValueLightStyle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontWeight: 800,
  lineHeight: 1.6,
  wordBreak: "break-word",
  fontSize: "14px",
};

const summaryValueDarkStyle: CSSProperties = {
  margin: 0,
  color: "#ffffff",
  fontWeight: 800,
  lineHeight: 1.6,
  wordBreak: "break-word",
  fontSize: "14px",
};

const emptySideBoxStyle: CSSProperties = {
  backgroundColor: "#f8fafc",
  border: "1px dashed #cbd5e1",
  borderRadius: "18px",
  padding: "18px",
  color: "#64748b",
  lineHeight: 1.7,
  fontSize: "14px",
};

const resultHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "18px",
};

const resultTagStyle: CSSProperties = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.1)",
  color: "#bfdbfe",
  fontSize: "12px",
  fontWeight: 800,
  border: "1px solid rgba(255,255,255,0.08)",
  marginBottom: "10px",
};

const resultTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "22px",
  fontWeight: 900,
  color: "#ffffff",
};

const resultStatusBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "10px 12px",
  borderRadius: "999px",
  border: "1px solid transparent",
  fontSize: "12px",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const resultInfoGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
  marginBottom: "14px",
};

const resultItemStyle: CSSProperties = {
  backgroundColor: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "16px",
  padding: "12px",
  color: "#ffffff",
};

const resultHighlightBoxStyle: CSSProperties = {
  marginTop: "14px",
  marginBottom: "14px",
  backgroundColor: "rgba(59, 130, 246, 0.16)",
  border: "1px solid rgba(147, 197, 253, 0.28)",
  borderRadius: "16px",
  padding: "12px 14px",
};

const highlightValueStyle: CSSProperties = {
  margin: 0,
  color: "#dbeafe",
  fontWeight: 900,
  lineHeight: 1.5,
  wordBreak: "break-word",
};

const inlineErrorBoxStyle: CSSProperties = {
  marginTop: "14px",
  marginBottom: "14px",
  backgroundColor: "rgba(127, 29, 29, 0.28)",
  border: "1px solid rgba(252, 165, 165, 0.25)",
  borderRadius: "16px",
  padding: "12px 14px",
};

const inlineErrorTitleStyle: CSSProperties = {
  display: "block",
  color: "#fecaca",
  marginBottom: "6px",
  fontSize: "13px",
  fontWeight: 800,
};

const inlineErrorTextStyle: CSSProperties = {
  margin: 0,
  color: "#fee2e2",
  lineHeight: 1.6,
  fontSize: "14px",
};

const resultPendingFilesStyle: CSSProperties = {
  borderRadius: "14px",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  background: "rgba(15, 23, 42, 0.55)",
  color: "#cbd5e1",
  padding: "12px 14px",
  fontSize: "13px",
  lineHeight: 1.5,
};

const downloadButtonsStyle: CSSProperties = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "14px",
};

const secondaryButtonStyle: CSSProperties = {
  backgroundColor: "rgba(255,255,255,0.12)",
  color: "#ffffff",
  border: "1px solid rgba(191, 219, 254, 0.22)",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "14px",
  fontWeight: 800,
  cursor: "pointer",
};

const successMessageStyle: CSSProperties = {
  marginTop: "16px",
  backgroundColor: "#ecfdf5",
  border: "1px solid #a7f3d0",
  color: "#065f46",
  borderRadius: "16px",
  padding: "12px 14px",
  fontSize: "14px",
  fontWeight: 700,
};

const warningMessageStyle: CSSProperties = {
  marginTop: "16px",
  backgroundColor: "#fffbeb",
  border: "1px solid #fcd34d",
  color: "#92400e",
  borderRadius: "16px",
  padding: "12px 14px",
  fontSize: "14px",
  fontWeight: 700,
};

const errorMessageStyle: CSSProperties = {
  marginTop: "16px",
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  borderRadius: "16px",
  padding: "12px 14px",
  fontSize: "14px",
  fontWeight: 700,
};
