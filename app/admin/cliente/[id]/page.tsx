"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import ProtectedPageLoader from "@/components/ProtectedPageLoader";

type Cliente = {
  id: number;
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_mei: boolean | null;
  is_active: boolean | null;
  partner_company_id: number | null;
  mei_created_at?: string | null;
};

type Empresa = {
  id: number;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  payment_status?: string | null;
  is_blocked?: boolean | null;
  clients_limit?: number | null;
  price_per_client?: number | null;
  base_price?: number | null;
};

type Nota = {
  id: number;
  created_at: string | null;
  competency_date: string | null;
  service_value: number | string | null;
  status: string | null;
  error_message?: string | null;
  nfse_key?: string | null;
};

function formatarCnpj(valor?: string | null) {
  if (!valor) return "Não informado";

  const numeros = valor.replace(/\D/g, "");
  if (numeros.length !== 14) return valor;

  return numeros.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

function formatarData(valor?: string | null) {
  if (!valor) return "Não informado";

  const data = new Date(valor);
  if (!Number.isNaN(data.getTime())) {
    return data.toLocaleDateString("pt-BR");
  }

  const partes = valor.split("-");
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  return valor;
}

function formatarMoeda(valor?: number | string | null) {
  const numero =
    typeof valor === "number"
      ? valor
      : Number(String(valor || 0).replace(",", "."));

  return Number(numero || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
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
    };
  }

  if (valor === "success") {
    return {
      label: "Emitida",
      bg: "rgba(16,185,129,0.14)",
      border: "1px solid rgba(16,185,129,0.25)",
      color: "#bbf7d0",
    };
  }

  if (valor === "pending") {
    return {
      label: "Pendente",
      bg: "rgba(245,158,11,0.14)",
      border: "1px solid rgba(245,158,11,0.25)",
      color: "#fde68a",
    };
  }

  if (valor === "processing") {
    return {
      label: "Processando",
      bg: "rgba(59,130,246,0.12)",
      border: "1px solid rgba(59,130,246,0.22)",
      color: "#dbeafe",
    };
  }

  if (valor === "error") {
    return {
      label: "Erro",
      bg: "rgba(239,68,68,0.14)",
      border: "1px solid rgba(239,68,68,0.24)",
      color: "#fecaca",
    };
  }

  if (valor === "canceled") {
    return {
      label: "Cancelada",
      bg: "rgba(148,163,184,0.14)",
      border: "1px solid rgba(148,163,184,0.24)",
      color: "#cbd5e1",
    };
  }

  return {
    label: status || "Sem status",
    bg: "rgba(59,130,246,0.12)",
    border: "1px solid rgba(59,130,246,0.22)",
    color: "#dbeafe",
  };
}

