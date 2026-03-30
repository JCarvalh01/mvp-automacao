"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getClientSession } from "@/lib/session";
import ProtectedPageLoader from "@/components/ProtectedPageLoader";

type ClienteSession = {
  id: number;
  name: string;
  email: string;
  cnpj: string;
  phone: string;
  address: string;
  password?: string | null;
  client_type?: string;
  mei_created_at?: string | null;
  is_active: boolean;
  partner_company_id: number | null;
};

type Invoice = {
  id: number;
  competency_date: string | null;
  service_value?: number | null;
  amount?: number | null;
  status?: string | null;
  pdf_url?: string | null;
  xml_url?: string | null;
  nfse_key?: string | null;
  created_at?: string | null;
  error_message?: string | null;
};

type FiltroStatus =
  | "todos"
  | "success"
  | "pending"
  | "processing"
  | "error"
  | "canceled";

function formatCurrency(value?: number | null) {
  const numero = Number(value || 0);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numero);
}

function formatDateBR(value?: string | null) {
  if (!value) return "-";

  const data = new Date(value);
  if (!Number.isNaN(data.getTime())) {
    return data.toLocaleDateString("pt-BR");
  }

  const partes = value.split("-");
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  return value;
}

function getAnoDaNota(nota: Invoice) {
  const base = nota.competency_date || nota.created_at;
  if (!base) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(base)) {
    return Number(base.slice(0, 4));
  }

  const data = new Date(base);
  if (!Number.isNaN(data.getTime())) {
    return data.getFullYear();
  }

  return null;
}

function getStatusMeta(status?: string | null, errorMessage?: string | null) {
  const valor = String(status || "").toLowerCase();
  const temMensagem = !!String(errorMessage || "").trim();

  if (valor === "success" && temMensagem) {
    return {
      label: "Emitida com aviso",
      bg: "rgba(59,130,246,0.12)",
      border: "1px solid rgba(59,130,246,0.22)",
      color: "#dbeafe",
      boxBg: "rgba(59,130,246,0.08)",
      boxBorder: "1px solid rgba(59,130,246,0.16)",
      boxColor: "#dbeafe",
      boxTitle: "Aviso desta emissão",
    };
  }

  if (valor === "success") {
    return {
      label: "Emitida",
      bg: "rgba(16,185,129,0.14)",
      border: "1px solid rgba(16,185,129,0.25)",
      color: "#bbf7d0",
      boxBg: "rgba(16,185,129,0.08)",
      boxBorder: "1px solid rgba(16,185,129,0.16)",
      boxColor: "#bbf7d0",
      boxTitle: "Emissão concluída",
    };
  }

  if (valor === "pending" || valor === "processing") {
    return {
      label: "Processando",
      bg: "rgba(245,158,11,0.14)",
      border: "1px solid rgba(245,158,11,0.25)",
      color: "#fde68a",
      boxBg: "rgba(245,158,11,0.08)",
      boxBorder: "1px solid rgba(245,158,11,0.16)",
      boxColor: "#fde68a",
      boxTitle: "Emissão em andamento",
    };
  }

  if (valor === "error") {
    return {
      label: "Erro",
      bg: "rgba(239,68,68,0.14)",
      border: "1px solid rgba(239,68,68,0.24)",
      color: "#fecaca",
      boxBg: "rgba(239,68,68,0.08)",
      boxBorder: "1px solid rgba(239,68,68,0.16)",
      boxColor: "#fecaca",
      boxTitle: "Falha na emissão",
    };
  }

  if (valor === "canceled") {
    return {
      label: "Cancelada",
      bg: "rgba(148,163,184,0.14)",
      border: "1px solid rgba(148,163,184,0.24)",
      color: "#cbd5e1",
      boxBg: "rgba(148,163,184,0.08)",
      boxBorder: "1px solid rgba(148,163,184,0.16)",
      boxColor: "#cbd5e1",
      boxTitle: "Emissão cancelada",
    };
  }

  return {
    label: status || "Sem status",
    bg: "rgba(59,130,246,0.12)",
    border: "1px solid rgba(59,130,246,0.22)",
    color: "#dbeafe",
    boxBg: "rgba(59,130,246,0.08)",
    boxBorder: "1px solid rgba(59,130,246,0.16)",
    boxColor: "#dbeafe",
    boxTitle: "Informação da nota",
  };
}

