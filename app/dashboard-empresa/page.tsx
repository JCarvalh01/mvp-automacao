"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getPartnerCompanySession } from "@/lib/session";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import ProtectedPageLoader from "@/components/ProtectedPageLoader";
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
  name?: string;
};

type Nota = {
  id: number;
  client_id: number | null;
  competency_date: string | null;
  service_value: number | string | null;
  status: "pending" | "processing" | "success" | "error" | "canceled" | string;
  created_at?: string | null;
  error_message?: string | null;
  nfse_key?: string | null;
};

type RankingItem = {
  clientId: number | null;
  clientName: string;
  total: number;
  quantidadeNotas: number;
};

type UltimaEmissaoItem = {
  id: number;
  clientName: string;
  competencyDate: string | null;
  createdAt: string | null;
  serviceValue: number;
  status: string;
  errorMessage?: string | null;
  nfseKey?: string | null;
};

type DashboardData = {
  totalClientes: number;
  totalClientesAtivos30Dias: number;
  totalClientesInativos30Dias: number;
  totalNotas: number;
  totalNotasSuccess: number;
  totalNotasError: number;
  totalNotasPending: number;
  totalNotasProcessing: number;
  totalNotasCanceled: number;
  volumeFinanceiroTotal: number;
  rankingClientes: RankingItem[];
  ultimasEmissoes: UltimaEmissaoItem[];
};

const PRAZO_ATIVIDADE_DIAS = 30;