export default function AdminClienteDetalhePage() {
  const router = useRouter();
  const params = useParams();
  const { isLoading: loadingAccess, isAuthorized: authorized } =
    useProtectedRoute();

  const clienteId = Number(params?.id);

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    if (authorized) {
      carregarPagina();
    }
  }, [authorized, clienteId]);

  async function carregarPagina() {
    try {
      setLoading(true);
      setMensagem("");

      if (!clienteId || Number.isNaN(clienteId)) {
        setMensagem("Cliente inválido.");
        setLoading(false);
        return;
      }

      const { data: clienteData, error: clienteError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clienteId)
        .single();

      if (clienteError || !clienteData) {
        console.log("Erro ao buscar cliente:", clienteError);
        setMensagem("Cliente não encontrado.");
        setLoading(false);
        return;
      }

      const clienteAtual = clienteData as Cliente;
      setCliente(clienteAtual);

      if (clienteAtual.partner_company_id) {
        const { data: empresaData, error: empresaError } = await supabase
          .from("partner_companies")
          .select("*")
          .eq("id", clienteAtual.partner_company_id)
          .single();

        if (!empresaError && empresaData) {
          setEmpresa(empresaData as Empresa);
        }
      }

      const { data: notasData, error: notasError } = await supabase
        .from("invoices")
        .select(
          "id, created_at, competency_date, service_value, status, error_message, nfse_key"
        )
        .eq("client_id", clienteAtual.id)
        .order("created_at", { ascending: false });

      if (notasError) {
        console.log("Erro ao buscar notas do cliente:", notasError);
      }

      setNotas((notasData || []) as Nota[]);
      setLoading(false);
    } catch (error) {
      console.log("Erro inesperado ao carregar cliente:", error);
      setMensagem("Erro inesperado ao carregar cliente.");
      setLoading(false);
    }
  }

  const resumo = useMemo(() => {
    const totalNotas = notas.length;
    const totalEmitidas = notas.filter(
      (nota) => String(nota.status || "").toLowerCase() === "success"
    ).length;
    const totalErro = notas.filter(
      (nota) => String(nota.status || "").toLowerCase() === "error"
    ).length;
    const totalProcessando = notas.filter((nota) => {
      const status = String(nota.status || "").toLowerCase();
      return status === "pending" || status === "processing";
    }).length;

    const faturamento = notas
      .filter((nota) => String(nota.status || "").toLowerCase() === "success")
      .reduce((acc, nota) => {
        const numero =
          typeof nota.service_value === "number"
            ? nota.service_value
            : Number(String(nota.service_value || 0).replace(",", "."));
        return acc + Number(numero || 0);
      }, 0);

    return {
      totalNotas,
      totalEmitidas,
      totalErro,
      totalProcessando,
      faturamento,
    };
  }, [notas]);

  function voltarParaEmpresa() {
    if (cliente?.partner_company_id) {
      router.push(`/admin/empresa/${cliente.partner_company_id}`);
      return;
    }

    router.push("/admin");
  }

  if (loadingAccess) {
    return <ProtectedPageLoader label="Validando acesso administrativo..." />;
  }

  if (!authorized) {
    return null;
  }

  if (loading) {
    return <ProtectedPageLoader label="Carregando cliente..." />;
  }

  return (
    <main style={pageStyle}>
      <div style={bgGlowOne} />
      <div style={bgGlowTwo} />

      <div style={containerStyle}>
        {mensagem && <div style={errorMessageStyle}>{mensagem}</div>}

        <section style={heroCardStyle}>
          <div style={heroTopRowStyle}>
            <div>
              <p style={heroMiniStyle}>MVP_ AUTOMAÇÃO FISCAL</p>
              <h1 style={heroTitleStyle}>{cliente?.name || "Cliente"}</h1>
              <p style={heroSubtitleStyle}>
                Visão administrativa do cliente, dados cadastrais, vínculo com
                empresa e histórico operacional.
              </p>
            </div>

            <div style={heroBadgesWrapStyle}>
              <span
                style={{
                  ...heroStatusBadgeStyle,
                  ...(cliente?.is_mei ? meiBadgeGreenStyle : meiBadgeDarkStyle),
                }}
              >
                {cliente?.is_mei ? "MEI" : "Não MEI"}
              </span>

              <span
                style={{
                  ...heroStatusBadgeStyle,
                  ...(cliente?.is_active === false
                    ? statusInactiveStyle
                    : statusActiveStyle),
                }}
              >
                {cliente?.is_active === false ? "Inativo" : "Ativo"}
              </span>
            </div>
          </div>
        </section>

        <section style={summaryGridStyle}>
          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Total de notas</span>
            <strong style={summaryValueStyle}>{resumo.totalNotas}</strong>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Notas emitidas</span>
            <strong style={summaryValueStyle}>{resumo.totalEmitidas}</strong>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Notas com erro</span>
            <strong style={summaryValueStyle}>{resumo.totalErro}</strong>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Processando / pendentes</span>
            <strong style={summaryValueStyle}>{resumo.totalProcessando}</strong>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Faturamento validado</span>
            <strong style={summaryValueStyle}>
              {formatarMoeda(resumo.faturamento)}
            </strong>
          </div>
        </section>

        <section style={detailsGridStyle}>
          <article style={contentCardStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <h2 style={sectionTitleStyle}>Dados do cliente</h2>
                <p style={sectionSubtitleStyle}>
                  Informações principais do cadastro.
                </p>
              </div>
            </div>

            <div style={infoGridStyle}>
              <div style={infoBoxStyle}>
                <span style={infoLabelStyle}>Nome</span>
                <strong style={infoValueStyle}>
                  {cliente?.name || "Não informado"}
                </strong>
              </div>

              <div style={infoBoxStyle}>
                <span style={infoLabelStyle}>CNPJ</span>
                <strong style={infoValueStyle}>
                  {formatarCnpj(cliente?.cnpj)}
                </strong>
              </div>

              <div style={infoBoxStyle}>
                <span style={infoLabelStyle}>Email</span>
                <strong style={infoValueStyle}>
                  {cliente?.email || "Não informado"}
                </strong>
              </div>

              <div style={infoBoxStyle}>
                <span style={infoLabelStyle}>Telefone</span>
                <strong style={infoValueStyle}>
                  {cliente?.phone || "Não informado"}
                </strong>
              </div>

              <div style={infoBoxStyle}>
                <span style={infoLabelStyle}>Tipo</span>
                <strong style={infoValueStyle}>
                  {cliente?.is_mei ? "MEI" : "Não MEI"}
                </strong>
              </div>

              <div style={infoBoxStyle}>
                <span style={infoLabelStyle}>Status</span>
                <strong style={infoValueStyle}>
                  {cliente?.is_active === false ? "Inativo" : "Ativo"}
                </strong>
              </div>

              <div style={infoBoxStyle}>
                <span style={infoLabelStyle}>Abertura do MEI</span>
                <strong style={infoValueStyle}>
                  {formatarData(cliente?.mei_created_at || null)}
                </strong>
              </div>

              <div style={infoBoxStyle}>
                <span style={infoLabelStyle}>ID da empresa</span>
                <strong style={infoValueStyle}>
                  {cliente?.partner_company_id ?? "Não vinculado"}
                </strong>
              </div>

              <div style={{ ...infoBoxStyle, gridColumn: "1 / -1" }}>
                <span style={infoLabelStyle}>Endereço</span>
                <strong style={infoValueStyle}>
                  {cliente?.address || "Não informado"}
                </strong>
              </div>
            </div>
          </article>

          <article style={contentCardStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <h2 style={sectionTitleStyle}>Empresa vinculada</h2>
                <p style={sectionSubtitleStyle}>
                  Contexto administrativo do cliente.
                </p>
              </div>
            </div>

            <div style={infoGridStyle}>
              <div style={infoBoxStyle}>
                <span style={infoLabelStyle}>Empresa</span>
                <strong style={infoValueStyle}>
                  {empresa?.name || "Não informada"}
                </strong>
              </div>

              <div style={infoBoxStyle}>
                <span style={infoLabelStyle}>CNPJ</span>
                <strong style={infoValueStyle}>
                  {formatarCnpj(empresa?.cnpj)}
                </strong>
              </div>

              <div style={infoBoxStyle}>
                <span style={infoLabelStyle}>Email</span>
                <strong style={infoValueStyle}>
                  {empresa?.email || "Não informado"}
                </strong>
              </div>

              <div style={infoBoxStyle}>
                <span style={infoLabelStyle}>Telefone</span>
                <strong style={infoValueStyle}>
                  {empresa?.phone || "Não informado"}
                </strong>
              </div>
            </div>

            <div style={actionsStyle}>
              <button onClick={voltarParaEmpresa} style={backButtonStyle}>
                Voltar para empresa
              </button>

              {cliente?.partner_company_id ? (
                <Link
                  href={`/admin/empresa/${cliente.partner_company_id}`}
                  style={secondaryLinkStyle}
                >
                  Ver empresa
                </Link>
              ) : null}

              <Link href="/admin" style={secondaryLinkStyle}>
                Voltar para admin
              </Link>
            </div>
          </article>
        </section>

        <section style={listCardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Últimas notas do cliente</h2>
              <p style={sectionSubtitleStyle}>
                Histórico operacional recente do cliente.
              </p>
            </div>
          </div>

          {notas.length === 0 ? (
            <div style={emptyStyle}>
              Nenhuma nota encontrada para este cliente.
            </div>
          ) : (
            <div style={notesListStyle}>
              {notas.slice(0, 10).map((nota) => {
                const statusMeta = getStatusMeta(
                  nota.status,
                  nota.error_message
                );

                return (
                  <article key={nota.id} style={noteCardStyle}>
                    <div style={noteTopStyle}>
                      <div>
                        <strong style={noteTitleStyle}>Nota #{nota.id}</strong>
                        <div style={noteTextStyle}>
                          Competência: {formatarData(nota.competency_date)}
                        </div>
                        <div style={noteTextStyle}>
                          Criada em: {formatarData(nota.created_at)}
                        </div>
                      </div>

                      <span
                        style={{
                          ...statusBadgeStyle,
                          background: statusMeta.bg,
                          border: statusMeta.border,
                          color: statusMeta.color,
                        }}
                      >
                        {statusMeta.label}
                      </span>
                    </div>

                    <div style={noteInfoGridStyle}>
                      <div style={noteInfoBoxStyle}>
                        <span style={infoLabelStyle}>Valor</span>
                        <strong style={infoValueStyle}>
                          {formatarMoeda(nota.service_value)}
                        </strong>
                      </div>

                      <div style={noteInfoBoxStyle}>
                        <span style={infoLabelStyle}>Chave NFS-e</span>
                        <strong style={infoValueStyle}>
                          {nota.nfse_key || "Aguardando"}
                        </strong>
                      </div>
                    </div>

                    {nota.error_message ? (
                      <div style={invoiceMessageBoxStyle}>
                        <span style={invoiceMessageTitleStyle}>
                          Detalhe operacional
                        </span>
                        <p style={invoiceMessageTextStyle}>
                          {nota.error_message}
                        </p>
                      </div>
                    ) : null}
                  </article>
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
    "linear-gradient(135deg, #020617 0%, #081224 35%, #0f172a 65%, #071b34 100%)",
  padding: "32px 20px 48px",
  fontFamily: "Arial, sans-serif",
  color: "#f8fafc",
};

const bgGlowOne: React.CSSProperties = {
  position: "absolute",
  top: "-120px",
  left: "-80px",
  width: "320px",
  height: "320px",
  borderRadius: "50%",
  background: "rgba(37, 99, 235, 0.18)",
  filter: "blur(90px)",
  pointerEvents: "none",
};

const bgGlowTwo: React.CSSProperties = {
  position: "absolute",
  bottom: "-140px",
  right: "-80px",
  width: "340px",
  height: "340px",
  borderRadius: "50%",
  background: "rgba(59, 130, 246, 0.14)",
  filter: "blur(90px)",
  pointerEvents: "none",
};

const containerStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  maxWidth: "1180px",
  margin: "0 auto",
};

const heroCardStyle: React.CSSProperties = {
  background: "rgba(2, 6, 23, 0.72)",
  border: "1px solid rgba(59, 130, 246, 0.18)",
  borderRadius: "28px",
  padding: "26px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.36)",
  backdropFilter: "blur(16px)",
  marginBottom: "18px",
};

const heroTopRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
};

const heroMiniStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "12px",
  letterSpacing: "0.18em",
  color: "#93c5fd",
  fontWeight: 700,
};

const heroTitleStyle: React.CSSProperties = {
  margin: "10px 0 10px 0",
  fontSize: "34px",
  fontWeight: 800,
  color: "#ffffff",
};

const heroSubtitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#cbd5e1",
  fontSize: "15px",
  lineHeight: 1.7,
  maxWidth: "760px",
};

const heroBadgesWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const heroStatusBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "96px",
  padding: "10px 14px",
  borderRadius: "999px",
  fontSize: "13px",
  fontWeight: 800,
};

const meiBadgeGreenStyle: React.CSSProperties = {
  color: "#6ee7b7",
  backgroundColor: "rgba(16, 185, 129, 0.14)",
  border: "1px solid rgba(16, 185, 129, 0.30)",
};

const meiBadgeDarkStyle: React.CSSProperties = {
  color: "#cbd5e1",
  backgroundColor: "rgba(148, 163, 184, 0.10)",
  border: "1px solid rgba(148, 163, 184, 0.18)",
};

const statusActiveStyle: React.CSSProperties = {
  color: "#bfdbfe",
  backgroundColor: "rgba(37, 99, 235, 0.16)",
  border: "1px solid rgba(59, 130, 246, 0.28)",
};

const statusInactiveStyle: React.CSSProperties = {
  color: "#fecaca",
  backgroundColor: "rgba(239, 68, 68, 0.12)",
  border: "1px solid rgba(239, 68, 68, 0.24)",
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "14px",
  marginBottom: "18px",
};

const summaryCardStyle: React.CSSProperties = {
  background: "rgba(2, 6, 23, 0.72)",
  border: "1px solid rgba(59, 130, 246, 0.15)",
  borderRadius: "22px",
  padding: "20px",
  boxShadow: "0 18px 45px rgba(0,0,0,0.28)",
  backdropFilter: "blur(14px)",
};

const summaryLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  color: "#93c5fd",
  marginBottom: "8px",
};

const summaryValueStyle: React.CSSProperties = {
  fontSize: "28px",
  fontWeight: 800,
  color: "#ffffff",
};

const detailsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.2fr 0.8fr",
  gap: "16px",
  marginBottom: "18px",
};

const contentCardStyle: React.CSSProperties = {
  background: "rgba(2, 6, 23, 0.68)",
  border: "1px solid rgba(59, 130, 246, 0.14)",
  borderRadius: "28px",
  padding: "18px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.34)",
  backdropFilter: "blur(16px)",
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "18px",
  paddingBottom: "14px",
  borderBottom: "1px solid rgba(148, 163, 184, 0.10)",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "22px",
  fontWeight: 800,
  color: "#ffffff",
};

const sectionSubtitleStyle: React.CSSProperties = {
  margin: "6px 0 0 0",
  fontSize: "14px",
  color: "#94a3b8",
};

const listCardStyle: React.CSSProperties = {
  background: "rgba(2, 6, 23, 0.68)",
  border: "1px solid rgba(59, 130, 246, 0.14)",
  borderRadius: "28px",
  padding: "18px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.34)",
  backdropFilter: "blur(16px)",
};

const infoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "10px",
};

const infoBoxStyle: React.CSSProperties = {
  backgroundColor: "rgba(15, 23, 42, 0.92)",
  border: "1px solid rgba(59, 130, 246, 0.12)",
  borderRadius: "16px",
  padding: "12px 14px",
};

const infoLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#93c5fd",
  marginBottom: "6px",
  fontWeight: 600,
};