export default function MinhasNotasPage() {
  const [cliente, setCliente] = useState<ClienteSession | null>(null);
  const [notas, setNotas] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [erro, setErro] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [filtroAno, setFiltroAno] = useState<string>("todos");

  useEffect(() => {
    carregarNotas();
  }, []);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 768);
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function carregarNotas() {
    try {
      setLoading(true);
      setErro("");

      const session = getClientSession();

      if (!session?.id) {
        window.location.href = "/login";
        return;
      }

      setCliente(session);

      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("client_id", session.id)
        .order("created_at", { ascending: false });

      if (error) {
        setErro("Não foi possível carregar suas notas no momento.");
        setNotas([]);
        return;
      }

      setNotas(data || []);
    } catch (error) {
      console.log(error);
      setErro("Ocorreu um erro inesperado ao carregar suas notas.");
      setNotas([]);
    } finally {
      setLoading(false);
    }
  }

  function abrirArquivo(url: string | null, tipo: "PDF" | "XML") {
    if (!url) return;
    window.open(url, "_blank");
  }

  const anosDisponiveis = useMemo(() => {
    const anos = notas
      .map((nota) => getAnoDaNota(nota))
      .filter((ano): ano is number => ano !== null);

    return Array.from(new Set(anos)).sort((a, b) => b - a);
  }, [notas]);

  const notasPorAno = useMemo(() => {
    if (filtroAno === "todos") return notas;

    return notas.filter((nota) => String(getAnoDaNota(nota) || "") === filtroAno);
  }, [notas, filtroAno]);

  const notasFiltradas = useMemo(() => {
    if (filtroStatus === "todos") return notasPorAno;

    return notasPorAno.filter(
      (nota) => String(nota.status || "").toLowerCase() === filtroStatus
    );
  }, [notasPorAno, filtroStatus]);

  const resumo = useMemo(() => {
    const total = notasPorAno.length;

    const emitidas = notasPorAno.filter(
      (nota) => String(nota.status || "").toLowerCase() === "success"
    ).length;

    const faturamento = notasPorAno.reduce((acc, nota) => {
      const status = String(nota.status || "").toLowerCase();
      if (status !== "success") return acc;

      const valor = Number(nota.service_value ?? nota.amount ?? 0);
      return acc + (Number.isNaN(valor) ? 0 : valor);
    }, 0);

    const comErro = notasPorAno.filter(
      (nota) => String(nota.status || "").toLowerCase() === "error"
    ).length;

    return { total, emitidas, faturamento, comErro };
  }, [notasPorAno]);

  if (loading) {
    return <ProtectedPageLoader label="Carregando suas notas..." />;
  }

  return (
    <main
      style={{
        ...pageStyle,
        padding: isMobile ? "18px 12px 28px" : "24px 16px 40px",
      }}
    >
      <div style={glowOneStyle} />
      <div style={glowTwoStyle} />

      <div style={containerStyle}>
        <section
          style={{
            ...heroStyle,
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : "flex-start",
          }}
        >
          <div>
            <span style={brandPillStyle}>MVP_ AUTOMAÇÃO FISCAL</span>
            <h1
              style={{
                ...titleStyle,
                fontSize: isMobile ? "30px" : "36px",
              }}
            >
              Minhas notas
            </h1>
            <p style={subtitleStyle}>
              Consulte apenas as notas vinculadas ao seu cadastro e acompanhe o
              status de cada emissão com mais clareza.
            </p>
          </div>

          <div
            style={{
              ...heroButtonsStyle,
              width: isMobile ? "100%" : "auto",
              flexDirection: isMobile ? "column" : "row",
            }}
          >
            <Link href="/area-cliente" style={secondaryButtonStyle}>
              ← Voltar ao painel
            </Link>
            <Link href="/emitir-cliente" style={primaryButtonStyle}>
              Emitir nova nota
            </Link>
          </div>
        </section>

        <section
          style={{
            ...summaryGridStyle,
            gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))",
          }}
        >
          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Cliente</span>
            <strong style={summaryValueStyle}>{cliente?.name || "-"}</strong>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>
              Total de notas {filtroAno === "todos" ? "" : `(${filtroAno})`}
            </span>
            <strong style={summaryValueStyle}>{resumo.total}</strong>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>
              Faturamento {filtroAno === "todos" ? "total" : `de ${filtroAno}`}
            </span>
            <strong style={summaryValueStyle}>
              {formatCurrency(resumo.faturamento)}
            </strong>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>
              Notas com erro {filtroAno === "todos" ? "" : `(${filtroAno})`}
            </span>
            <strong style={summaryValueStyle}>{resumo.comErro}</strong>
          </div>
        </section>

        {erro ? (
          <section style={errorCardStyle}>
            <div>
              <h2 style={errorTitleStyle}>Não foi possível carregar suas notas</h2>
              <p style={errorTextStyle}>{erro}</p>
            </div>

            <button type="button" onClick={carregarNotas} style={retryButtonStyle}>
              Recarregar
            </button>
          </section>
        ) : null}

        <section style={panelStyle}>
          <div
            style={{
              ...panelHeaderStyle,
              flexDirection: isMobile ? "column" : "row",
              alignItems: isMobile ? "stretch" : "center",
            }}
          >
            <div>
              <h2 style={panelTitleStyle}>Histórico de emissões</h2>
              <p style={panelSubtitleStyle}>
                Total emitidas com sucesso
                {filtroAno === "todos" ? "" : ` em ${filtroAno}`}: {resumo.emitidas}
              </p>
            </div>

            <div
              style={{
                ...panelActionsStyle,
                width: isMobile ? "100%" : "auto",
                flexDirection: isMobile ? "column" : "row",
                alignItems: isMobile ? "stretch" : "center",
              }}
            >
              <select
                value={filtroAno}
                onChange={(e) => setFiltroAno(e.target.value)}
                style={selectStyle}
              >
                <option value="todos">Todos os anos</option>
                {anosDisponiveis.map((ano) => (
                  <option key={ano} value={String(ano)}>
                    {ano}
                  </option>
                ))}
              </select>

              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value as FiltroStatus)}
                style={selectStyle}
              >
                <option value="todos">Todos os status</option>
                <option value="success">Emitidas</option>
                <option value="pending">Pendentes</option>
                <option value="processing">Processando</option>
                <option value="error">Com erro</option>
                <option value="canceled">Canceladas</option>
              </select>

              <div style={counterStyle}>
                {notasFiltradas.length} registro
                {notasFiltradas.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>

          {notasFiltradas.length === 0 ? (
            <div style={emptyWrapperStyle}>
              <div style={emptyStyle}>
                <h3 style={emptyTitleStyle}>Nenhuma nota encontrada</h3>
                <p style={emptyTextStyle}>
                  {notas.length === 0
                    ? "Você ainda não possui notas emitidas no sistema."
                    : "Nenhuma nota corresponde aos filtros selecionados."}
                </p>

                <div
                  style={{
                    ...emptyButtonsStyle,
                    flexDirection: isMobile ? "column" : "row",
                  }}
                >
                  <Link href="/emitir-cliente" style={primaryButtonStyle}>
                    Emitir primeira nota
                  </Link>

                  <Link href="/area-cliente" style={secondaryButtonStyle}>
                    Voltar ao painel
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div style={listStyle}>
              {notasFiltradas.map((nota) => {
                const statusMeta = getStatusMeta(nota.status, nota.error_message);
                const pdfDisponivel = !!nota.pdf_url;
                const xmlDisponivel = !!nota.xml_url;
                const temMensagem = !!String(nota.error_message || "").trim();

                return (
                  <div
                    key={nota.id}
                    style={{
                      ...noteCardStyle,
                      gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
                    }}
                  >
                    <div style={noteMainStyle}>
                      <div
                        style={{
                          ...noteTopStyle,
                          flexDirection: isMobile ? "column" : "row",
                          alignItems: isMobile ? "stretch" : "flex-start",
                        }}
                      >
                        <div>
                          <strong style={noteTitleStyle}>Nota #{nota.id}</strong>
                          <div style={noteTextStyle}>
                            Competência: {formatDateBR(nota.competency_date)}
                          </div>
                          <div style={noteTextStyle}>
                            Criada em: {formatDateBR(nota.created_at)}
                          </div>
                        </div>

                        <span
                          style={{
                            ...statusBadgeStyle,
                            background: statusMeta.bg,
                            border: statusMeta.border,
                            color: statusMeta.color,
                            width: isMobile ? "100%" : "fit-content",
                          }}
                        >
                          {statusMeta.label}
                        </span>
                      </div>

                      <div
                        style={{
                          ...noteInfoGridStyle,
                          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                        }}
                      >
                        <div style={noteInfoBoxStyle}>
                          <span style={noteInfoLabelStyle}>Valor</span>
                          <strong style={noteInfoValueStyle}>
                            {formatCurrency(nota.service_value ?? nota.amount ?? 0)}
                          </strong>
                        </div>

                        <div style={noteInfoBoxStyle}>
                          <span style={noteInfoLabelStyle}>Chave NFS-e</span>
                          <strong style={noteInfoValueStyle}>
                            {nota.nfse_key || "Aguardando"}
                          </strong>
                        </div>
                      </div>

                      {temMensagem ? (
                        <div
                          style={{
                            ...noteMessageBoxStyle,
                            background: statusMeta.boxBg,
                            border: statusMeta.boxBorder,
                            color: statusMeta.boxColor,
                          }}
                        >
                          <span style={noteMessageTitleStyle}>
                            {statusMeta.boxTitle}
                          </span>
                          <p style={noteMessageTextStyle}>
                            {nota.error_message}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div
                      style={{
                        ...actionsStyle,
                        width: isMobile ? "100%" : "auto",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => abrirArquivo(nota.pdf_url || null, "PDF")}
                        style={{
                          ...(pdfDisponivel
                            ? fileButtonPrimaryStyle
                            : fileButtonDisabledStyle),
                          width: isMobile ? "100%" : "92px",
                        }}
                        disabled={!pdfDisponivel}
                        title={pdfDisponivel ? "Abrir PDF" : "PDF ainda não disponível"}
                      >
                        PDF
                      </button>

                      <button
                        type="button"
                        onClick={() => abrirArquivo(nota.xml_url || null, "XML")}
                        style={{
                          ...(xmlDisponivel
                            ? fileButtonSecondaryStyle
                            : fileButtonDisabledStyle),
                          width: isMobile ? "100%" : "92px",
                        }}
                        disabled={!xmlDisponivel}
                        title={xmlDisponivel ? "Abrir XML" : "XML ainda não disponível"}
                      >
                        XML
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  position: "relative",
  overflow: "hidden",
  background:
    "linear-gradient(135deg, #020617 0%, #071427 35%, #0b1730 68%, #041225 100%)",
  fontFamily: "Arial, sans-serif",
  color: "#f8fafc",
};

const glowOneStyle: React.CSSProperties = {
  position: "absolute",
  top: "-100px",
  left: "-80px",
  width: "280px",
  height: "280px",
  borderRadius: "50%",
  background: "rgba(37, 99, 235, 0.16)",
  filter: "blur(90px)",
  pointerEvents: "none",
};

const glowTwoStyle: React.CSSProperties = {
  position: "absolute",
  right: "-100px",
  bottom: "-100px",
  width: "280px",
  height: "280px",
  borderRadius: "50%",
  background: "rgba(59, 130, 246, 0.12)",
  filter: "blur(90px)",
  pointerEvents: "none",
};

const containerStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  width: "100%",
  maxWidth: "1180px",
  margin: "0 auto",
};

const heroStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(2,6,23,0.84) 0%, rgba(15,23,42,0.94) 100%)",
  border: "1px solid rgba(59, 130, 246, 0.16)",
  borderRadius: "26px",
  padding: "22px",
  boxShadow: "0 24px 60px rgba(0,0,0,0.34)",
  marginBottom: "16px",
  display: "flex",
  justifyContent: "space-between",
  gap: "18px",
};

const brandPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 14px",
  borderRadius: "999px",
  background: "rgba(59, 130, 246, 0.14)",
  border: "1px solid rgba(59, 130, 246, 0.22)",
  color: "#bfdbfe",
  fontSize: "12px",
  fontWeight: 700,
  marginBottom: "12px",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontWeight: 800,
  color: "#ffffff",
  lineHeight: 1.1,
};

const subtitleStyle: React.CSSProperties = {
  margin: "10px 0 0 0",
  color: "#cbd5e1",
  fontSize: "15px",
  lineHeight: 1.7,
};

const heroButtonsStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "12px 16px",
  borderRadius: "14px",
  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  color: "#ffffff",
  fontWeight: 800,
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "12px 16px",
  borderRadius: "14px",
  backgroundColor: "rgba(15, 23, 42, 0.90)",
  color: "#ffffff",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  fontWeight: 700,
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
  marginBottom: "16px",
};

const summaryCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.88) 0%, rgba(15,23,42,0.92) 100%)",
  border: "1px solid rgba(59, 130, 246, 0.12)",
  borderRadius: "18px",
  padding: "16px",
  boxShadow: "0 14px 34px rgba(0,0,0,0.20)",
};

const summaryLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#93c5fd",
  marginBottom: "6px",
  fontWeight: 700,
};