function formatarValor(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarDataBR(value?: string | null) {
  if (!value) return "-";

  const data = new Date(value);
  if (!isNaN(data.getTime())) {
    return data.toLocaleDateString("pt-BR");
  }

  const partes = value.split("-");
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  return value;
}

function formatarCnpj(valor?: string | null) {
  if (!valor) return "-";

  const numeros = valor.replace(/\D/g, "");
  if (numeros.length !== 14) return valor;

  return numeros.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
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

function normalizarValor(valor: number | string | null | undefined) {
  if (valor === null || valor === undefined) return 0;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  const numero = Number(String(valor).replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
}

export default function DashboardEmpresaPage() {
  const router = useRouter();
  const { loading: routeLoading, authorized } = useProtectedRoute(["partner_company"]);

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [atualizando, setAtualizando] = useState(false);

  const [dashboard, setDashboard] = useState<DashboardData>({
    totalClientes: 0,
    totalClientesAtivos30Dias: 0,
    totalClientesInativos30Dias: 0,
    totalNotas: 0,
    totalNotasSuccess: 0,
    totalNotasError: 0,
    totalNotasPending: 0,
    totalNotasProcessing: 0,
    totalNotasCanceled: 0,
    volumeFinanceiroTotal: 0,
    rankingClientes: [],
    ultimasEmissoes: [],
  });

  useEffect(() => {
    if (!routeLoading && authorized) {
      carregarDashboard();
    }
  }, [routeLoading, authorized]);

  async function carregarDashboard() {
    try {
      setLoading(true);
      setMensagem("");

      const empresaSession = getPartnerCompanySession();

      if (!empresaSession?.id) {
        router.replace("/login");
        return;
      }

      const { data: empresaData, error: empresaError } = await supabase
        .from("partner_companies")
        .select("*")
        .eq("id", empresaSession.id)
        .single<Empresa>();

      if (empresaError || !empresaData) {
        setMensagem("Nenhuma empresa parceira encontrada.");
        setLoading(false);
        return;
      }

      setEmpresa(empresaData);

      const [
        { data: clientesData, error: clientesError },
        { data: notasData, error: notasError },
      ] = await Promise.all([
        supabase
          .from("clients")
          .select("id, name")
          .eq("partner_company_id", empresaData.id),

        supabase
          .from("invoices")
          .select("id, client_id, competency_date, service_value, status, created_at, error_message, nfse_key")
          .eq("partner_company_id", empresaData.id)
          .order("created_at", { ascending: false }),
      ]);

      if (clientesError) {
        console.log("Erro ao buscar clientes:", clientesError);
      }

      if (notasError) {
        console.log("Erro ao buscar notas:", notasError);
      }

      const clientes = (clientesData || []) as Cliente[];
      const notas = (notasData || []) as Nota[];

      const dashboardCalculado = calcularDashboard(clientes, notas);
      setDashboard(dashboardCalculado);
      setLoading(false);
    } catch (error) {
      console.log("Erro inesperado ao carregar dashboard:", error);
      setMensagem("Erro inesperado ao carregar o dashboard.");
      setLoading(false);
    }
  }

  async function atualizarDashboard() {
    if (atualizando) return;

    try {
      setAtualizando(true);
      await carregarDashboard();
    } finally {
      setAtualizando(false);
    }
  }

  function calcularDashboard(clientes: Cliente[], notas: Nota[]): DashboardData {
    const mapaClientes = new Map<number, Cliente>();
    clientes.forEach((cliente) => {
      mapaClientes.set(cliente.id, cliente);
    });

    const hoje = new Date();
    const limiteAtividade = new Date();
    limiteAtividade.setDate(hoje.getDate() - PRAZO_ATIVIDADE_DIAS);

    let totalNotas = notas.length;
    let totalNotasSuccess = 0;
    let totalNotasError = 0;
    let totalNotasPending = 0;
    let totalNotasProcessing = 0;
    let totalNotasCanceled = 0;
    let volumeFinanceiroTotal = 0;

    const clientesAtivosSet = new Set<number>();
    const rankingMap = new Map<number | null, RankingItem>();

    for (const nota of notas) {
      const valor = normalizarValor(nota.service_value);
      const status = String(nota.status || "").toLowerCase();
      const dataCompetencia = parseCompetencyDate(nota.competency_date);

      if (status === "success") {
        totalNotasSuccess += 1;
        volumeFinanceiroTotal += valor;

        if (
          nota.client_id &&
          dataCompetencia &&
          dataCompetencia >= limiteAtividade
        ) {
          clientesAtivosSet.add(nota.client_id);
        }

        const cliente = nota.client_id ? mapaClientes.get(nota.client_id) : null;
        const nomeCliente =
          cliente?.name?.trim() ||
          (nota.client_id ? `Cliente #${nota.client_id}` : "Sem cliente vinculado");

        const existente = rankingMap.get(nota.client_id) || {
          clientId: nota.client_id,
          clientName: nomeCliente,
          total: 0,
          quantidadeNotas: 0,
        };

        existente.total += valor;
        existente.quantidadeNotas += 1;

        rankingMap.set(nota.client_id, existente);
      }

      if (status === "error") totalNotasError += 1;
      if (status === "pending") totalNotasPending += 1;
      if (status === "processing") totalNotasProcessing += 1;
      if (status === "canceled") totalNotasCanceled += 1;
    }

    const totalClientes = clientes.length;
    const totalClientesAtivos30Dias = clientes.filter((cliente) =>
      clientesAtivosSet.has(cliente.id)
    ).length;
    const totalClientesInativos30Dias = totalClientes - totalClientesAtivos30Dias;

    const rankingClientes = Array.from(rankingMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const ultimasEmissoes = notas.slice(0, 6).map((nota) => {
      const cliente = nota.client_id ? mapaClientes.get(nota.client_id) : null;

      return {
        id: nota.id,
        clientName:
          cliente?.name?.trim() ||
          (nota.client_id ? `Cliente #${nota.client_id}` : "Sem cliente vinculado"),
        competencyDate: nota.competency_date,
        createdAt: nota.created_at || null,
        serviceValue: normalizarValor(nota.service_value),
        status: nota.status || "",
        errorMessage: nota.error_message || null,
        nfseKey: nota.nfse_key || null,
      };
    });

    return {
      totalClientes,
      totalClientesAtivos30Dias,
      totalClientesInativos30Dias,
      totalNotas,
      totalNotasSuccess,
      totalNotasError,
      totalNotasPending,
      totalNotasProcessing,
      totalNotasCanceled,
      volumeFinanceiroTotal,
      rankingClientes,
      ultimasEmissoes,
    };
  }

  function parseCompetencyDate(value: string | null) {
    if (!value) return null;

    const data = new Date(value);

    if (!isNaN(data.getTime())) {
      return data;
    }

    const partes = value.split("-");
    if (partes.length === 3) {
      const [ano, mes, dia] = partes.map(Number);
      const dataNormalizada = new Date(ano, mes - 1, dia);
      if (!isNaN(dataNormalizada.getTime())) {
        return dataNormalizada;
      }
    }

    return null;
  }

  const statusOperacional = useMemo(() => {
    if (dashboard.totalNotasError > 0) return "Atenção necessária";
    if (dashboard.totalNotasProcessing > 0) return "Em processamento";
    return "Operacional";
  }, [dashboard.totalNotasProcessing, dashboard.totalNotasError]);

  if (routeLoading) {
    return <ProtectedPageLoader label="Validando acesso..." />;
  }

  if (!authorized) {
    return null;
  }

  return (
    <EmpresaPageShell
      title="Dashboard da Empresa"
      subtitle="Acompanhe a operação fiscal da sua carteira de clientes em tempo real."
    >
      {mensagem && <div style={errorMessageStyle}>{mensagem}</div>}

      <section style={heroCardStyle}>
        <div style={heroContentStyle}>
          <span style={heroTagStyle}>Empresa logada</span>
          <h2 style={heroTitleStyle}>{empresa?.name || "Carregando..."}</h2>
          <p style={heroTextStyle}>
            CNPJ: {formatarCnpj(empresa?.cnpj || "")} <br />
            Email: {empresa?.email || "Não informado"}
          </p>
        </div>

        <div style={heroSideWrapStyle}>
          <div style={heroInfoBoxStyle}>
            <span style={heroInfoLabelStyle}>Status do sistema</span>
            <strong style={heroInfoValueStyle}>{statusOperacional}</strong>
          </div>

          <button
            type="button"
            onClick={atualizarDashboard}
            style={{
              ...refreshButtonStyle,
              opacity: atualizando ? 0.7 : 1,
              cursor: atualizando ? "not-allowed" : "pointer",
            }}
            disabled={atualizando}
          >
            {atualizando ? "Atualizando..." : "Atualizar painel"}
          </button>
        </div>
      </section>

      {loading ? (
        <div style={loadingBoxStyle}>Carregando informações...</div>
      ) : (
        <>
          <section style={statsGridStyle}>
            <div style={statCardStyle}>
              <span style={statLabelStyle}>Total de clientes</span>
              <strong style={statValueStyle}>{dashboard.totalClientes}</strong>
              <span style={statHintStyle}>Base total cadastrada na empresa</span>
            </div>

            <div style={statCardStyle}>
              <span style={statLabelStyle}>Clientes ativos (30 dias)</span>
              <strong style={statValueStyle}>
                {dashboard.totalClientesAtivos30Dias}
              </strong>
              <span style={statHintStyle}>
                Clientes com emissão bem-sucedida nos últimos 30 dias
              </span>
            </div>

            <div style={statCardStyle}>
              <span style={statLabelStyle}>Clientes inativos (+30 dias)</span>
              <strong style={statValueStyle}>
                {dashboard.totalClientesInativos30Dias}
              </strong>
              <span style={statHintStyle}>
                Clientes sem atividade fiscal recente
              </span>
            </div>

            <div style={statCardStyle}>
              <span style={statLabelStyle}>Notas emitidas com sucesso</span>
              <strong style={statValueStyle}>{dashboard.totalNotasSuccess}</strong>
              <span style={statHintStyle}>
                Emissões concluídas e validadas no sistema
              </span>
            </div>

            <div style={statCardStyle}>
              <span style={statLabelStyle}>Notas com erro</span>
              <strong style={statValueStyle}>{dashboard.totalNotasError}</strong>
              <span style={statHintStyle}>
                Emissões que exigem revisão operacional
              </span>
            </div>

            <div style={statCardHighlightStyle}>
              <span style={statLabelStyle}>Volume financeiro processado</span>
              <strong style={statValueStyle}>
                {formatarValor(dashboard.volumeFinanceiroTotal)}
              </strong>
              <span style={statHintStyle}>
                Soma baseada apenas em notas com status success
              </span>
            </div>
          </section>

          <section style={modulesCardStyle}>
            <div style={sectionHeaderStyle}>
              <h3 style={sectionTitleStyle}>Módulos do sistema</h3>
              <p style={sectionTextStyle}>
                Acesse rapidamente as principais áreas do MVP.
              </p>
            </div>

            <div style={modulesGridStyle}>
              <Link href="/clientes" style={moduleCardStyle}>
                <span style={moduleTagStyle}>Cadastro</span>
                <h4 style={moduleTitleStyle}>Clientes</h4>
                <p style={moduleTextStyle}>
                  Cadastre, consulte e organize os clientes vinculados à empresa.
                </p>
              </Link>

              <Link
                href={empresa ? `/emitir?empresa_id=${empresa.id}` : "/emitir"}
                style={moduleCardStyle}
              >
                <span style={moduleTagStyle}>Fiscal</span>
                <h4 style={moduleTitleStyle}>Emitir Nota</h4>
                <p style={moduleTextStyle}>
                  Emita notas fiscais individuais e registre a emissão no sistema.
                </p>
              </Link>

              <Link
                href={empresa ? `/emitir-massa?empresa_id=${empresa.id}` : "/emitir-massa"}
                style={moduleCardStyle}
              >
                <span style={moduleTagStyle}>Fiscal</span>
                <h4 style={moduleTitleStyle}>Emissão em Massa</h4>
                <p style={moduleTextStyle}>
                  Importe uma planilha e emita várias notas fiscais em sequência.
                </p>
              </Link>

              <Link href="/clientes/lote" style={moduleCardStyle}>
                <span style={moduleTagStyle}>Automação</span>
                <h4 style={moduleTitleStyle}>Cadastro em Lote</h4>
                <p style={moduleTextStyle}>
                  Importe planilhas para cadastrar vários clientes de uma só vez.
                </p>
              </Link>

              <Link
                href={empresa ? `/notas?empresa_id=${empresa.id}` : "/notas"}
                style={moduleCardStyle}
              >
                <span style={moduleTagStyle}>Histórico</span>
                <h4 style={moduleTitleStyle}>Notas Emitidas</h4>
                <p style={moduleTextStyle}>
                  Consulte todas as notas emitidas dos clientes da empresa.
                </p>
              </Link>
            </div>
          </section>

          <section style={contentGridStyle}>
            <div style={panelCardStyle}>
              <div style={sectionHeaderStyle}>
                <h3 style={sectionTitleStyle}>Ranking de faturamento por cliente</h3>
                <p style={sectionTextStyle}>
                  Top 5 clientes com maior faturamento, baseado apenas em notas com status success.
                </p>
              </div>

              {dashboard.rankingClientes.length === 0 ? (
                <div style={emptyBoxStyle}>
                  Nenhum faturamento encontrado para montar o ranking.
                </div>
              ) : (
                <div style={rankingListStyle}>
                  {dashboard.rankingClientes.map((item, index) => (
                    <div key={`${item.clientId}-${index}`} style={rankingItemStyle}>
                      <div>
                        <span style={rankingPositionStyle}>#{index + 1}</span>
                        <h4 style={rankingNameStyle}>{item.clientName}</h4>
                        <p style={rankingMetaStyle}>
                          {item.quantidadeNotas} nota(s) emitida(s)
                        </p>
                      </div>

                      <strong style={rankingValueStyle}>
                        {formatarValor(item.total)}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={panelCardStyle}>
              <div style={sectionHeaderStyle}>
                <h3 style={sectionTitleStyle}>Resumo operacional</h3>
                <p style={sectionTextStyle}>
                  Visão rápida dos status das notas da carteira da empresa.
                </p>
              </div>

              <div style={summaryGridStyle}>
                <div style={summaryBoxStyle}>
                  <span style={summaryLabelStyle}>Total de notas</span>
                  <strong style={summaryValueStyle}>{dashboard.totalNotas}</strong>
                </div>

                <div style={summaryBoxStyle}>
                  <span style={summaryLabelStyle}>Notas pendentes</span>
                  <strong style={summaryValueStyle}>{dashboard.totalNotasPending}</strong>
                </div>

                <div style={summaryBoxStyle}>
                  <span style={summaryLabelStyle}>Notas processando</span>
                  <strong style={summaryValueStyle}>
                    {dashboard.totalNotasProcessing}
                  </strong>
                </div>

                <div style={summaryBoxStyle}>
                  <span style={summaryLabelStyle}>Notas canceladas</span>
                  <strong style={summaryValueStyle}>
                    {dashboard.totalNotasCanceled}
                  </strong>
                </div>
              </div>

              <div style={futureCardStyle}>
                <span style={futureTagStyle}>Foco atual</span>
                <h4 style={futureTitleStyle}>Produto centrado em emissão fiscal</h4>
                <p style={futureTextStyle}>
                  O foco atual da MVP está em emissão individual, emissão em massa,
                  histórico de notas e organização operacional da carteira de clientes.
                </p>
              </div>
            </div>
          </section>

          <section style={panelCardStyle}>
            <div style={sectionHeaderStyle}>
              <h3 style={sectionTitleStyle}>Últimas emissões</h3>
              <p style={sectionTextStyle}>
                Acompanhe rapidamente as últimas notas geradas na operação da empresa.
              </p>
            </div>

            {dashboard.ultimasEmissoes.length === 0 ? (
              <div style={emptyBoxStyle}>
                Nenhuma emissão recente encontrada.
              </div>
            ) : (
              <div style={lastInvoicesListStyle}>
                {dashboard.ultimasEmissoes.map((nota) => {
                  const statusMeta = getStatusMeta(nota.status, nota.errorMessage);

                  return (
                    <div
                      key={nota.id}
                      style={{
                        ...lastInvoiceCardStyle,
                        gridTemplateColumns: "1fr auto",
                      }}
                    >
                      <div style={lastInvoiceMainStyle}>
                        <div style={lastInvoiceTopStyle}>
                          <div>
                            <strong style={lastInvoiceTitleStyle}>
                              Nota #{nota.id}
                            </strong>
                            <div style={lastInvoiceTextStyle}>
                              Cliente: {nota.clientName}
                            </div>
                            <div style={lastInvoiceTextStyle}>
                              Competência: {formatarDataBR(nota.competencyDate)}
                            </div>
                            <div style={lastInvoiceTextStyle}>
                              Criada em: {formatarDataBR(nota.createdAt)}
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

                        <div style={lastInvoiceInfoGridStyle}>
                          <div style={lastInvoiceInfoBoxStyle}>
                            <span style={lastInvoiceInfoLabelStyle}>Valor</span>
                            <strong style={lastInvoiceInfoValueStyle}>
                              {formatarValor(nota.serviceValue)}
                            </strong>
                          </div>

                          <div style={lastInvoiceInfoBoxStyle}>
                            <span style={lastInvoiceInfoLabelStyle}>Chave NFS-e</span>
                            <strong style={lastInvoiceInfoValueStyle}>
                              {nota.nfseKey || "Aguardando"}
                            </strong>
                          </div>
                        </div>

                        {nota.errorMessage ? (
                          <div style={invoiceMessageBoxStyle}>
                            <span style={invoiceMessageTitleStyle}>
                              Detalhe operacional
                            </span>
                            <p style={invoiceMessageTextStyle}>
                              {nota.errorMessage}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </EmpresaPageShell>
  );
}

const heroCardStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  padding: "24px",
  borderRadius: "24px",
  background:
    "linear-gradient(135deg, rgba(2,6,23,0.92) 0%, rgba(15,23,42,0.96) 100%)",
  border: "1px solid rgba(59,130,246,0.16)",
  color: "#ffffff",
  marginBottom: "24px",
  boxShadow: "0 18px 45px rgba(0, 0, 0, 0.35)",
  flexWrap: "wrap",
  backdropFilter: "blur(16px)",
};

const heroContentStyle: React.CSSProperties = {
  flex: 1,
  minWidth: "280px",
};

const heroSideWrapStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  minWidth: "220px",
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

const heroInfoBoxStyle: React.CSSProperties = {
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

const refreshButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(59,130,246,0.22)",
  background: "rgba(59,130,246,0.12)",
  color: "#dbeafe",
  borderRadius: "14px",
  padding: "12px 16px",
  fontWeight: 800,
};

const loadingBoxStyle: React.CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.90) 0%, rgba(15,23,42,0.92) 100%)",
  border: "1px solid rgba(59,130,246,0.16)",
  borderRadius: "20px",
  padding: "20px",
  color: "#cbd5e1",
  backdropFilter: "blur(16px)",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "18px",
  marginBottom: "24px",
};

const statCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.90) 0%, rgba(15,23,42,0.92) 100%)",
  border: "1px solid rgba(59,130,246,0.14)",
  borderRadius: "22px",
  padding: "22px",
  boxShadow: "0 10px 24px rgba(0, 0, 0, 0.28)",
  backdropFilter: "blur(16px)",
};

const statCardHighlightStyle: React.CSSProperties = {
  ...statCardStyle,
  background:
    "linear-gradient(135deg, rgba(16,185,129,0.16) 0%, rgba(15,23,42,0.92) 100%)",
  border: "1px solid rgba(16,185,129,0.18)",
};

const statLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  color: "#93c5fd",
  marginBottom: "10px",
};

const statValueStyle: React.CSSProperties = {
  fontSize: "28px",
  color: "#ffffff",
  fontWeight: 800,
};

const statHintStyle: React.CSSProperties = {
  display: "block",
  marginTop: "10px",
  color: "#94a3b8",
  fontSize: "13px",
  lineHeight: 1.5,
};

const contentGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.2fr 0.8fr",
  gap: "18px",
  marginBottom: "24px",
};

const panelCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.90) 0%, rgba(15,23,42,0.92) 100%)",
  border: "1px solid rgba(59,130,246,0.14)",
  borderRadius: "24px",
  padding: "28px",
  boxShadow: "0 14px 38px rgba(0, 0, 0, 0.28)",
  backdropFilter: "blur(16px)",
  marginBottom: "24px",
};

const sectionHeaderStyle: React.CSSProperties = {
  marginBottom: "22px",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 800,
  color: "#ffffff",
};

const sectionTextStyle: React.CSSProperties = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#94a3b8",
  fontSize: "14px",
  lineHeight: 1.5,
};

const rankingListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

const rankingItemStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  padding: "16px 18px",
  borderRadius: "18px",
  backgroundColor: "rgba(15,23,42,0.82)",
  border: "1px solid rgba(59,130,246,0.12)",
};

const rankingPositionStyle: React.CSSProperties = {
  display: "inline-block",
  fontSize: "12px",
  fontWeight: 800,
  color: "#bfdbfe",
  backgroundColor: "rgba(59,130,246,0.16)",
  padding: "5px 10px",
  borderRadius: "999px",
  marginBottom: "10px",
};

const rankingNameStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "18px",
  color: "#ffffff",
};

const rankingMetaStyle: React.CSSProperties = {
  margin: "6px 0 0 0",
  color: "#94a3b8",
  fontSize: "13px",
};

const rankingValueStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 800,
  color: "#ffffff",
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "14px",
};

const summaryBoxStyle: React.CSSProperties = {
  backgroundColor: "rgba(15,23,42,0.82)",
  border: "1px solid rgba(59,130,246,0.12)",
  borderRadius: "18px",
  padding: "18px",
};

const summaryLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  color: "#93c5fd",
  marginBottom: "10px",
};

const summaryValueStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 800,
  color: "#ffffff",
};

const futureCardStyle: React.CSSProperties = {
  marginTop: "18px",
  borderRadius: "20px",
  padding: "20px",
  background: "linear-gradient(135deg, rgba(30,41,59,0.92) 0%, rgba(15,23,42,0.96) 100%)",
  border: "1px solid rgba(59,130,246,0.14)",
};

const futureTagStyle: React.CSSProperties = {
  display: "inline-block",
  fontSize: "12px",
  fontWeight: 700,
  color: "#bfdbfe",
  backgroundColor: "rgba(59,130,246,0.16)",
  borderRadius: "999px",
  padding: "6px 10px",
  marginBottom: "10px",
};

const futureTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "20px",
  color: "#ffffff",
};

