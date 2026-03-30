"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ProtectedPageLoader from "@/components/ProtectedPageLoader";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { getPartnerCompanySession } from "@/lib/session";
import EmpresaPageShell from "@/components/EmpresaPageShell";

type Empresa = {
  id: number;
  name: string;
};

type Cliente = {
  id: number;
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_mei: boolean | null;
  mei_created_at: string | null;
  is_active: boolean | null;
  partner_company_id: number | null;
};

type Nota = {
  id: number;
  created_at: string | null;
  competency_date: string | null;
  service_taker: string | null;
  service_city: string | null;
  service_value: number | null;
  service_description: string | null;
  status: string | null;
  nfse_key?: string | null;
  pdf_path?: string | null;
  xml_path?: string | null;
  pdf_url?: string | null;
  xml_url?: string | null;
};

const LIMITE_MEI = 81000;

function limparDocumento(valor?: string | null) {
  return String(valor || "").replace(/\D/g, "");
}

function formatarCnpj(valor?: string | null) {
  if (!valor) return "Não informado";

  const numeros = limparDocumento(valor);
  if (numeros.length !== 14) return valor;

  return numeros.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

function mascararCnpj(valor?: string | null) {
  const numeros = limparDocumento(valor);
  if (numeros.length !== 14) return "Não informado";

  return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.***/****-${numeros.slice(12)}`;
}

function mascararEmail(valor?: string | null) {
  const email = String(valor || "").trim();
  if (!email || !email.includes("@")) return "Não informado";

  const [usuario, dominio] = email.split("@");
  if (!usuario || !dominio) return email;

  const inicio = usuario.slice(0, 2);
  return `${inicio}${"*".repeat(Math.max(usuario.length - 2, 2))}@${dominio}`;
}

function formatarTelefone(valor?: string | null) {
  const digits = limparDocumento(valor).slice(0, 11);

  if (!digits) return "Não informado";

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function formatarData(valor?: string | null) {
  if (!valor) return "-";

  if (valor.includes("T")) {
    const data = new Date(valor);
    if (!Number.isNaN(data.getTime())) {
      return data.toLocaleDateString("pt-BR");
    }
  }

  const partes = valor.split("-");
  if (partes.length === 3) {
    const [ano, mes, dia] = partes;
    return `${dia}/${mes}/${ano}`;
  }

  return valor;
}

function formatarValor(valor?: number | null) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getArquivoUrl(nota: Nota, tipo: "pdf" | "xml") {
  if (tipo === "pdf") {
    return nota.pdf_url || nota.pdf_path || null;
  }

  return nota.xml_url || nota.xml_path || null;
}

function getStatusMeta(status?: string | null) {
  const valor = String(status || "").toLowerCase();

  if (valor.includes("success") || valor.includes("sucesso")) {
    return {
      label: "Emitida",
      bg: "rgba(16, 185, 129, 0.16)",
      border: "rgba(16, 185, 129, 0.28)",
      color: "#bbf7d0",
    };
  }

  if (valor.includes("processing")) {
    return {
      label: "Processando",
      bg: "rgba(37, 99, 235, 0.16)",
      border: "rgba(59, 130, 246, 0.28)",
      color: "#bfdbfe",
    };
  }

  if (valor.includes("pending")) {
    return {
      label: "Pendente",
      bg: "rgba(245, 158, 11, 0.16)",
      border: "rgba(245, 158, 11, 0.26)",
      color: "#fde68a",
    };
  }

  if (valor.includes("canceled") || valor.includes("cancelada")) {
    return {
      label: "Cancelada",
      bg: "rgba(148, 163, 184, 0.18)",
      border: "rgba(148, 163, 184, 0.28)",
      color: "#e2e8f0",
    };
  }

  if (valor.includes("error") || valor.includes("erro")) {
    return {
      label: "Erro",
      bg: "rgba(239, 68, 68, 0.16)",
      border: "rgba(239, 68, 68, 0.28)",
      color: "#fecaca",
    };
  }

  return {
    label: status || "-",
    bg: "rgba(148, 163, 184, 0.18)",
    border: "rgba(148, 163, 184, 0.28)",
    color: "#e2e8f0",
  };
}

export default function ClientePainelPage() {
  const router = useRouter();
  const params = useParams();
  const { loading: loadingAccess, authorized } = useProtectedRoute(["partner_company"]);

  const clienteId = Number(params?.id);

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    if (!loadingAccess && authorized) {
      carregarDados();
    }
  }, [loadingAccess, authorized, clienteId]);

  async function carregarDados() {
    try {
      setLoading(true);
      setMensagem("");

      const session = getPartnerCompanySession();

      if (!session?.id) {
        router.push("/login");
        return;
      }

      if (!clienteId || Number.isNaN(clienteId)) {
        setMensagem("Cliente inválido.");
        setLoading(false);
        return;
      }

      setEmpresa({
        id: session.id,
        name: session.name,
      });

      const { data: clienteData, error: clienteError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clienteId)
        .eq("partner_company_id", session.id)
        .single();

      if (clienteError || !clienteData) {
        setMensagem("Cliente não encontrado.");
        setLoading(false);
        return;
      }

      setCliente(clienteData as Cliente);

      const { data: notasData, error: notasError } = await supabase
        .from("invoices")
        .select(`
          id,
          created_at,
          competency_date,
          service_taker,
          service_city,
          service_value,
          service_description,
          status,
          nfse_key,
          pdf_path,
          xml_path,
          pdf_url,
          xml_url
        `)
        .eq("client_id", clienteId)
        .eq("partner_company_id", session.id)
        .order("created_at", { ascending: false });

      if (notasError) {
        console.log("Erro ao buscar notas do cliente:", notasError);
        setMensagem("Não foi possível carregar as notas do cliente.");
        setNotas([]);
        setLoading(false);
        return;
      }

      setNotas((notasData || []) as Nota[]);
      setLoading(false);
    } catch (err) {
      console.log(err);
      setMensagem("Erro inesperado ao carregar o painel do cliente.");
      setLoading(false);
    }
  }

  function abrirArquivo(url: string | null, tipo: "PDF" | "XML") {
    if (!url) {
      alert(`Esta nota ainda não possui ${tipo} disponível.`);
      return;
    }

    window.open(url, "_blank");
  }

  const resumo = useMemo(() => {
    const anoAtual = new Date().getFullYear();

    const notasAnoAtual = notas.filter((nota) => {
      const base = nota.competency_date || nota.created_at;
      if (!base) return false;
      const data = new Date(base);
      return !Number.isNaN(data.getTime()) && data.getFullYear() === anoAtual;
    });

    const faturamentoAno = notasAnoAtual.reduce((acc, nota) => {
      if (String(nota.status || "").toLowerCase() !== "success") return acc;
      return acc + Number(nota.service_value || 0);
    }, 0);

    const totalNotas = notas.length;

    const totalNotasSuccess = notas.filter(
      (nota) => String(nota.status || "").toLowerCase() === "success"
    ).length;

    const totalPendentes = notas.filter((nota) =>
      String(nota.status || "").toLowerCase().includes("pending")
    ).length;

    const totalErros = notas.filter((nota) => {
      const status = String(nota.status || "").toLowerCase();
      return status.includes("error") || status.includes("erro");
    }).length;

    const percentualMei =
      LIMITE_MEI > 0 ? Math.min((faturamentoAno / LIMITE_MEI) * 100, 100) : 0;

    return {
      anoAtual,
      faturamentoAno,
      totalNotas,
      totalNotasSuccess,
      totalPendentes,
      totalErros,
      percentualMei,
      restanteMei: Math.max(LIMITE_MEI - faturamentoAno, 0),
      excedeuMei: faturamentoAno > LIMITE_MEI,
    };
  }, [notas]);

  const ultimaNota = useMemo(() => {
    return notas[0] || null;
  }, [notas]);

  if (loadingAccess) {
    return <ProtectedPageLoader label="Validando acesso..." />;
  }

  if (!authorized) return null;

  if (loading) {
    return <ProtectedPageLoader label="Carregando painel do cliente..." />;
  }

  return (
    <EmpresaPageShell
      title={cliente?.name || "Painel do Cliente"}
      subtitle="Visão operacional do cliente, com faturamento, notas e acompanhamento fiscal."
    >
      <div style={pageWrapStyle}>
        <div style={backgroundGlowTopStyle} />
        <div style={backgroundGlowBottomStyle} />

        <div style={containerStyle}>
          <section style={heroCardStyle}>
            <div style={heroTopRowStyle}>
              <div style={heroLeftStyle}>
                <p style={heroMiniStyle}>MVP_ AUTOMAÇÃO FISCAL</p>
                <h1 style={heroTitleStyle}>{cliente?.name || "Cliente"}</h1>
                <p style={heroSubtitleStyle}>
                  Painel fiscal individual do cliente, com visão operacional,
                  acompanhamento de faturamento, notas emitidas e acesso rápido às principais ações.
                </p>

                <div style={heroPillsStyle}>
                  <span style={heroPillStyle}>
                    {cliente?.is_active === false ? "Cliente inativo" : "Cliente ativo"}
                  </span>
                  <span style={heroPillStyle}>
                    {cliente?.is_mei === false ? "Não MEI" : "MEI"}
                  </span>
                  <span style={heroPillStyle}>{notas.length} nota(s)</span>
                </div>
              </div>

              <div style={heroSideBoxStyle}>
                <span style={heroInfoLabelStyle}>Empresa logada</span>
                <strong style={heroInfoValueStyle}>
                  {empresa?.name || "Área da Empresa"}
                </strong>
              </div>
            </div>
          </section>

          {mensagem && (
            <div style={{ ...messageStyle, ...errorMessageStyle }}>
              {mensagem}
            </div>
          )}

          <section style={summaryGridStyle}>
            <div style={summaryCardStyle}>
              <span style={summaryLabelStyle}>Faturamento {resumo.anoAtual}</span>
              <strong style={summaryValueStyle}>
                {formatarValor(resumo.faturamentoAno)}
              </strong>
            </div>

            <div style={summaryCardStyle}>
              <span style={summaryLabelStyle}>Notas do cliente</span>
              <strong style={summaryValueStyle}>{resumo.totalNotas}</strong>
            </div>

            <div style={summaryCardStyle}>
              <span style={summaryLabelStyle}>Notas com sucesso</span>
              <strong style={summaryValueStyle}>{resumo.totalNotasSuccess}</strong>
            </div>

            <div style={summaryCardStyle}>
              <span style={summaryLabelStyle}>Pendentes</span>
              <strong style={summaryValueStyle}>{resumo.totalPendentes}</strong>
            </div>

            <div style={summaryCardStyle}>
              <span style={summaryLabelStyle}>Erros</span>
              <strong style={summaryValueStyle}>{resumo.totalErros}</strong>
            </div>

            <div style={summaryCardStyle}>
              <span style={summaryLabelStyle}>Status do cliente</span>
              <strong style={summaryValueStyle}>
                {cliente?.is_active === false ? "Inativo" : "Ativo"}
              </strong>
            </div>
          </section>

          <section style={panelGridStyle}>
            <div style={leftColumnStyle}>
              <div style={infoCardStyle}>
                <div style={sectionHeaderStyle}>
                  <div style={sectionHeaderContentStyle}>
                    <h2 style={sectionTitleStyle}>Dados do cliente</h2>
                    <p style={sectionSubtitleStyle}>
                      Informações principais para operação fiscal e acompanhamento.
                    </p>
                  </div>
                </div>

                <div style={infoGridStyle}>
                  <div style={infoBoxStyle}>
                    <span style={infoLabelStyle}>CNPJ</span>
                    <strong style={infoValueStyle}>
                      {mascararCnpj(cliente?.cnpj)}
                    </strong>
                  </div>

                  <div style={infoBoxStyle}>
                    <span style={infoLabelStyle}>Email</span>
                    <strong style={infoValueStyle}>
                      {mascararEmail(cliente?.email)}
                    </strong>
                  </div>

                  <div style={infoBoxStyle}>
                    <span style={infoLabelStyle}>Telefone</span>
                    <strong style={infoValueStyle}>
                      {formatarTelefone(cliente?.phone)}
                    </strong>
                  </div>

                  <div style={infoBoxStyle}>
                    <span style={infoLabelStyle}>Endereço</span>
                    <strong style={infoValueStyle}>
                      {cliente?.address || "Não informado"}
                    </strong>
                  </div>

                  <div style={infoBoxStyle}>
                    <span style={infoLabelStyle}>É MEI?</span>
                    <strong style={infoValueStyle}>
                      {cliente?.is_mei === false ? "Não" : "Sim"}
                    </strong>
                  </div>

                  <div style={infoBoxStyle}>
                    <span style={infoLabelStyle}>Abertura do MEI</span>
                    <strong style={infoValueStyle}>
                      {cliente?.mei_created_at
                        ? formatarData(cliente.mei_created_at)
                        : "Não informada"}
                    </strong>
                  </div>
                </div>

                <div style={actionsStyle}>
                  <Link href={`/emitir?client_id=${clienteId}`} style={primaryActionStyle}>
                    Emitir nota
                  </Link>

                  <Link href={`/clientes/${clienteId}/editar`} style={secondaryActionStyle}>
                    Editar cliente
                  </Link>

                  <Link href="/clientes" style={secondaryActionStyle}>
                    Voltar para clientes
                  </Link>
                </div>
              </div>

              <div style={listCardStyle}>
                <div style={sectionHeaderStyle}>
                  <div style={sectionHeaderContentStyle}>
                    <h2 style={sectionTitleStyle}>Notas do cliente</h2>
                    <p style={sectionSubtitleStyle}>
                      Histórico de emissões vinculado a este cliente.
                    </p>
                  </div>
                </div>

                {notas.length === 0 ? (
                  <div style={emptyStyle}>Nenhuma nota encontrada para este cliente.</div>
                ) : (
                  <div style={tableWrapperStyle}>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th style={thStyle}>ID</th>
                          <th style={thStyle}>Competência</th>
                          <th style={thStyle}>Tomador</th>
                          <th style={thStyle}>Cidade</th>
                          <th style={thStyle}>Valor</th>
                          <th style={thStyle}>Status</th>
                          <th style={thStyle}>NFS-e</th>
                          <th style={thStyle}>PDF</th>
                          <th style={thStyle}>XML</th>
                        </tr>
                      </thead>

                      <tbody>
                        {notas.map((nota) => {
                          const pdfUrl = getArquivoUrl(nota, "pdf");
                          const xmlUrl = getArquivoUrl(nota, "xml");
                          const statusMeta = getStatusMeta(nota.status);

                          return (
                            <tr key={nota.id}>
                              <td style={tdStyle}>#{nota.id}</td>
                              <td style={tdStyle}>
                                {formatarData(nota.competency_date || nota.created_at)}
                              </td>
                              <td style={tdStyle}>
                                {nota.service_taker ? formatarCnpj(nota.service_taker) : "-"}
                              </td>
                              <td style={tdStyle}>{nota.service_city || "-"}</td>
                              <td style={tdStyle}>{formatarValor(nota.service_value)}</td>
                              <td style={tdStyle}>
                                <span
                                  style={{
                                    ...statusBadgeStyle,
                                    backgroundColor: statusMeta.bg,
                                    borderColor: statusMeta.border,
                                    color: statusMeta.color,
                                  }}
                                >
                                  {statusMeta.label}
                                </span>
                              </td>
                              <td style={tdStyle}>{nota.nfse_key || "-"}</td>
                              <td style={tdStyle}>
                                {pdfUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => abrirArquivo(pdfUrl, "PDF")}
                                    style={linkButtonStyle}
                                  >
                                    Abrir PDF
                                  </button>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td style={tdStyle}>
                                {xmlUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => abrirArquivo(xmlUrl, "XML")}
                                    style={linkButtonStyle}
                                  >
                                    Abrir XML
                                  </button>
                                ) : (
                                  "-"
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div style={rightColumnStyle}>
              <div style={infoCardStyle}>
                <div style={sectionHeaderStyle}>
                  <div style={sectionHeaderContentStyle}>
                    <h2 style={sectionTitleStyle}>Acompanhamento MEI</h2>
                    <p style={sectionSubtitleStyle}>
                      Controle do faturamento anual com base apenas nas notas com sucesso.
                    </p>
                  </div>
                </div>

                <div style={meiBoxStyle}>
                  <div style={meiTopStyle}>
                    <span style={meiLabelStyle}>Limite anual MEI</span>
                    <strong style={meiValueStyle}>{formatarValor(LIMITE_MEI)}</strong>
                  </div>

                  <div style={progressTrackStyle}>
                    <div
                      style={{
                        ...progressFillStyle,
                        width: `${resumo.percentualMei}%`,
                        background: resumo.excedeuMei
                          ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                          : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                      }}
                    />
                  </div>

                  <div style={meiStatsGridStyle}>
                    <div style={meiStatBoxStyle}>
                      <span style={infoLabelStyle}>Utilizado</span>
                      <strong style={infoValueStyle}>
                        {formatarValor(resumo.faturamentoAno)}
                      </strong>
                    </div>

                    <div style={meiStatBoxStyle}>
                      <span style={infoLabelStyle}>Restante</span>
                      <strong style={infoValueStyle}>
                        {formatarValor(resumo.restanteMei)}
                      </strong>
                    </div>
                  </div>

                  <div
                    style={{
                      ...alertBoxStyle,
                      ...(resumo.excedeuMei ? alertDangerStyle : alertInfoStyle),
                    }}
                  >
                    {resumo.excedeuMei
                      ? "Atenção: o cliente ultrapassou o limite anual do MEI."
                      : `O cliente utilizou ${resumo.percentualMei.toFixed(1)}% do limite anual do MEI.`}
                  </div>
                </div>
              </div>

              <div style={infoCardStyle}>
                <div style={sectionHeaderStyle}>
                  <div style={sectionHeaderContentStyle}>
                    <h2 style={sectionTitleStyle}>Última emissão</h2>
                    <p style={sectionSubtitleStyle}>
                      Resumo rápido da nota mais recente do cliente.
                    </p>
                  </div>
                </div>

                {ultimaNota ? (
                  <div style={latestNoteBoxStyle}>
                    <div style={latestNoteItemStyle}>
                      <span style={infoLabelStyle}>Competência</span>
                      <strong style={infoValueStyle}>
                        {formatarData(ultimaNota.competency_date || ultimaNota.created_at)}
                      </strong>
                    </div>

                    <div style={latestNoteItemStyle}>
                      <span style={infoLabelStyle}>Valor</span>
                      <strong style={infoValueStyle}>
                        {formatarValor(ultimaNota.service_value)}
                      </strong>
                    </div>

                    <div style={latestNoteItemStyle}>
                      <span style={infoLabelStyle}>Cidade</span>
                      <strong style={infoValueStyle}>
                        {ultimaNota.service_city || "-"}
                      </strong>
                    </div>

                    <div style={latestNoteItemStyle}>
                      <span style={infoLabelStyle}>Status</span>
                      <strong style={infoValueStyle}>
                        {getStatusMeta(ultimaNota.status).label}
                      </strong>
                    </div>

                    <div style={latestNoteItemStyle}>
                      <span style={infoLabelStyle}>Chave NFS-e</span>
                      <strong style={infoValueStyle}>
                        {ultimaNota.nfse_key || "Não disponível"}
                      </strong>
                    </div>

                    <div style={quickFileActionsStyle}>
                      <button
                        type="button"
                        onClick={() => abrirArquivo(getArquivoUrl(ultimaNota, "pdf"), "PDF")}
                        style={secondaryActionButtonStyle}
                      >
                        Abrir PDF
                      </button>

                      <button
                        type="button"
                        onClick={() => abrirArquivo(getArquivoUrl(ultimaNota, "xml"), "XML")}
                        style={secondaryActionButtonStyle}
                      >
                        Abrir XML
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={emptyStyle}>Este cliente ainda não possui emissões.</div>
                )}
              </div>
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
  position: "relative",
  zIndex: 1,
  maxWidth: "1320px",
  margin: "0 auto",
};

const heroCardStyle: CSSProperties = {
  background: "rgba(2, 6, 23, 0.72)",
  border: "1px solid rgba(59, 130, 246, 0.18)",
  borderRadius: "28px",
  padding: "26px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.36)",
  backdropFilter: "blur(16px)",
  marginBottom: "18px",
};

const heroTopRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
};

const heroLeftStyle: CSSProperties = {
  maxWidth: "760px",
  minWidth: 0,
};

const heroMiniStyle: CSSProperties = {
  margin: 0,
  fontSize: "12px",
  letterSpacing: "0.18em",
  color: "#93c5fd",
  fontWeight: 700,
};

const heroTitleStyle: CSSProperties = {
  margin: "10px 0 10px 0",
  fontSize: "34px",
  fontWeight: 800,
  color: "#ffffff",
};

const heroSubtitleStyle: CSSProperties = {
  margin: 0,
  color: "#cbd5e1",
  fontSize: "15px",
  lineHeight: 1.7,
  maxWidth: "720px",
  whiteSpace: "normal",
  wordBreak: "break-word",
};

const heroPillsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "16px",
};

const heroPillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 12px",
  borderRadius: "999px",
  background: "rgba(59, 130, 246, 0.15)",
  border: "1px solid rgba(59, 130, 246, 0.24)",
  color: "#bfdbfe",
  fontSize: "12px",
  fontWeight: 700,
};

const heroSideBoxStyle: CSSProperties = {
  display: "inline-flex",
  flexDirection: "column",
  gap: "8px",
  padding: "16px",
  borderRadius: "20px",
  background: "rgba(59, 130, 246, 0.08)",
  border: "1px solid rgba(59, 130, 246, 0.18)",
  minWidth: "240px",
  maxWidth: "100%",
};

const heroInfoLabelStyle: CSSProperties = {
  fontSize: "12px",
  color: "#93c5fd",
  fontWeight: 700,
};

const heroInfoValueStyle: CSSProperties = {
  color: "#ffffff",
  fontSize: "18px",
  fontWeight: 800,
  wordBreak: "break-word",
};

const messageStyle: CSSProperties = {
  borderRadius: "18px",
  padding: "14px 16px",
  marginBottom: "16px",
  fontSize: "14px",
  border: "1px solid transparent",
};

const errorMessageStyle: CSSProperties = {
  backgroundColor: "rgba(239, 68, 68, 0.12)",
  border: "1px solid rgba(239, 68, 68, 0.25)",
  color: "#fecaca",
};

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "14px",
  marginBottom: "18px",
};

const summaryCardStyle: CSSProperties = {
  background: "rgba(2, 6, 23, 0.72)",
  border: "1px solid rgba(59, 130, 246, 0.15)",
  borderRadius: "22px",
  padding: "20px",
  boxShadow: "0 18px 45px rgba(0,0,0,0.28)",
  backdropFilter: "blur(14px)",
};

const summaryLabelStyle: CSSProperties = {
  display: "block",
  fontSize: "13px",
  color: "#93c5fd",
  marginBottom: "8px",
};

const summaryValueStyle: CSSProperties = {
  fontSize: "28px",
  fontWeight: 800,
  color: "#ffffff",
};

const panelGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.35fr) minmax(420px, 0.95fr)",
  gap: "18px",
  marginBottom: "18px",
  alignItems: "start",
};

const leftColumnStyle: CSSProperties = {
  display: "grid",
  gap: "18px",
  minWidth: 0,
};

const rightColumnStyle: CSSProperties = {
  display: "grid",
  gap: "18px",
  minWidth: 0,
};

const infoCardStyle: CSSProperties = {
  background: "rgba(2, 6, 23, 0.68)",
  border: "1px solid rgba(59, 130, 246, 0.14)",
  borderRadius: "28px",
  padding: "20px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.34)",
  backdropFilter: "blur(16px)",
  minWidth: 0,
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "18px",
  paddingBottom: "14px",
  borderBottom: "1px solid rgba(148, 163, 184, 0.10)",
};

const sectionHeaderContentStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "22px",
  fontWeight: 800,
  color: "#ffffff",
  lineHeight: 1.2,
};

const sectionSubtitleStyle: CSSProperties = {
  margin: "6px 0 0 0",
  fontSize: "14px",
  color: "#94a3b8",
  lineHeight: 1.6,
  whiteSpace: "normal",
  wordBreak: "break-word",
};

const infoGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "10px",
};

const infoBoxStyle: CSSProperties = {
  backgroundColor: "rgba(15, 23, 42, 0.92)",
  border: "1px solid rgba(59, 130, 246, 0.12)",
  borderRadius: "16px",
  padding: "12px 14px",
  minWidth: 0,
};

const infoLabelStyle: CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#93c5fd",
  marginBottom: "6px",
  fontWeight: 600,
};

const infoValueStyle: CSSProperties = {
  fontSize: "15px",
  color: "#ffffff",
  fontWeight: 700,
  wordBreak: "break-word",
  lineHeight: 1.55,
};

const actionsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  marginTop: "16px",
  flexWrap: "wrap",
};

const primaryActionStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "13px 16px",
  borderRadius: "14px",
  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  color: "#ffffff",
  fontWeight: 800,
  boxShadow: "0 12px 28px rgba(16,185,129,0.26)",
};

const secondaryActionStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "13px 16px",
  borderRadius: "14px",
  background:
    "linear-gradient(135deg, rgba(37,99,235,0.20) 0%, rgba(59,130,246,0.16) 100%)",
  border: "1px solid rgba(59, 130, 246, 0.28)",
  color: "#ffffff",
  fontWeight: 700,
};

const meiBoxStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  minWidth: 0,
};

const meiTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
};

const meiLabelStyle: CSSProperties = {
  color: "#93c5fd",
  fontSize: "14px",
  fontWeight: 700,
};

const meiValueStyle: CSSProperties = {
  color: "#ffffff",
  fontSize: "18px",
  fontWeight: 800,
  wordBreak: "break-word",
};

const progressTrackStyle: CSSProperties = {
  width: "100%",
  height: "14px",
  borderRadius: "999px",
  background: "rgba(148, 163, 184, 0.18)",
  overflow: "hidden",
};

const progressFillStyle: CSSProperties = {
  height: "100%",
  borderRadius: "999px",
  transition: "width 0.25s ease",
};

const meiStatsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
};

const meiStatBoxStyle: CSSProperties = {
  backgroundColor: "rgba(15, 23, 42, 0.92)",
  border: "1px solid rgba(59, 130, 246, 0.12)",
  borderRadius: "16px",
  padding: "12px 14px",
  minWidth: 0,
};

const alertBoxStyle: CSSProperties = {
  borderRadius: "16px",
  padding: "14px 16px",
  fontSize: "14px",
  lineHeight: 1.6,
  whiteSpace: "normal",
  wordBreak: "break-word",
};

const alertInfoStyle: CSSProperties = {
  backgroundColor: "rgba(37, 99, 235, 0.12)",
  border: "1px solid rgba(59, 130, 246, 0.22)",
  color: "#bfdbfe",
};

const alertDangerStyle: CSSProperties = {
  backgroundColor: "rgba(239, 68, 68, 0.12)",
  border: "1px solid rgba(239, 68, 68, 0.25)",
  color: "#fecaca",
};

const listCardStyle: CSSProperties = {
  background: "rgba(2, 6, 23, 0.68)",
  border: "1px solid rgba(59, 130, 246, 0.14)",
  borderRadius: "28px",
  padding: "18px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.34)",
  backdropFilter: "blur(16px)",
  minWidth: 0,
};

const latestNoteBoxStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  minWidth: 0,
};

const latestNoteItemStyle: CSSProperties = {
  backgroundColor: "rgba(15, 23, 42, 0.92)",
  border: "1px solid rgba(59, 130, 246, 0.12)",
  borderRadius: "16px",
  padding: "12px 14px",
  minWidth: 0,
};

const quickFileActionsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "4px",
};

const secondaryActionButtonStyle: CSSProperties = {
  padding: "12px 14px",
  borderRadius: "14px",
  background:
    "linear-gradient(135deg, rgba(37,99,235,0.20) 0%, rgba(59,130,246,0.16) 100%)",
  border: "1px solid rgba(59, 130, 246, 0.28)",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer",
};

const emptyStyle: CSSProperties = {
  color: "#94a3b8",
  padding: "24px 10px",
  fontSize: "15px",
};

const tableWrapperStyle: CSSProperties = {
  overflowX: "auto",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "980px",
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "12px 10px",
  borderBottom: "1px solid rgba(148, 163, 184, 0.20)",
  fontSize: "12px",
  color: "#93c5fd",
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: "12px 10px",
  borderBottom: "1px solid rgba(148, 163, 184, 0.10)",
  fontSize: "13px",
  color: "#ffffff",
  verticalAlign: "middle",
};

const statusBadgeStyle: CSSProperties = {
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

const linkButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  color: "#93c5fd",
  fontWeight: 700,
  cursor: "pointer",
  padding: 0,
};