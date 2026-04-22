"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import ProtectedPageLoader from "@/components/ProtectedPageLoader";
import { getClientSession, clearAllSessions } from "@/lib/session";

type DashboardClienteResponse = {
  success: boolean;
  message?: string;
  dashboard?: {
    cliente: {
      id: number;
      name: string;
      cnpj: string | null;
      client_type: string | null;
      mei_created_at: string | null;
      ativo_90_dias: boolean;
      partner_company_id?: number | null;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
      plan_type?: string | null;
      notes_limit?: number | null;
      is_blocked?: boolean | null;
      is_active?: boolean;
    };
    resumo: {
      faturamento_mes: number;
      faturamento_ano: number;
      teto_mei_anual: number;
      percentual_teto_mei: number;
      total_notas: number;
      notas_success: number;
      ultima_emissao: string | null;
    };
    ultimas_notas: Array<{
      id: number;
      status: string | null;
      service_value: number | null;
      competency_date?: string | null;
      created_at?: string | null;
      service_taker: string | null;
      service_city: string | null;
      nfse_key?: string | null;
    }>;
  };
};

type ClienteLocal = {
  id: number;
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  client_type?: string | null;
  mei_created_at?: string | null;
  is_active: boolean;
  partner_company_id: number | null;
  plan_type?: string | null;
  notes_limit?: number | null;
  is_blocked?: boolean | null;
};