const futureTextStyle: React.CSSProperties = {
  marginTop: "10px",
  marginBottom: 0,
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#cbd5e1",
};

const emptyBoxStyle: React.CSSProperties = {
  borderRadius: "18px",
  padding: "18px",
  backgroundColor: "rgba(15,23,42,0.82)",
  border: "1px dashed rgba(59,130,246,0.20)",
  color: "#94a3b8",
};

const lastInvoicesListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

const lastInvoiceCardStyle: React.CSSProperties = {
  display: "grid",
  gap: "16px",
  background:
    "linear-gradient(180deg, rgba(15,23,42,0.88) 0%, rgba(2,6,23,0.92) 100%)",
  border: "1px solid rgba(59,130,246,0.10)",
  borderRadius: "18px",
  padding: "18px",
};

const lastInvoiceMainStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const lastInvoiceTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const lastInvoiceTitleStyle: React.CSSProperties = {
  fontSize: "18px",
  color: "#ffffff",
  fontWeight: 800,
};

const lastInvoiceTextStyle: React.CSSProperties = {
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

const lastInvoiceInfoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
};

const lastInvoiceInfoBoxStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(59,130,246,0.08)",
  borderRadius: "14px",
  padding: "14px",
};

const lastInvoiceInfoLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#93c5fd",
  marginBottom: "6px",
  fontWeight: 700,
};