const summaryValueStyle: React.CSSProperties = {
  display: "block",
  fontSize: "18px",
  color: "#ffffff",
  fontWeight: 800,
  wordBreak: "break-word",
};

const errorCardStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  background: "rgba(239,68,68,0.12)",
  border: "1px solid rgba(239,68,68,0.24)",
  borderRadius: "18px",
  padding: "16px",
  marginBottom: "16px",
};

const errorTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "18px",
  fontWeight: 800,
  color: "#ffffff",
};

const errorTextStyle: React.CSSProperties = {
  margin: "8px 0 0 0",
  color: "#fecaca",
  fontSize: "14px",
  lineHeight: 1.6,
};

const retryButtonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: "12px",
  padding: "12px 16px",
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
};

const panelStyle: React.CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.88) 0%, rgba(15,23,42,0.92) 100%)",
  border: "1px solid rgba(59, 130, 246, 0.12)",
  borderRadius: "24px",
  padding: "20px",
  boxShadow: "0 20px 48px rgba(0,0,0,0.24)",
};

const panelHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  flexWrap: "wrap",
  marginBottom: "16px",
};

const panelActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const panelTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 800,
  color: "#ffffff",
};

const panelSubtitleStyle: React.CSSProperties = {
  margin: "8px 0 0 0",
  fontSize: "14px",
  color: "#94a3b8",
  lineHeight: 1.6,
};