export default function DashboardClientePage() {
  const router = useRouter();
  const { isLoading: loadingAccess, isAuthorized: authorized } = useProtectedRoute();

  const [cliente, setCliente] = useState<ClienteLocal | null>(null);
  const [dashboard, setDashboard] =
    useState<DashboardClienteResponse["dashboard"] | null>(null);

  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [mensagem, setMensagem] = useState("");

  async function carregarDashboard() {
    try {
      setLoadingDashboard(true);
      setMensagem("");

      const clienteSessao = getClientSession();

      if (!clienteSessao?.id) {
        router.push("/login");
        return;
      }

      const { data: clienteData, error: clienteError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clienteSessao.id)
        .single();

      if (clienteError || !clienteData) {
        throw new Error("Erro ao carregar dados do cliente.");
      }

      setCliente(clienteData as ClienteLocal);

      const response = await fetch("/api/dashboard-cliente", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: clienteSessao.id,
          partnerCompanyId: clienteData.partner_company_id || null,
        }),
      });

      const result: DashboardClienteResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Erro ao carregar dashboard do cliente.");
      }

      const dashboardAtualizado = result.dashboard
        ? {
            ...result.dashboard,
            cliente: {
              ...result.dashboard.cliente,
              partner_company_id: clienteData.partner_company_id ?? null,
              email: clienteData.email ?? null,
              phone: clienteData.phone ?? null,
              address: clienteData.address ?? null,
              plan_type: clienteData.plan_type ?? null,
              notes_limit:
                clienteData.notes_limit === null || clienteData.notes_limit === undefined
                  ? null
                  : Number(clienteData.notes_limit),
              is_blocked: Boolean(clienteData.is_blocked),
              is_active: clienteData.is_active,
            },
          }
        : null;

      setDashboard(dashboardAtualizado);
    } catch (error: any) {
      console.log(error);
      setMensagem(error?.message || "Erro ao carregar dashboard do cliente.");
    } finally {
      setLoadingDashboard(false);
    }
  }

  useEffect(() => {
    if (!loadingAccess && authorized) {
      carregarDashboard();
    }
  }, [loadingAccess, authorized]);

  const percentualTeto = useMemo(() => {
    return Number(dashboard?.resumo?.percentual_teto_mei || 0);
  }, [dashboard]);

  function formatarValor(valor: number) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatarData(value?: string | null) {
    if (!value) return "-";

    const dt = new Date(value);
    if (isNaN(dt.getTime())) return "-";

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(dt);
  }

  function maskCnpj(cnpj?: string | null) {
    if (!cnpj) return "-";

    const digits = cnpj.replace(/\D/g, "");
    if (digits.length !== 14) return cnpj;

    return `${digits.slice(0, 2)}.***.***/****-${digits.slice(-2)}`;
  }

  function statusLabel(status?: string | null) {
    const normalized = String(status || "").toLowerCase();

    if (normalized === "success") return "Success";
    if (normalized === "error") return "Error";
    if (normalized === "processing") return "Processing";
    if (normalized === "pending") return "Pending";
    if (normalized === "canceled") return "Canceled";

    return status || "-";
  }

  function statusStyle(status?: string | null): React.CSSProperties {
    const normalized = String(status || "").toLowerCase();

    if (normalized === "success") {
      return {
        ...statusBadgeBaseStyle,
        backgroundColor: "#dcfce7",
        color: "#166534",
      };
    }

    if (normalized === "error") {
      return {
        ...statusBadgeBaseStyle,
        backgroundColor: "#fee2e2",
        color: "#991b1b",
      };
    }

    if (normalized === "processing") {
      return {
        ...statusBadgeBaseStyle,
        backgroundColor: "#dbeafe",
        color: "#1d4ed8",
      };
    }

    if (normalized === "pending") {
      return {
        ...statusBadgeBaseStyle,
        backgroundColor: "#fef3c7",
        color: "#92400e",
      };
    }

    if (normalized === "canceled") {
      return {
        ...statusBadgeBaseStyle,
        backgroundColor: "#e5e7eb",
        color: "#374151",
      };
    }

    return {
      ...statusBadgeBaseStyle,
      backgroundColor: "#e5e7eb",
      color: "#374151",
    };
  }

  function sair() {
    clearAllSessions();
    router.push("/login");
  }

  function gerarHistoricoMensal() {
    if (!dashboard?.ultimas_notas?.length) return [];

    const mapa: Record<string, { total: number; qtd: number }> = {};

    dashboard.ultimas_notas.forEach((nota) => {
      if (String(nota.status || "").toLowerCase() !== "success") return;

      const data = new Date(nota.competency_date || nota.created_at || "");
      if (isNaN(data.getTime())) return;

      const chave = `${String(data.getMonth() + 1).padStart(2, "0")}/${data.getFullYear()}`;

      if (!mapa[chave]) {
        mapa[chave] = { total: 0, qtd: 0 };
      }

      mapa[chave].total += Number(nota.service_value || 0);
      mapa[chave].qtd += 1;
    });

    return Object.entries(mapa)
      .map(([mes, dados]) => ({
        mes,
        total: dados.total,
        qtd: dados.qtd,
      }))
      .reverse();
  }

  const historicoMensal = gerarHistoricoMensal();

  const faturamentoMes = dashboard?.resumo?.faturamento_mes || 0;
  const dasEstimado = faturamentoMes * 0.06;
  const mesAtual = new Date().toLocaleDateString("pt-BR", {
    month: "2-digit",
    year: "numeric",
  });
  const vencimentoDas = `20/${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const clienteDireto = Boolean(
    dashboard?.cliente && !dashboard.cliente.partner_company_id
  );

  const planoAtual = dashboard?.cliente?.plan_type || null;
  const notasRestantes =
    dashboard?.cliente?.notes_limit === null ||
    dashboard?.cliente?.notes_limit === undefined
      ? null
      : Number(dashboard.cliente.notes_limit);

  const clienteBloqueado = Boolean(dashboard?.cliente?.is_blocked);

  if (loadingAccess) {
    return <ProtectedPageLoader label="Validando acesso do cliente..." />;
  }

  if (!authorized) {
    return null;
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <div style={topBarStyle}>
          <div>
            <span style={brandMiniStyle}>MVP Automação Fiscal</span>
            <h1 style={titleStyle}>Área do Cliente</h1>
            <p style={subtitleStyle}>
              Visão fiscal individual com emissão, acompanhamento e controle do plano.
            </p>
          </div>

          <div style={topActionsStyle}>
            <Link href="/emitir-cliente" style={topLinkStyle}>
              Emitir nota
            </Link>

            <Link href="/minhas-notas" style={topLinkStyle}>
              Minhas notas
            </Link>

            <Link href="/planos" style={greenTopLinkStyle}>
              Ver planos
            </Link>

            <button onClick={sair} style={logoutButtonStyle}>
              Sair
            </button>
          </div>
        </div>

        {mensagem && <div style={errorMessageStyle}>{mensagem}</div>}

        {loadingDashboard ? (
          <div style={loadingBoxStyle}>Carregando dashboard do cliente...</div>
        ) : dashboard ? (
          <>
            <section style={heroCardStyle}>
              <div>
                <span style={heroTagStyle}>Cliente logado</span>
                <h2 style={heroTitleStyle}>{dashboard.cliente.name}</h2>
                <p style={heroTextStyle}>
                  CNPJ: {maskCnpj(dashboard.cliente.cnpj)} <br />
                  Tipo de cliente: {dashboard.cliente.client_type || "Não informado"} <br />
                  Última emissão: {formatarData(dashboard.resumo.ultima_emissao)}
                </p>
              </div>

              <div style={heroInfoWrapStyle}>
                <div style={heroInfoBoxStyle}>
                  <span style={heroInfoLabelStyle}>Status fiscal recente</span>
                  <strong style={heroInfoValueStyle}>
                    {dashboard.cliente.ativo_90_dias
                      ? "Ativo nos últimos 90 dias"
                      : "Sem emissão recente"}
                  </strong>
                </div>

                <div style={heroInfoBoxStyle}>
                  <span style={heroInfoLabelStyle}>Plano atual</span>
                  <strong style={heroInfoValueStyle}>
                    {clienteDireto ? planoAtual || "Sem plano" : "Via empresa"}
                  </strong>
                  <span style={heroInfoSubTextStyle}>
                    {clienteDireto
                      ? clienteBloqueado
                        ? "Acesso bloqueado"
                        : planoAtual
                        ? `Notas restantes: ${notasRestantes ?? 0}`
                        : "Escolha um plano para emitir"
                      : "Este cliente é gerenciado por empresa parceira"}
                  </span>
                </div>
              </div>
            </section>

            <section style={statsGridStyle}>
              <div style={statCardStyle}>
                <span style={statLabelStyle}>Faturamento do mês</span>
                <strong style={statValueStyle}>
                  {formatarValor(dashboard.resumo.faturamento_mes)}
                </strong>
              </div>

              <div style={statCardStyle}>
                <span style={statLabelStyle}>Faturamento do ano</span>
                <strong style={statValueStyle}>
                  {formatarValor(dashboard.resumo.faturamento_ano)}
                </strong>
              </div>

              <div style={statCardStyle}>
                <span style={statLabelStyle}>Teto MEI</span>
                <strong style={statValueStyle}>
                  {formatarValor(dashboard.resumo.teto_mei_anual)}
                </strong>
              </div>

              <div style={statCardStyle}>
                <span style={statLabelStyle}>% do teto</span>
                <strong style={statValueStyle}>{percentualTeto.toFixed(2)}%</strong>
              </div>

              <div style={statCardStyle}>
                <span style={statLabelStyle}>Total de notas</span>
                <strong style={statValueStyle}>{dashboard.resumo.total_notas}</strong>
              </div>

              <div style={statCardStyle}>
                <span style={statLabelStyle}>Notas com sucesso</span>
                <strong style={statValueStyle}>{dashboard.resumo.notas_success}</strong>
              </div>
            </section>

            <section style={contentGridStyle}>
              <div style={panelCardStyle}>
                <div style={sectionHeaderStyle}>
                  <h3 style={sectionTitleStyle}>Status do plano</h3>
                  <p style={sectionTextStyle}>
                    Controle do acesso do cliente dentro da MVP.
                  </p>
                </div>

                <div style={summaryGridStyle}>
                  <div style={summaryBoxStyle}>
                    <span style={summaryLabelStyle}>Vínculo</span>
                    <strong style={summaryValueStyle}>
                      {clienteDireto ? "Cliente direto" : "Cliente de empresa"}
                    </strong>
                  </div>

                  <div style={summaryBoxStyle}>
                    <span style={summaryLabelStyle}>Plano</span>
                    <strong style={summaryValueStyle}>
                      {clienteDireto ? planoAtual || "Sem plano" : "Via empresa"}
                    </strong>
                  </div>

                  <div style={summaryBoxStyle}>
                    <span style={summaryLabelStyle}>Notas restantes</span>
                    <strong style={summaryValueStyle}>
                      {clienteDireto ? notasRestantes ?? 0 : "Ilimitado pela empresa"}
                    </strong>
                  </div>

                  <div style={summaryBoxStyle}>
                    <span style={summaryLabelStyle}>Status do acesso</span>
                    <strong style={summaryValueStyle}>
                      {clienteBloqueado ? "Bloqueado" : "Liberado"}
                    </strong>
                  </div>
                </div>

                {clienteDireto && (
                  <div style={futureCardStyle}>
                    <span style={futureTagStyle}>Plano MVP</span>
                    <h4 style={futureTitleStyle}>Gerencie seu acesso</h4>
                    <p style={futureTextStyle}>
                      {planoAtual
                        ? "Seu plano está registrado. Se quiser alterar ou renovar, acesse a página de planos."
                        : "Você ainda não escolheu um plano. Selecione um para liberar a emissão das notas."}
                    </p>

                    <div style={futureActionsStyle}>
                      <Link href="/planos" style={planButtonStyle}>
                        Ver planos
                      </Link>

                      <Link href="/emitir-cliente" style={secondaryPlanButtonStyle}>
                        Ir para emissão
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <div style={panelCardStyle}>
                <div style={sectionHeaderStyle}>
                  <h3 style={sectionTitleStyle}>Alertas fiscais</h3>
                  <p style={sectionTextStyle}>
                    Situações que exigem atenção imediata.
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {clienteDireto && !planoAtual && (
                    <div style={alertYellowStyle}>⚠️ Escolha um plano para liberar a emissão</div>
                  )}

                  {clienteDireto && clienteBloqueado && (
                    <div style={alertRedStyle}>🚨 Seu acesso está bloqueado</div>
                  )}

                  {clienteDireto &&
                    planoAtual &&
                    !clienteBloqueado &&
                    notasRestantes !== null &&
                    notasRestantes <= 0 && (
                      <div style={alertYellowStyle}>⚠️ Você atingiu o limite do seu plano</div>
                    )}

                  {percentualTeto >= 100 && (
                    <div style={alertRedStyle}>🚨 Cliente ultrapassou o teto MEI</div>
                  )}

                  {percentualTeto >= 80 && percentualTeto < 100 && (
                    <div style={alertYellowStyle}>⚠️ Cliente próximo do teto MEI</div>
                  )}

                  {!dashboard.cliente.ativo_90_dias && (
                    <div style={alertGrayStyle}>
                      Cliente sem emissão nos últimos 90 dias
                    </div>
                  )}

                  {dashboard.resumo.notas_success === 0 && (
                    <div style={alertRedStyle}>
                      Nenhuma nota válida com status success
                    </div>
                  )}

                  {!clienteBloqueado &&
                    (planoAtual || !clienteDireto) &&
                    (notasRestantes === null || notasRestantes > 0 || !clienteDireto) &&
                    percentualTeto < 80 &&
                    dashboard.cliente.ativo_90_dias &&
                    dashboard.resumo.notas_success > 0 && (
                      <div style={alertGreenStyle}>Situação fiscal saudável</div>
                    )}
                </div>
              </div>
            </section>

            <section style={contentGridStyle}>
              <div style={panelCardStyle}>
                <div style={sectionHeaderStyle}>
                  <h3 style={sectionTitleStyle}>DAS do mês</h3>
                  <p style={sectionTextStyle}>
                    Base inicial para automação do DAS.
                  </p>
                </div>

                <div style={summaryGridStyle}>
                  <div style={summaryBoxStyle}>
                    <span style={summaryLabelStyle}>Competência</span>
                    <strong style={summaryValueStyle}>{mesAtual}</strong>
                  </div>

                  <div style={summaryBoxStyle}>
                    <span style={summaryLabelStyle}>Valor estimado</span>
                    <strong style={summaryValueStyle}>
                      {formatarValor(dasEstimado)}
                    </strong>
                  </div>

                  <div style={summaryBoxStyle}>
                    <span style={summaryLabelStyle}>Vencimento</span>
                    <strong style={summaryValueStyle}>{vencimentoDas}</strong>
                  </div>

                  <div style={summaryBoxStyle}>
                    <span style={summaryLabelStyle}>Status</span>
                    <strong style={summaryValueStyle}>Pendente</strong>
                  </div>
                </div>

                <div style={futureCardStyle}>
                  <span style={futureTagStyle}>Próxima evolução</span>
                  <h4 style={futureTitleStyle}>Integração real com DAS</h4>
                  <p style={futureTextStyle}>
                    Aqui vamos integrar cálculo automático, geração e controle de pagamento.
                  </p>
                </div>
              </div>

              <div style={panelCardStyle}>
                <div style={sectionHeaderStyle}>
                  <h3 style={sectionTitleStyle}>Histórico mensal</h3>
                  <p style={sectionTextStyle}>Evolução do faturamento do cliente.</p>
                </div>

                {historicoMensal.length === 0 ? (
                  <div style={emptyBoxStyle}>Sem histórico disponível.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {historicoMensal.map((item) => (
                      <div key={item.mes} style={rankingItemStyle}>
                        <div>
                          <h4 style={rankingNameStyle}>{item.mes}</h4>
                          <p style={rankingMetaStyle}>{item.qtd} nota(s)</p>
                        </div>

                        <strong style={rankingValueStyle}>
                          {formatarValor(item.total)}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section style={modulesCardStyle}>
              <div style={sectionHeaderStyle}>
                <h3 style={sectionTitleStyle}>Últimas notas do cliente</h3>
                <p style={sectionTextStyle}>
                  Registros recentes vinculados ao cliente logado.
                </p>
              </div>

              {dashboard.ultimas_notas.length === 0 ? (
                <div style={emptyBoxStyle}>
                  Nenhuma nota encontrada para este cliente.
                </div>
              ) : (
                <div style={tableWrapperStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={tableHeadStyle}>ID</th>
                        <th style={tableHeadStyle}>Status</th>
                        <th style={tableHeadStyle}>Tomador</th>
                        <th style={tableHeadStyle}>Cidade</th>
                        <th style={tableHeadStyle}>Valor</th>
                        <th style={tableHeadStyle}>Competência</th>
                        <th style={tableHeadStyle}>Chave NFS-e</th>
                      </tr>
                    </thead>

                    <tbody>
                      {dashboard.ultimas_notas.map((nota) => (
                        <tr key={nota.id}>
                          <td style={tableCellStyle}>{nota.id}</td>
                          <td style={tableCellStyle}>
                            <span style={statusStyle(nota.status)}>
                              {statusLabel(nota.status)}
                            </span>
                          </td>
                          <td style={tableCellStyle}>{nota.service_taker || "-"}</td>
                          <td style={tableCellStyle}>{nota.service_city || "-"}</td>
                          <td style={tableCellStyle}>
                            {formatarValor(Number(nota.service_value || 0))}
                          </td>
                          <td style={tableCellStyle}>
                            {formatarData(nota.competency_date || nota.created_at || null)}
                          </td>
                          <td style={tableCellStyle}>{nota.nfse_key || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : (
          <div style={loadingBoxStyle}>
            Não foi possível carregar o dashboard do cliente.
          </div>
        )}
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #eef4ff 0%, #f8fafc 100%)",
  padding: "32px 20px",
  fontFamily: "Arial, sans-serif",
};

const containerStyle: React.CSSProperties = {
  maxWidth: "1280px",
  margin: "0 auto",
};

const topBarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "24px",
  flexWrap: "wrap",
};

const topActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
  flexWrap: "wrap",
};

const topLinkStyle: React.CSSProperties = {
  textDecoration: "none",
  backgroundColor: "#ffffff",
  color: "#0f172a",
  border: "1px solid #dbeafe",
  borderRadius: "12px",
  padding: "12px 16px",
  fontSize: "14px",
  fontWeight: 700,
};

const greenTopLinkStyle: React.CSSProperties = {
  textDecoration: "none",
  backgroundColor: "#22c55e",
  color: "#ffffff",
  border: "1px solid #22c55e",
  borderRadius: "12px",
  padding: "12px 16px",
  fontSize: "14px",
  fontWeight: 700,
};

const brandMiniStyle: React.CSSProperties = {
  display: "inline-block",
  fontSize: "12px",
  fontWeight: 700,
  color: "#2563eb",
  backgroundColor: "#dbeafe",
  borderRadius: "999px",
  padding: "8px 12px",
  marginBottom: "12px",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "34px",
  fontWeight: 800,
  color: "#0f172a",
};

const subtitleStyle: React.CSSProperties = {
  marginTop: "10px",
  marginBottom: 0,
  color: "#64748b",
  fontSize: "15px",
  lineHeight: 1.6,
};

const logoutButtonStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  color: "#dc2626",
  border: "1px solid #fecaca",
  borderRadius: "12px",
  padding: "12px 16px",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
};

const heroCardStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  padding: "24px",
  borderRadius: "24px",
  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
  color: "#ffffff",
  marginBottom: "24px",
  boxShadow: "0 18px 45px rgba(15, 23, 42, 0.18)",
  flexWrap: "wrap",
};

const heroTagStyle: React.CSSProperties = {
  display: "inline-block",
  fontSize: "12px",
  fontWeight: 700,
  color: "#bfdbfe",
  backgroundColor: "rgba(255,255,255,0.08)",
  padding: "8px 12px",
  borderRadius: "999px",
  marginBottom: "12px",
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "28px",
  fontWeight: 800,
};

const heroTextStyle: React.CSSProperties = {
  marginTop: "10px",
  marginBottom: 0,
  color: "#cbd5e1",
  fontSize: "15px",
  lineHeight: 1.6,
};

const heroInfoWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: "14px",
  minWidth: "260px",
};

const heroInfoBoxStyle: React.CSSProperties = {
  minWidth: "260px",
  padding: "18px",
  borderRadius: "18px",
  backgroundColor: "rgba(255,255,255,0.08)",
};

const heroInfoLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#cbd5e1",
  marginBottom: "8px",
};

const heroInfoValueStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 800,
};

const heroInfoSubTextStyle: React.CSSProperties = {
  display: "block",
  marginTop: "8px",
  color: "#cbd5e1",
  fontSize: "13px",
  lineHeight: 1.5,
};

const loadingBoxStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
  padding: "20px",
  color: "#475569",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "18px",
  marginBottom: "24px",
};

const statCardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "22px",
  padding: "22px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
};

const statLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  color: "#64748b",
  marginBottom: "10px",
};

const statValueStyle: React.CSSProperties = {
  fontSize: "28px",
  color: "#0f172a",
  fontWeight: 800,
};

const contentGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "18px",
  marginBottom: "24px",
};

const panelCardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "24px",
  padding: "28px",
  boxShadow: "0 14px 38px rgba(15, 23, 42, 0.06)",
};

const sectionHeaderStyle: React.CSSProperties = {
  marginBottom: "22px",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 800,
  color: "#111827",
};

const sectionTextStyle: React.CSSProperties = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: 1.5,
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "14px",
};

const summaryBoxStyle: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  padding: "18px",
};

const summaryLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  color: "#64748b",
  marginBottom: "10px",
};

const summaryValueStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 800,
  color: "#0f172a",
};

const futureCardStyle: React.CSSProperties = {
  marginTop: "18px",
  borderRadius: "20px",
  padding: "20px",
  background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)",
  border: "1px solid #dbeafe",
};

const futureTagStyle: React.CSSProperties = {
  display: "inline-block",
  fontSize: "12px",
  fontWeight: 700,
  color: "#1d4ed8",
  backgroundColor: "#dbeafe",
  borderRadius: "999px",
  padding: "6px 10px",
  marginBottom: "10px",
};

const futureTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "20px",
  color: "#0f172a",
};

const futureTextStyle: React.CSSProperties = {
  marginTop: "10px",
  marginBottom: 0,
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#475569",
};

const futureActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "16px",
};

const planButtonStyle: React.CSSProperties = {
  textDecoration: "none",
  backgroundColor: "#22c55e",
  color: "#ffffff",
  border: "1px solid #22c55e",
  borderRadius: "12px",
  padding: "12px 14px",
  fontSize: "14px",
  fontWeight: 800,
};

const secondaryPlanButtonStyle: React.CSSProperties = {
  textDecoration: "none",
  backgroundColor: "#ffffff",
  color: "#0f172a",
  border: "1px solid #dbeafe",
  borderRadius: "12px",
  padding: "12px 14px",
  fontSize: "14px",
  fontWeight: 800,
};

const modulesCardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "24px",
  padding: "28px",
  boxShadow: "0 14px 38px rgba(15, 23, 42, 0.06)",
};

const tableWrapperStyle: React.CSSProperties = {
  overflowX: "auto",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const tableHeadStyle: React.CSSProperties = {
  textAlign: "left",
  fontSize: "13px",
  color: "#64748b",
  fontWeight: 700,
  padding: "14px 12px",
  borderBottom: "1px solid #e2e8f0",
};

const tableCellStyle: React.CSSProperties = {
  padding: "14px 12px",
  borderBottom: "1px solid #edf2f7",
  color: "#0f172a",
  fontSize: "14px",
  verticalAlign: "middle",
};

const emptyBoxStyle: React.CSSProperties = {
  borderRadius: "18px",
  padding: "18px",
  backgroundColor: "#f8fafc",
  border: "1px dashed #cbd5e1",
  color: "#64748b",
};

const rankingItemStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  padding: "16px 18px",
  borderRadius: "18px",
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const rankingNameStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "18px",
  color: "#0f172a",
};

const rankingMetaStyle: React.CSSProperties = {
  margin: "6px 0 0 0",
  color: "#64748b",
  fontSize: "13px",
};

const rankingValueStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 800,
  color: "#0f172a",
};

const statusBadgeBaseStyle: React.CSSProperties = {
  display: "inline-block",
  fontSize: "12px",
  fontWeight: 700,
  borderRadius: "999px",
  padding: "6px 10px",
};

const alertRedStyle: React.CSSProperties = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "12px",
  borderRadius: "12px",
  fontWeight: 600,
};

const alertYellowStyle: React.CSSProperties = {
  background: "#fef3c7",
  color: "#92400e",
  padding: "12px",
  borderRadius: "12px",
  fontWeight: 600,
};

const alertGreenStyle: React.CSSProperties = {
  background: "#dcfce7",
  color: "#166534",
  padding: "12px",
  borderRadius: "12px",
  fontWeight: 600,
};

const alertGrayStyle: React.CSSProperties = {
  background: "#e5e7eb",
  color: "#374151",
  padding: "12px",
  borderRadius: "12px",
  fontWeight: 600,
};

const errorMessageStyle: React.CSSProperties = {
  marginBottom: "16px",
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  borderRadius: "14px",
  padding: "12px 14px",
  fontSize: "14px",
};