const lastInvoiceInfoValueStyle: React.CSSProperties = {
  display: "block",
  fontSize: "14px",
  color: "#ffffff",
  fontWeight: 700,
  wordBreak: "break-word",
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

const modulesCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.90) 0%, rgba(15,23,42,0.92) 100%)",
  border: "1px solid rgba(59,130,246,0.14)",
  borderRadius: "24px",
  padding: "28px",
  boxShadow: "0 14px 38px rgba(0, 0, 0, 0.28)",
  backdropFilter: "blur(16px)",
  marginBottom: "24px",
};

const modulesGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "18px",
};

const moduleCardStyle: React.CSSProperties = {
  textDecoration: "none",
  backgroundColor: "rgba(15,23,42,0.82)",
  border: "1px solid rgba(59,130,246,0.12)",
  borderRadius: "20px",
  padding: "20px",
  color: "#ffffff",
  boxShadow: "0 8px 20px rgba(0, 0, 0, 0.22)",
};

const moduleTagStyle: React.CSSProperties = {
  display: "inline-block",
  fontSize: "12px",
  fontWeight: 700,
  color: "#bfdbfe",
  backgroundColor: "rgba(59,130,246,0.16)",
  borderRadius: "999px",
  padding: "6px 10px",
  marginBottom: "12px",
};

const moduleTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "20px",
};

const moduleTextStyle: React.CSSProperties = {
  marginTop: "10px",
  marginBottom: 0,
  color: "#cbd5e1",
  lineHeight: 1.6,
};

const errorMessageStyle: React.CSSProperties = {
  marginBottom: "16px",
  backgroundColor: "rgba(239,68,68,0.12)",
  border: "1px solid rgba(239,68,68,0.22)",
  color: "#fecaca",
  borderRadius: "14px",
  padding: "12px 14px",
  fontSize: "14px",
};