"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ProtectedPageLoader from "@/components/ProtectedPageLoader";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { getClientSession } from "@/lib/session";

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
  client_type?: string | null;
  mei_created_at?: string | null;
  is_active: boolean;
  partner_company_id: number | null;
  plan_type?: string | null;
  notes_limit?: number | null;
  is_blocked?: boolean | null;
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

function notaFoiGerada(status?: string | null) {
  const valor = String(status || "").toLowerCase();
  return valor.includes("success") || valor.includes("sucesso");
}

function getStatusMeta(status?: string | null) {
  const valor = String(status || "").toLowerCase();

  if (valor.includes("success") || valor.includes("sucesso")) {
    return {
      label: "Emitida com sucesso",
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

function getPlanoTexto(cliente: Cliente | null) {
  if (!cliente || cliente.partner_company_id) {
    return {
      titulo: "Plano liberado pela empresa",
      subtitulo: "A emissão é controlada pela empresa responsável pelo seu acesso.",
    };
  }

  const plano = String(cliente.plan_type || "").trim().toLowerCase();

  if (plano === "essencial") {
    return {
      titulo: "Plano Essencial",
      subtitulo: "Limite mensal controlado automaticamente pelo sistema.",
    };
  }

  if (plano === "full") {
    return {
      titulo: "Plano Full",
      subtitulo: "Plano com emissão ampliada para sua operação.",
    };
  }

  return {
    titulo: "Sem plano",
    subtitulo: "Escolha um plano para liberar a emissão de notas.",
  };
}

export default function EmitirClientePage() {
  const router = useRouter();
  const { loading: loadingAccess, authorized } = useProtectedRoute(["client"]);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [acompanhandoNota, setAcompanhandoNota] = useState(false);

  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<"sucesso" | "erro" | "aviso" | "">("");

  const [ultimaNota, setUltimaNota] = useState<UltimaNota | null>(null);

  const [competencyDate, setCompetencyDate] = useState(getTodayLocalDate());
  const [serviceTaker, setServiceTaker] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [serviceCity, setServiceCity] = useState("São Paulo - SP");
  const [serviceValue, setServiceValue] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");

  useEffect(() => {
    if (!loadingAccess && authorized) {
      carregarDados();
    }
  }, [loadingAccess, authorized]);

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

      const clienteSessao = getClientSession();

      if (!clienteSessao?.id) {
        setMensagem("Cliente não encontrado na sessão.");
        setTipoMensagem("erro");
        setLoading(false);
        return;
      }

      const { data: clienteData, error: clienteError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clienteSessao.id)
        .single();

      if (clienteError || !clienteData) {
        console.log("Erro ao buscar cliente:", clienteError);
        setMensagem("Cliente não encontrado.");
        setTipoMensagem("erro");
        setLoading(false);
        return;
      }

      setCliente(clienteData as Cliente);

      if (!clienteData.partner_company_id) {
        setEmpresa(null);
        setLoading(false);
        return;
      }

      const { data: empresaData, error: empresaError } = await supabase
        .from("partner_companies")
        .select("*")
        .eq("id", clienteData.partner_company_id)
        .single();

      if (empresaError || !empresaData) {
        console.log("Erro ao buscar empresa:", empresaError);
        setMensagem("Empresa parceira não encontrada.");
        setTipoMensagem("erro");
        setLoading(false);
        return;
      }

      setEmpresa(empresaData as Empresa);
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

        const statusAtual = String(data.status || "").toLowerCase();

        if (statusAtual === "success" && (data.pdf_url || data.xml_url)) {
          pararAcompanhamento();
          setMensagem("Nota emitida com sucesso!");
          setTipoMensagem("sucesso");
          return;
        }

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

  const statusMeta = getStatusMeta(ultimaNota?.status);
  const notaGerada = notaFoiGerada(ultimaNota?.status);
  const podeAbrirPdf = Boolean(notaGerada && ultimaNota?.pdf_url);
  const podeAbrirXml = Boolean(notaGerada && ultimaNota?.xml_url);
  const exibindoProcessamento = salvando || acompanhandoNota;
  const clienteDireto = Boolean(cliente && !cliente.partner_company_id);
  const planoInfo = getPlanoTexto(cliente);

  function validarBloqueioPlano() {
    if (!cliente) return false;

    if (cliente.partner_company_id) {
      return true;
    }

    if (!cliente.plan_type) {
      setMensagem("Escolha um plano antes de emitir notas.");
      setTipoMensagem("aviso");
      setTimeout(() => {
        router.push("/planos");
      }, 1200);
      return false;
    }

    if (cliente.is_blocked) {
      setMensagem("Seu acesso está bloqueado.");
      setTipoMensagem("erro");
      return false;
    }

    return true;
  }

  function validarFormulario() {
    if (!cliente) {
      setMensagem("Cliente não encontrado.");
      setTipoMensagem("erro");
      return false;
    }

    if (!cliente.is_active) {
      setMensagem("Seu acesso está inativo.");
      setTipoMensagem("erro");
      return false;
    }

    if (!validarBloqueioPlano()) {
      return false;
    }

    if (!limparDocumento(cliente.cnpj)) {
      setMensagem("O CNPJ do cliente não foi encontrado.");
      setTipoMensagem("erro");
      return false;
    }

    if (!String(cliente.password || "").trim()) {
      setMensagem("Sua senha do Emissor Nacional não está cadastrada.");
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
    if (!ultimaNota) return;

    if (!notaFoiGerada(ultimaNota.status) || !ultimaNota.pdf_url) {
      alert("PDF ainda não disponível. Aguarde a conclusão da emissão da nota.");
      return;
    }

    window.open(ultimaNota.pdf_url, "_blank");
  }

  function baixarXML() {
    if (!ultimaNota) return;

    if (!notaFoiGerada(ultimaNota.status) || !ultimaNota.xml_url) {
      alert("XML ainda não disponível. Aguarde a conclusão da emissão da nota.");
      return;
    }

    window.open(ultimaNota.xml_url, "_blank");
  }

  async function emitirNota() {
    if (salvando || acompanhandoNota) return;

    setMensagem("");
    setTipoMensagem("");

    if (!validarFormulario()) return;
    if (!cliente) return;

    try {
      setSalvando(true);

      const descricaoFinal = serviceDescription.trim();
      const valorFinal = parseValorMonetario(serviceValue);
      const tomadorFinal = limparDocumento(serviceTaker.trim());

      const payload = {
        client_id: cliente.id,
        partner_company_id: empresa?.id ?? null,
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

      const respostaAutomacao = await fetch("/api/emitir-nota", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoiceId: data.id,
          clientId: cliente.id,
          partnerCompanyId: empresa?.id ?? null,
          competencyDate,
          tomadorDocumento: tomadorFinal,
          taxCode: taxCode.trim(),
          serviceCity: serviceCity.trim(),
          serviceValue: valorFinal,
          serviceDescription: descricaoFinal,
          cancelKey: String(data.id),
        }),
      });

      const resultadoAutomacao: ApiEmitirResponse = await respostaAutomacao.json();

      if (!respostaAutomacao.ok || !resultadoAutomacao.success) {
        const notaEmitidaComErro: UltimaNota = {
          id: data.id,
          competency_date: competencyDate,
          service_taker: tomadorFinal,
          tax_code: taxCode.trim(),
          service_city: serviceCity.trim(),
          service_value: valorFinal,
          service_description: descricaoFinal,
          pdf_url: resultadoAutomacao.invoice?.pdf_url || null,
          xml_url: resultadoAutomacao.invoice?.xml_url || null,
          nfse_key: resultadoAutomacao.invoice?.nfse_key || null,
          status: resultadoAutomacao.invoice?.status || "error",
          error_message:
            resultadoAutomacao.invoice?.error_message ||
            resultadoAutomacao.message ||
            resultadoAutomacao.error ||
            "Erro na automação.",
        };

        setUltimaNota(notaEmitidaComErro);
        setMensagem(
          resultadoAutomacao.message ||
            resultadoAutomacao.error ||
            "Não foi possível concluir a emissão."
        );
        setTipoMensagem(resultadoAutomacao.canceled ? "aviso" : "erro");
        setSalvando(false);
        return;
      }

      const statusRetorno =
        resultadoAutomacao.invoice?.status ||
        resultadoAutomacao.status ||
        "queued";

      const notaEmitida: UltimaNota = {
        id: resultadoAutomacao.invoice?.id || data.id,
        competency_date: competencyDate,
        service_taker: tomadorFinal,
        tax_code: taxCode.trim(),
        service_city: serviceCity.trim(),
        service_value: valorFinal,
        service_description: descricaoFinal,
        pdf_url: resultadoAutomacao.invoice?.pdf_url || resultadoAutomacao.pdfUrl || null,
        xml_url: resultadoAutomacao.invoice?.xml_url || resultadoAutomacao.xmlUrl || null,
        nfse_key: resultadoAutomacao.invoice?.nfse_key || resultadoAutomacao.nfseKey || null,
        status: statusRetorno,
        error_message: resultadoAutomacao.invoice?.error_message || null,
      };

      setUltimaNota(notaEmitida);

      if (
        statusRetorno === "queued" ||
        statusRetorno === "pending" ||
        statusRetorno === "processing"
      ) {
        setMensagem("Emitindo nota fiscal... aguarde a conclusão.");
        setTipoMensagem("aviso");
        resetarFormularioAposEnvio();
        await iniciarAcompanhamentoNota(resultadoAutomacao.invoice?.id || data.id, notaEmitida);
        return;
      }

      if (notaEmitida.error_message) {
        setMensagem("Nota emitida, mas houve um aviso no processamento.");
        setTipoMensagem("aviso");
      } else {
        setMensagem("Nota emitida com sucesso!");
        setTipoMensagem("sucesso");
      }

      resetarFormularioAposEnvio();
    } catch (error) {
      console.log(error);
      setMensagem("Erro inesperado ao emitir a nota.");
      setTipoMensagem("erro");
    } finally {
      if (!acompanhandoNota) {
        setSalvando(false);
      }
    }
  }

  if (loadingAccess) {
    return <ProtectedPageLoader label="Validando acesso do cliente..." />;
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="page-shell-responsive" style={pageShellStyle}>
      <div style={pageWrapStyle}>
        <div style={backgroundGlowTopStyle} />
        <div style={backgroundGlowBottomStyle} />

        <div style={containerStyle}>
          <section className="hero-card-responsive" style={heroCardStyle}>
            <div style={heroContentStyle}>
              <span style={heroTagStyle}>Área do cliente</span>
              <h2 className="hero-title-responsive" style={heroTitleStyle}>Emitir nota fiscal</h2>
              <p style={heroTextStyle}>
                Preencha os dados da prestação e acompanhe a emissão da sua nota na própria tela,
                com liberação do PDF e XML somente após a conclusão.
              </p>

              <div className="hero-pills-responsive" style={heroPillsStyle}>
                <span style={heroPillStyle}>Emissão segura</span>
                <span style={heroPillStyle}>PDF e XML</span>
                <span style={heroPillStyle}>Padrão MVP</span>
              </div>
            </div>

            <div style={heroInfoCardStyle}>
              <span style={heroInfoLabelStyle}>Cliente logado</span>
              <strong style={heroInfoValueStyle}>{cliente?.name || "Carregando..."}</strong>
              <span style={heroInfoSubStyle}>
                {cliente?.cnpj ? formatarDocumento(cliente.cnpj) : "CNPJ não disponível"}
              </span>

              {clienteDireto && (
                <div style={planInfoBoxStyle}>
                  <span style={planInfoLabelStyle}>Plano atual</span>
                  <strong style={planInfoValueStyle}>{planoInfo.titulo}</strong>
                  <span style={planInfoSubStyle}>{planoInfo.subtitulo}</span>

                  <Link href="/planos" style={planLinkStyle}>
                    Ver planos
                  </Link>
                </div>
              )}
            </div>
          </section>

          <div className="nav-responsive" style={topNavigationStyle}>
            <Link href="/area-cliente" style={navButtonStyle}>
              Voltar ao painel
            </Link>
            <Link href="/minhas-notas" style={navDarkButtonStyle}>
              Minhas notas
            </Link>
            {clienteDireto && (
              <Link href="/planos" style={navGreenButtonStyle}>
                Ver planos
              </Link>
            )}
          </div>

          <section className="main-grid-responsive" style={mainGridStyle}>
            <div className="form-card-responsive" style={formCardStyle}>
              <div style={cardHeaderStyle}>
                <div>
                  <h3 className="card-title-responsive" style={cardTitleStyle}>Dados da nota</h3>
                  <p style={cardTextStyle}>
                    Informe os dados da prestação para emitir sua NFS-e com segurança.
                  </p>
                </div>
              </div>

              {loading ? (
                <div style={loadingBoxStyle}>Carregando dados do cliente...</div>
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

                  <div className="grid-responsive" style={gridStyle}>
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
                      <label style={labelStyle}>Tomador do serviço</label>
                      <input
                        value={serviceTaker}
                        onChange={(e) => setServiceTaker(formatarDocumento(e.target.value))}
                        placeholder="CPF/CNPJ do tomador"
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

                    <div style={fieldStyle}>
                      <label style={labelStyle}>Dados do emitente</label>
                      <div style={infoInputStyle}>
                        {cliente?.name || "Emitente não identificado"}
                      </div>
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
                    Esta área é exclusiva para <strong>emissão da própria nota fiscal</strong>.
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
              <div className="side-card-responsive" style={sideCardStyle}>
                <div style={cardHeaderSimpleStyle}>
                  <h3 className="side-title-responsive" style={sideTitleStyle}>Resumo do cliente</h3>
                  <p style={sideTextStyle}>
                    Confira seus dados e a empresa parceira vinculada ao seu acesso.
                  </p>
                </div>

                <div style={clientSummaryStyle}>
                  <div style={summaryItemLightStyle}>
                    <span style={summaryLabelStyle}>Nome</span>
                    <p style={summaryValueLightStyle}>{cliente?.name || "Não informado"}</p>
                  </div>

                  <div style={summaryItemLightStyle}>
                    <span style={summaryLabelStyle}>CNPJ</span>
                    <p style={summaryValueLightStyle}>
                      {cliente?.cnpj ? formatarDocumento(cliente.cnpj) : "Não informado"}
                    </p>
                  </div>

                  <div style={summaryItemLightStyle}>
                    <span style={summaryLabelStyle}>Email</span>
                    <p style={summaryValueLightStyle}>{cliente?.email || "Não informado"}</p>
                  </div>

                  <div style={summaryItemLightStyle}>
                    <span style={summaryLabelStyle}>Telefone</span>
                    <p style={summaryValueLightStyle}>{cliente?.phone || "Não informado"}</p>
                  </div>

                  <div style={summaryItemLightStyle}>
                    <span style={summaryLabelStyle}>Empresa parceira</span>
                    <p style={summaryValueLightStyle}>
                      {empresa?.name || "Cliente direto da MVP"}
                    </p>
                  </div>

                  {clienteDireto && (
                    <>
                      <div style={summaryItemLightStyle}>
                        <span style={summaryLabelStyle}>Plano</span>
                        <p style={summaryValueLightStyle}>{planoInfo.titulo}</p>
                      </div>

                      <div style={summaryItemLightStyle}>
                        <span style={summaryLabelStyle}>Status</span>
                        <p style={summaryValueLightStyle}>
                          {cliente?.is_blocked ? "Bloqueado" : "Ativo"}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {ultimaNota && (
                <div className="result-card-responsive" style={resultCardStyle}>
                  <div style={resultHeaderStyle}>
                    <div>
                      <span style={resultTagStyle}>Última emissão</span>
                      <h3 className="result-title-responsive" style={resultTitleStyle}>Resultado da emissão</h3>
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

                  <div className="result-grid-responsive" style={resultInfoGridStyle}>
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

                  <div className="download-buttons-responsive" style={downloadButtonsStyle}>
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

                    <Link href="/minhas-notas" style={notesLinkButtonStyle}>
                      Ver minhas notas
                    </Link>
                  </div>

                  {!notaGerada && (
                    <div style={resultPendingFilesStyle}>
                      Os arquivos serão liberados somente após a nota ser gerada.
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 1024px) {
          .main-grid-responsive {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 768px) {
          .page-shell-responsive {
            padding: 16px 12px 32px !important;
          }

          .hero-card-responsive,
          .form-card-responsive,
          .side-card-responsive,
          .result-card-responsive {
            border-radius: 22px !important;
            padding: 18px !important;
          }

          .hero-title-responsive {
            font-size: 24px !important;
          }

          .card-title-responsive,
          .side-title-responsive,
          .result-title-responsive {
            font-size: 20px !important;
          }

          .grid-responsive {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }

          .result-grid-responsive {
            grid-template-columns: 1fr !important;
          }

          .nav-responsive,
          .hero-pills-responsive,
          .download-buttons-responsive {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .nav-responsive a,
          .download-buttons-responsive a,
          .download-buttons-responsive button {
            width: 100% !important;
            justify-content: center !important;
          }
        }
      `}</style>
    </div>
  );
}

const pageShellStyle: CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, rgba(37,99,235,0.14), transparent 30%), linear-gradient(180deg, #020617 0%, #0f172a 48%, #020617 100%)",
  padding: "24px 16px 40px",
};

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

const topNavigationStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "18px",
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
  marginBottom: "18px",
  boxShadow: "0 24px 70px rgba(15, 23, 42, 0.28)",
  flexWrap: "wrap",
  border: "1px solid rgba(255,255,255,0.08)",
};

const heroContentStyle: CSSProperties = {
  flex: 1,
  minWidth: "280px",
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
  flex: 1,
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
  wordBreak: "break-word",
};

const heroInfoSubStyle: CSSProperties = {
  marginTop: "8px",
  color: "#dbeafe",
  fontSize: "13px",
};

const planInfoBoxStyle: CSSProperties = {
  marginTop: "16px",
  padding: "14px",
  borderRadius: "16px",
  backgroundColor: "rgba(255,255,255,0.10)",
  border: "1px solid rgba(255,255,255,0.10)",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const planInfoLabelStyle: CSSProperties = {
  fontSize: "11px",
  color: "#bfdbfe",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: 800,
};

const planInfoValueStyle: CSSProperties = {
  fontSize: "18px",
  fontWeight: 900,
  color: "#ffffff",
};

const planInfoSubStyle: CSSProperties = {
  fontSize: "13px",
  color: "#dbeafe",
  lineHeight: 1.5,
};

const planLinkStyle: CSSProperties = {
  marginTop: "8px",
  textDecoration: "none",
  backgroundColor: "#22c55e",
  color: "#ffffff",
  borderRadius: "12px",
  padding: "10px 12px",
  fontSize: "13px",
  fontWeight: 800,
  textAlign: "center",
};

const mainGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.7fr) minmax(0, 0.95fr)",
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
  minWidth: 0,
};

const rightColumnStyle: CSSProperties = {
  display: "grid",
  gap: "20px",
  minWidth: 0,
};

const sideCardStyle: CSSProperties = {
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
  border: "1px solid #dbe7f5",
  borderRadius: "28px",
  padding: "24px",
  boxShadow: "0 18px 50px rgba(15, 23, 42, 0.08)",
  minWidth: 0,
};

const resultCardStyle: CSSProperties = {
  background: "linear-gradient(180deg, #0f172a 0%, #172554 100%)",
  border: "1px solid rgba(191, 219, 254, 0.18)",
  borderRadius: "28px",
  padding: "24px",
  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.22)",
  color: "#ffffff",
  minWidth: 0,
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

const navButtonStyle: CSSProperties = {
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

const navDarkButtonStyle: CSSProperties = {
  textDecoration: "none",
  backgroundColor: "#0f172a",
  color: "#ffffff",
  border: "1px solid #0f172a",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "14px",
  fontWeight: 800,
  display: "inline-flex",
  alignItems: "center",
};

const navGreenButtonStyle: CSSProperties = {
  textDecoration: "none",
  backgroundColor: "#22c55e",
  color: "#ffffff",
  border: "1px solid #22c55e",
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
  minWidth: 0,
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

const infoInputStyle: CSSProperties = {
  width: "100%",
  minHeight: "52px",
  borderRadius: "16px",
  border: "1px solid #cbd5e1",
  padding: "14px 15px",
  fontSize: "14px",
  backgroundColor: "#f8fafc",
  color: "#0f172a",
  boxSizing: "border-box",
  boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.03)",
  display: "flex",
  alignItems: "center",
  fontWeight: 700,
  wordBreak: "break-word",
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
  minWidth: 0,
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

const notesLinkButtonStyle: CSSProperties = {
  textDecoration: "none",
  backgroundColor: "#ffffff",
  color: "#0f172a",
  border: "1px solid #ffffff",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "14px",
  fontWeight: 800,
  display: "inline-flex",
  alignItems: "center",
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