const selectStyle: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.94)",
  border: "1px solid rgba(59,130,246,0.18)",
  borderRadius: "12px",
  color: "#ffffff",
  padding: "10px 14px",
  outline: "none",
  fontSize: "14px",
};

const counterStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 14px",
  borderRadius: "999px",
  background: "rgba(59,130,246,0.12)",
  border: "1px solid rgba(59,130,246,0.20)",
  color: "#dbeafe",
  fontWeight: 700,
};

const emptyWrapperStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
};

const emptyStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "18px",
  padding: "24px",
  background: "rgba(15, 23, 42, 0.94)",
  border: "1px solid rgba(59, 130, 246, 0.10)",
  color: "#cbd5e1",
};

const emptyTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "22px",
  fontWeight: 800,
  color: "#ffffff",
};

const emptyTextStyle: React.CSSProperties = {
  margin: "10px 0 0 0",
  color: "#cbd5e1",
  fontSize: "14px",
  lineHeight: 1.7,
};

const emptyButtonsStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  marginTop: "18px",
};

const listStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const noteCardStyle: React.CSSProperties = {
  display: "grid",
  gap: "16px",
  background:
    "linear-gradient(180deg, rgba(15,23,42,0.88) 0%, rgba(2,6,23,0.92) 100%)",
  border: "1px solid rgba(59,130,246,0.10)",
  borderRadius: "18px",
  padding: "18px",
};

const noteMainStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const noteTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
};

const noteTitleStyle: React.CSSProperties = {
  fontSize: "18px",
  color: "#ffffff",
  fontWeight: 800,
};

const noteTextStyle: React.CSSProperties = {
  marginTop: "6px",
  color: "#94a3b8",
  fontSize: "13px",
};

const statusBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
};

const noteInfoGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
};

const noteInfoBoxStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(59,130,246,0.08)",
  borderRadius: "14px",
  padding: "14px",
};

const noteInfoLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#93c5fd",
  marginBottom: "6px",
  fontWeight: 700,
};

const noteInfoValueStyle: React.CSSProperties = {
  display: "block",
  fontSize: "14px",
  color: "#ffffff",
  fontWeight: 700,
  wordBreak: "break-word",
};

const noteMessageBoxStyle: React.CSSProperties = {
  borderRadius: "14px",
  padding: "14px",
};

const noteMessageTitleStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 800,
  marginBottom: "6px",
};

const noteMessageTextStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "13px",
  lineHeight: 1.6,
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const fileButtonPrimaryStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: "#ffffff",
  border: "1px solid rgba(59,130,246,0.35)",
  borderRadius: "12px",
  padding: "12px 16px",
  fontWeight: 800,
  cursor: "pointer",
};

const fileButtonSecondaryStyle: React.CSSProperties = {
  backgroundColor: "rgba(59,130,246,0.14)",
  color: "#dbeafe",
  border: "1px solid rgba(59,130,246,0.28)",
  borderRadius: "12px",
  padding: "12px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

const fileButtonDisabledStyle: React.CSSProperties = {
  backgroundColor: "rgba(148,163,184,0.10)",
  color: "#94a3b8",
  border: "1px solid rgba(148,163,184,0.18)",
  borderRadius: "12px",
  padding: "12px 16px",
  fontWeight: 700,
  cursor: "not-allowed",
  opacity: 0.75,
};