const infoValueStyle: React.CSSProperties = {
  fontSize: "15px",
  color: "#ffffff",
  fontWeight: 700,
  wordBreak: "break-word",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  marginTop: "16px",
  flexWrap: "wrap",
};

const backButtonStyle: React.CSSProperties = {
  padding: "13px 16px",
  borderRadius: "14px",
  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  color: "#ffffff",
  border: "none",
  fontWeight: 800,
  boxShadow: "0 12px 28px rgba(37,99,235,0.26)",
  cursor: "pointer",
};

const secondaryLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "12px 16px",
  borderRadius: "14px",
  backgroundColor: "rgba(15, 23, 42, 0.9)",
  color: "#ffffff",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  fontWeight: 700,
};

const notesListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

const noteCardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  background:
    "linear-gradient(180deg, rgba(2, 6, 23, 0.92) 0%, rgba(15, 23, 42, 0.92) 100%)",
  border: "1px solid rgba(59, 130, 246, 0.16)",
  borderRadius: "22px",
  padding: "18px",
  boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
};

const noteTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  flexWrap: "wrap",
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

const noteInfoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
};

const noteInfoBoxStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(59,130,246,0.08)",
  borderRadius: "14px",
  padding: "14px",
};

const statusBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "92px",
  padding: "8px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
};

const invoiceMessageBoxStyle: React.CSSProperties = {
  borderRadius: "14px",
  padding: "14px",
  background: "rgba(59,130,246,0.08)",
  border: "1px solid rgba(59,130,246,0.16)",
  color: "#dbeafe",
};

const invoiceMessageTitleStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 800,
  marginBottom: "6px",
};

const invoiceMessageTextStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "13px",
  lineHeight: 1.6,
};

const emptyStyle: React.CSSProperties = {
  color: "#94a3b8",
  padding: "24px 10px",
  fontSize: "15px",
};

const errorMessageStyle: React.CSSProperties = {
  marginBottom: "16px",
  backgroundColor: "rgba(239,68,68,0.12)",
  border: "1px solid rgba(239,68,68,0.25)",
  color: "#fecaca",
  borderRadius: "14px",
  padding: "12px 14px",
  fontSize: "14px",
};