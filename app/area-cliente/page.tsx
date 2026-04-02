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
  plan_type?: string | null;
  notes_limit?: number | null;
  is_blocked?: boolean | null;
  subscription_status?: string | null;
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
};

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

function formatCnpj(value?: string | null) {
  if (!value) return "-";

  const numeros = value.replace(/\D/g, "");
  if (numeros.length !== 14) return value;

  return numeros.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

function getStatusMeta(status?: string | null) {
  const valor = String(status || "").toLowerCase();

  if (valor === "success") {
    return {
      label: "Emitida",
      bg: "rgba(16,185,129,0.14)",
      border: "1px solid rgba(16,185,129,0.25)",
      color: "#bbf7d0",
    };
  }

  if (valor === "pending" || valor === "processing") {
    return {
      label: "Processando",
      bg: "rgba(245,158,11,0.14)",
      border: "1px solid rgba(245,158,11,0.25)",
      color: "#fde68a",
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

function getPlanoLabel(planType?: string | null, partnerCompanyId?: number | null) {
  if (partnerCompanyId) return "Via empresa";

  const plano = String(planType || "").toLowerCase();

  if (plano === "essencial") return "Essencial";
  if (plano === "full") return "Full";
  if (plano === "free") return "Free";

  return "Sem plano";
}

export default function AreaClientePage() {
  const [cliente, setCliente] = useState<ClienteSession | null>(null);
  const [notas, setNotas] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [erro, setErro] = useState("");
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 768);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function carregarDados() {
    try {
      setLoading(true);
      setErro("");

      const session = getClientSession();

      if (!session?.id) {
        window.location.href = "/login";
        return;
      }

      const { data: clienteDb, error: clienteDbError } = await supabase
        .from("clients")
        .select(
          "plan_type, notes_limit, is_blocked, subscription_status, partner_company_id, is_active"
        )
        .eq("id", session.id)
        .single();

      if (clienteDbError) {
        console.error("Erro ao buscar dados do cliente:", clienteDbError);
      }

      const clienteComPlano: ClienteSession = {
        ...session,
        plan_type: clienteDb?.plan_type || null,
        notes_limit: clienteDb?.notes_limit ?? 0,
        is_blocked: clienteDb?.is_blocked ?? false,
        subscription_status: clienteDb?.subscription_status ?? null,
        partner_company_id:
          clienteDb?.partner_company_id ?? session.partner_company_id ?? null,
        is_active: clienteDb?.is_active ?? session.is_active,
      };

      setCliente(clienteComPlano);

      localStorage.setItem("client", JSON.stringify(clienteComPlano));

      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("client_id", session.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar notas do cliente:", error);
        setErro("Não foi possível carregar seus dados no momento.");
        setNotas([]);
        return;
      }

      setNotas(data || []);
    } catch (error) {
      console.error("Erro inesperado ao carregar área do cliente:", error);
      setErro("Ocorreu um erro inesperado ao carregar a área do cliente.");
      setNotas([]);
    } finally {
      setLoading(false);
    }
  }

  function abrirArquivo(url: string | null, tipo: "PDF" | "XML") {
    if (!url) return;
    window.open(url, "_blank");
  }

  function sair() {
    if (saindo) return;

    try {
      setSaindo(true);
      localStorage.removeItem("client");
      localStorage.removeItem("clientSession");
      localStorage.removeItem("cliente");
      localStorage.removeItem("user");
      window.location.href = "/login";
    } catch (error) {
      console.error("Erro ao encerrar sessão do cliente:", error);
      setSaindo(false);
      alert("Não foi possível sair neste momento.");
    }
  }

  const usoPlano = useMemo(() => {
    if (!cliente) return null;

    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    const notasMes = notas.filter((n) => {
      if (!n.created_at) return false;
      const d = new Date(n.created_at);
      return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
    });

    const ehClienteEmpresa = Boolean(cliente.partner_company_id);

    return {
      usadas: notasMes.length,
      limite: ehClienteEmpresa ? 999999 : Number(cliente.notes_limit || 0),
      plano: ehClienteEmpresa ? "empresa" : cliente.plan_type || null,
      bloqueado: Boolean(cliente.is_blocked),
      ehClienteEmpresa,
      subscriptionStatus: cliente.subscription_status || null,
      ativo: Boolean(cliente.is_active),
    };
  }, [notas, cliente]);

  function emitirRapido() {
    if (!usoPlano || !cliente) return;

    if (!usoPlano.ativo) {
      alert("Seu cadastro está inativo no momento.");
      return;
    }

    if (usoPlano.bloqueado) {
      alert("Seu acesso está bloqueado no momento.");
      return;
    }

    if (usoPlano.ehClienteEmpresa) {
      window.location.href = "/emitir-cliente";
      return;
    }

    if (!usoPlano.plano || usoPlano.plano === "free") {
      alert("Escolha um plano antes de emitir.");
      window.location.href = "/planos";
      return;
    }

    if (usoPlano.limite > 0 && usoPlano.usadas >= usoPlano.limite) {
      alert(
        "Você atingiu o limite mensal do seu plano. Faça upgrade para continuar emitindo."
      );
      return;
    }

    window.location.href = "/emitir-cliente";
  }

  const resumo = useMemo(() => {
    const totalNotas = notas.length;

    const faturamento = notas.reduce((acc, nota) => {
      const status = String(nota.status || "").toLowerCase();
      if (status !== "success") return acc;

      const valor = Number(nota.service_value ?? nota.amount ?? 0);
      return acc + (Number.isNaN(valor) ? 0 : valor);
    }, 0);

    const ultimaNota = notas[0] || null;

    const emitidas = notas.filter(
      (nota) => String(nota.status || "").toLowerCase() === "success"
    ).length;

    return {
      totalNotas,
      faturamento,
      ultimaNota,
      emitidas,
    };
  }, [notas]);

  const ultimasNotas = useMemo(() => notas.slice(0, 6), [notas]);

  const ultimaNotaStatus = useMemo(() => {
    if (!resumo.ultimaNota) return "Nenhuma emissão ainda";

    const status = String(resumo.ultimaNota.status || "").toLowerCase();

    if (status === "success") return "Última nota emitida com sucesso";
    if (status === "pending" || status === "processing") {
      return "Última nota ainda está em processamento";
    }
    if (status === "error") return "Última nota teve falha na emissão";
    if (status === "canceled") return "Última nota foi cancelada";

    return "Última emissão registrada";
  }, [resumo.ultimaNota]);

  const statusPlanoTexto = useMemo(() => {
    if (!usoPlano) return "Carregando plano...";

    if (!usoPlano.ativo) {
      return "Seu cadastro está inativo";
    }

    if (usoPlano.bloqueado) {
      return "Seu acesso está bloqueado";
    }

    if (usoPlano.ehClienteEmpresa) {
      return "Acesso liberado pela empresa responsável";
    }

    if (!usoPlano.plano || usoPlano.plano === "free") {
      return "Escolha um plano para começar a emitir";
    }

    if (usoPlano.limite > 0 && usoPlano.usadas >= usoPlano.limite) {
      return "Você atingiu o limite do seu plano";
    }

    return `Plano ${getPlanoLabel(usoPlano.plano)} ativo`;
  }, [usoPlano]);

  const textoUsoPlano = useMemo(() => {
    if (!usoPlano) return "-";

    if (usoPlano.ehClienteEmpresa) {
      return `${usoPlano.usadas} / ∞`;
    }

    if (!usoPlano.plano || usoPlano.plano === "free") return "Sem plano";

    if (usoPlano.limite === 999999) {
      return `${usoPlano.usadas} / ∞`;
    }

    return `${usoPlano.usadas} / ${usoPlano.limite}`;
  }, [usoPlano]);

  const whatsappLink = `https://wa.me/5511982966310?text=${encodeURIComponent(
    "Olá! Preciso de ajuda na plataforma MVP Automação Fiscal. Poderia me auxiliar?"
  )}`;

  if (loading) {
    return <ProtectedPageLoader label="Carregando área do cliente..." />;
  }

  return (
    <main
      style={{
        ...pageStyle,
        padding: isMobile ? "18px 12px 28px" : "28px 16px 44px",
      }}
    >
      <div style={glowTopStyle} />
      <div style={glowBottomStyle} />

      <div style={containerStyle}>
        {erro ? (
          <section style={errorCardStyle}>
            <div>
              <h2 style={errorTitleStyle}>
                Não foi possível carregar a área do cliente
              </h2>
              <p style={errorTextStyle}>{erro}</p>
            </div>

            <button
              type="button"
              onClick={carregarDados}
              style={retryButtonStyle}
            >
              Tentar novamente
            </button>
          </section>
        ) : null}

        <section
          style={{
            ...heroCardStyle,
            gridTemplateColumns: isMobile ? "1fr" : "1.35fr 0.65fr",
            padding: isMobile ? "18px" : "24px",
            borderRadius: isMobile ? "22px" : "28px",
          }}
        >
          <div style={heroContentStyle}>
            <div style={brandRowStyle}>
              <span style={brandPillStyle}>MVP_ AUTOMAÇÃO FISCAL</span>
              <span style={welcomePillStyle}>Ambiente do cliente</span>
            </div>

            <h1
              style={{
                ...heroTitleStyle,
                fontSize: isMobile ? "30px" : "42px",
              }}
            >
              Painel do cliente
            </h1>

            <p
              style={{
                ...heroSubtitleStyle,
                fontSize: isMobile ? "14px" : "15px",
              }}
            >
              Acompanhe suas emissões, visualize seus arquivos e realize novas
              notas com uma experiência rápida, moderna e organizada.
            </p>

            <div
              style={{
                ...heroInfoGridStyle,
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(5, minmax(0, 1fr))",
              }}
            >
              <div style={heroInfoCardStyle}>
                <span style={heroInfoLabelStyle}>Cliente</span>
                <strong style={heroInfoValueStyle}>{cliente?.name || "-"}</strong>
              </div>

              <div style={heroInfoCardStyle}>
                <span style={heroInfoLabelStyle}>CNPJ</span>
                <strong style={heroInfoValueStyle}>
                  {formatCnpj(cliente?.cnpj)}
                </strong>
              </div>

              <div style={heroInfoCardStyle}>
                <span style={heroInfoLabelStyle}>Email</span>
                <strong style={heroInfoValueStyle}>{cliente?.email || "-"}</strong>
              </div>

              <div style={heroInfoCardStyle}>
                <span style={heroInfoLabelStyle}>Plano</span>
                <strong style={heroInfoValueStyle}>
                  {getPlanoLabel(usoPlano?.plano, cliente?.partner_company_id)}
                </strong>
              </div>

              <div style={heroInfoCardStyle}>
                <span style={heroInfoLabelStyle}>Uso mensal</span>
                <strong style={heroInfoValueStyle}>{textoUsoPlano}</strong>
              </div>
            </div>
          </div>

          <div style={heroSideStyle}>
            <div style={profileCardStyle}>
              <div style={avatarStyle}>
                {(cliente?.name || "C").trim().charAt(0).toUpperCase()}
              </div>

              <div>
                <div style={profileNameStyle}>{cliente?.name || "Cliente"}</div>
                <div style={profileSubStyle}>Acesso cliente</div>
              </div>
            </div>

            <div style={statusPanelStyle}>
              <span style={statusPanelLabelStyle}>Status do painel</span>
              <strong style={statusPanelValueStyle}>{ultimaNotaStatus}</strong>
              <span style={statusPanelHintStyle}>
                {statusPlanoTexto}. Use os atalhos abaixo para emitir uma nova nota
                ou consultar seu histórico.
              </span>
            </div>

            <div style={heroActionStackStyle}>
              <button
                type="button"
                onClick={emitirRapido}
                style={heroPrimaryActionStyle}
              >
                Emitir nota rápida
              </button>

              <Link href="/minhas-notas" style={heroSecondaryActionStyle}>
                Ver minhas notas
              </Link>

              {!cliente?.partner_company_id ? (
                <Link href="/planos" style={upgradeButtonStyle}>
                  Fazer upgrade de plano
                </Link>
              ) : (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={upgradeButtonStyle}
                >
                  Falar com o suporte
                </a>
              )}

              <button
                type="button"
                onClick={sair}
                style={{
                  ...logoutButtonStyle,
                  opacity: saindo ? 0.75 : 1,
                  cursor: saindo ? "not-allowed" : "pointer",
                }}
                disabled={saindo}
              >
                {saindo ? "Saindo..." : "Sair da conta"}
              </button>
            </div>
          </div>
        </section>

        <section
          style={{
            ...metricsGridStyle,
            gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))",
          }}
        >
          <div style={metricCardStyle}>
            <div style={metricTopStyle}>
              <span style={metricLabelStyle}>Total de notas</span>
              <span style={metricIconStyle}>📄</span>
            </div>
            <strong style={metricValueStyle}>{resumo.totalNotas}</strong>
            <span style={metricHintStyle}>
              Todas as emissões vinculadas ao seu cadastro
            </span>
          </div>

          <div style={metricCardStyle}>
            <div style={metricTopStyle}>
              <span style={metricLabelStyle}>Faturamento total</span>
              <span style={metricIconStyle}>💰</span>
            </div>
            <strong style={metricValueStyle}>
              {formatCurrency(resumo.faturamento)}
            </strong>
            <span style={metricHintStyle}>
              Soma apenas das notas emitidas com sucesso
            </span>
          </div>

          <div style={metricCardStyle}>
            <div style={metricTopStyle}>
              <span style={metricLabelStyle}>Notas emitidas</span>
              <span style={metricIconStyle}>✅</span>
            </div>
            <strong style={metricValueStyle}>{resumo.emitidas}</strong>
            <span style={metricHintStyle}>
              Notas concluídas com sucesso no sistema
            </span>
          </div>

          <div style={metricCardStyleHighlightStyle}>
            <div style={metricTopStyle}>
              <span style={metricLabelStyle}>Última emissão</span>
              <span style={metricIconStyle}>🚀</span>
            </div>
            <strong style={metricValueStyle}>
              {resumo.ultimaNota ? `#${resumo.ultimaNota.id}` : "Nenhuma"}
            </strong>
            <span style={metricHintStyle}>
              {resumo.ultimaNota
                ? `Competência ${formatDateBR(resumo.ultimaNota.competency_date)}`
                : "Quando houver uma nova emissão, ela aparecerá aqui"}
            </span>
          </div>
        </section>

        <section style={quickActionsWrapStyle}>
          <div style={quickActionsHeaderStyle}>
            <h2 style={sectionTitleStyle}>Ações rápidas</h2>
            <p style={sectionSubtitleStyle}>
              Atalhos principais para o seu dia a dia dentro da plataforma.
            </p>
          </div>

          <div
            style={{
              ...quickActionsGridStyle,
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
            }}
          >
            <button
              type="button"
              onClick={emitirRapido}
              style={quickPrimaryCardButtonStyle}
            >
              <span style={quickCardBadgeStyle}>Emissão</span>
              <strong style={quickCardTitleStyle}>Emitir nova nota</strong>
              <span style={quickCardTextStyle}>
                Gere uma nova nota usando a emissão rápida da sua conta.
              </span>
            </button>

            <Link href="/minhas-notas" style={quickSecondaryCardStyle}>
              <span style={quickCardBadgeStyle}>Arquivos</span>
              <strong style={quickCardTitleStyle}>Consultar minhas notas</strong>
              <span style={quickCardTextStyle}>
                Visualize seu histórico e acesse PDFs e XMLs.
              </span>
            </Link>

            {!cliente?.partner_company_id ? (
              <Link href="/planos" style={quickUpgradeCardStyle}>
                <span style={quickCardBadgeStyle}>Upgrade</span>
                <strong style={quickCardTitleStyle}>Trocar de plano</strong>
                <span style={quickCardTextStyle}>
                  Compare os planos e faça upgrade para continuar crescendo.
                </span>
              </Link>
            ) : (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                style={quickUpgradeCardStyle}
              >
                <span style={quickCardBadgeStyle}>Suporte</span>
                <strong style={quickCardTitleStyle}>Falar com o suporte</strong>
                <span style={quickCardTextStyle}>
                  Seu acesso é gerenciado pela empresa responsável.
                </span>
              </a>
            )}
          </div>
        </section>

        <section style={planoStatusPanelStyle}>
          <div style={planoStatusHeaderStyle}>
            <div>
              <h2 style={panelTitleStyle}>Plano e limite</h2>
              <p style={panelSubtitleStyle}>
                Acompanhe o status atual da sua assinatura e o consumo do mês.
              </p>
            </div>

            {!cliente?.partner_company_id ? (
              <Link href="/planos" style={upgradeMiniButtonStyle}>
                Ver planos
              </Link>
            ) : (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                style={upgradeMiniButtonStyle}
              >
                Suporte
              </a>
            )}
          </div>

          <div
            style={{
              ...planoStatusGridStyle,
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
            }}
          >
            <div style={planoStatusCardStyle}>
              <span style={noteInfoLabelStyle}>Plano atual</span>
              <strong style={planoStatusValueStyle}>
                {getPlanoLabel(usoPlano?.plano, cliente?.partner_company_id)}
              </strong>
              <span style={metricHintStyle}>
                {cliente?.partner_company_id
                  ? "Seu acesso está vinculado à empresa responsável."
                  : usoPlano?.plano
                  ? "Seu plano está vinculado ao seu cadastro."
                  : "Você ainda não escolheu um plano."}
              </span>
            </div>

            <div style={planoStatusCardStyle}>
              <span style={noteInfoLabelStyle}>Uso mensal</span>
              <strong style={planoStatusValueStyle}>{textoUsoPlano}</strong>
              <span style={metricHintStyle}>
                {cliente?.partner_company_id
                  ? "Cliente de empresa com emissão liberada pela empresa."
                  : usoPlano?.limite === 999999
                  ? "Plano com emissão ilimitada."
                  : "Quantidade usada no mês atual."}
              </span>
            </div>

            <div style={planoStatusCardStyle}>
              <span style={noteInfoLabelStyle}>Situação</span>
              <strong style={planoStatusValueStyle}>{statusPlanoTexto}</strong>
              <span style={metricHintStyle}>
                {cliente?.partner_company_id
                  ? "Em caso de bloqueio, fale com a empresa responsável."
                  : "Faça upgrade caso precise ampliar sua operação."}
              </span>
            </div>
          </div>
        </section>

        <section style={panelStyle}>
          <div
            style={{
              ...panelHeaderStyle,
              alignItems: isMobile ? "stretch" : "flex-start",
            }}
          >
            <div>
              <h2 style={panelTitleStyle}>Últimas notas</h2>
              <p style={panelSubtitleStyle}>
                Aqui você acompanha apenas as emissões vinculadas ao seu próprio
                cadastro.
              </p>
            </div>

            <div
              style={{
                ...panelCounterStyle,
                width: isMobile ? "100%" : "fit-content",
              }}
            >
              {notas.length} registro{notas.length === 1 ? "" : "s"}
            </div>
          </div>

          {notas.length === 0 ? (
            <div style={emptyStateStyle}>
              <div style={emptyIconStyle}>📭</div>
              <strong style={emptyTitleStyle}>Nenhuma nota encontrada</strong>
              <p style={emptyTextStyle}>
                Assim que você emitir suas primeiras notas, elas aparecerão aqui
                com acesso rápido aos arquivos.
              </p>

              <button
                type="button"
                onClick={emitirRapido}
                style={emptyActionButtonStyle}
              >
                Emitir minha primeira nota
              </button>
            </div>
          ) : (
            <div style={notesListStyle}>
              {ultimasNotas.map((nota) => {
                const statusMeta = getStatusMeta(nota.status);
                const pdfDisponivel = !!nota.pdf_url;
                const xmlDisponivel = !!nota.xml_url;

                return (
                  <div
                    key={nota.id}
                    style={{
                      ...noteCardStyle,
                      gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
                    }}
                  >
                    <div style={noteMainStyle}>
                      <div style={noteTopRowStyle}>
                        <div>
                          <strong style={noteTitleStyle}>Nota #{nota.id}</strong>
                          <div style={noteDateStyle}>
                            Competência: {formatDateBR(nota.competency_date)}
                          </div>
                          <div style={noteDateStyle}>
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
                    </div>

                    <div
                      style={{
                        ...noteActionsStyle,
                        width: isMobile ? "100%" : "auto",
                        justifyContent: isMobile ? "stretch" : "flex-start",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => abrirArquivo(nota.pdf_url || null, "PDF")}
                        disabled={!pdfDisponivel}
                        style={{
                          ...(pdfDisponivel
                            ? fileButtonPrimaryStyle
                            : fileButtonDisabledStyle),
                          width: isMobile ? "100%" : "76px",
                        }}
                        title={
                          pdfDisponivel ? "Abrir PDF" : "PDF ainda não disponível"
                        }
                      >
                        PDF
                      </button>

                      <button
                        type="button"
                        onClick={() => abrirArquivo(nota.xml_url || null, "XML")}
                        disabled={!xmlDisponivel}
                        style={{
                          ...(xmlDisponivel
                            ? fileButtonSecondaryStyle
                            : fileButtonDisabledStyle),
                          width: isMobile ? "100%" : "76px",
                        }}
                        title={
                          xmlDisponivel ? "Abrir XML" : "XML ainda não disponível"
                        }
                      >
                        XML
                      </button>
                    </div>
                  </div>
                );
              })}

              {notas.length > 6 ? (
                <div style={moreNotesWrapStyle}>
                  <Link href="/minhas-notas" style={moreNotesButtonStyle}>
                    Ver histórico completo
                  </Link>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>

      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        style={whatsappButtonStyle}
        aria-label="Falar com o suporte"
        title="Precisa de ajuda? Fale com o suporte"
      >
        💬
      </a>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  position: "relative",
  overflow: "hidden",
  background:
    "radial-gradient(circle at top left, rgba(37,99,235,0.18), transparent 26%), linear-gradient(135deg, #020617 0%, #071427 36%, #0b1730 70%, #041225 100%)",
  fontFamily: "Arial, sans-serif",
  color: "#f8fafc",
};

const glowTopStyle: React.CSSProperties = {
  position: "absolute",
  top: "-120px",
  left: "-60px",
  width: "260px",
  height: "260px",
  borderRadius: "50%",
  background: "rgba(37, 99, 235, 0.16)",
  filter: "blur(95px)",
  pointerEvents: "none",
};

const glowBottomStyle: React.CSSProperties = {
  position: "absolute",
  right: "-100px",
  bottom: "-120px",
  width: "320px",
  height: "320px",
  borderRadius: "50%",
  background: "rgba(16, 185, 129, 0.10)",
  filter: "blur(110px)",
  pointerEvents: "none",
};

const containerStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  width: "100%",
  maxWidth: "1240px",
  margin: "0 auto",
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

const heroCardStyle: React.CSSProperties = {
  display: "grid",
  gap: "18px",
  background:
    "linear-gradient(135deg, rgba(2,6,23,0.84) 0%, rgba(15,23,42,0.94) 100%)",
  border: "1px solid rgba(59, 130, 246, 0.16)",
  boxShadow: "0 24px 60px rgba(0,0,0,0.34)",
  marginBottom: "18px",
};

const heroContentStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

const brandRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "14px",
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
  fontWeight: 800,
};

const welcomePillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 14px",
  borderRadius: "999px",
  background: "rgba(16, 185, 129, 0.12)",
  border: "1px solid rgba(16, 185, 129, 0.20)",
  color: "#bbf7d0",
  fontSize: "12px",
  fontWeight: 700,
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  lineHeight: 1.05,
  fontWeight: 900,
  color: "#ffffff",
};

const heroSubtitleStyle: React.CSSProperties = {
  margin: "12px 0 0 0",
  color: "#cbd5e1",
  lineHeight: 1.75,
  maxWidth: "760px",
};

const heroInfoGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
  marginTop: "18px",
};

const heroInfoCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(15,23,42,0.82) 0%, rgba(2,6,23,0.88) 100%)",
  border: "1px solid rgba(59,130,246,0.12)",
  borderRadius: "18px",
  padding: "16px",
};

const heroInfoLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#93c5fd",
  marginBottom: "6px",
  fontWeight: 700,
};

const heroInfoValueStyle: React.CSSProperties = {
  display: "block",
  fontSize: "15px",
  color: "#ffffff",
  fontWeight: 800,
  wordBreak: "break-word",
};

const heroSideStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

const profileCardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  background:
    "linear-gradient(180deg, rgba(15,23,42,0.82) 0%, rgba(2,6,23,0.88) 100%)",
  border: "1px solid rgba(59,130,246,0.12)",
  borderRadius: "22px",
  padding: "16px",
};

const avatarStyle: React.CSSProperties = {
  width: "54px",
  height: "54px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: 900,
  boxShadow: "0 14px 30px rgba(37,99,235,0.28)",
};

const profileNameStyle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 800,
  color: "#ffffff",
};

const profileSubStyle: React.CSSProperties = {
  marginTop: "4px",
  fontSize: "13px",
  color: "#94a3b8",
};

const statusPanelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  background:
    "linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(15,23,42,0.92) 100%)",
  border: "1px solid rgba(59,130,246,0.16)",
  borderRadius: "18px",
  padding: "16px",
};

const statusPanelLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#93c5fd",
  fontWeight: 700,
};

const statusPanelValueStyle: React.CSSProperties = {
  fontSize: "16px",
  color: "#ffffff",
  fontWeight: 800,
};

const statusPanelHintStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#94a3b8",
  lineHeight: 1.6,
};

const heroActionStackStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const heroPrimaryActionStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "15px 16px",
  borderRadius: "16px",
  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  color: "#ffffff",
  fontWeight: 800,
  boxShadow: "0 12px 28px rgba(16,185,129,0.24)",
  border: "none",
  cursor: "pointer",
};

const heroSecondaryActionStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "15px 16px",
  borderRadius: "16px",
  background: "rgba(59, 130, 246, 0.10)",
  border: "1px solid rgba(59, 130, 246, 0.20)",
  color: "#dbeafe",
  fontWeight: 700,
};

const upgradeButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "15px 16px",
  borderRadius: "16px",
  background: "rgba(245,158,11,0.12)",
  border: "1px solid rgba(245,158,11,0.24)",
  color: "#fde68a",
  fontWeight: 800,
};

const logoutButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "15px 16px",
  borderRadius: "16px",
  background: "rgba(239,68,68,0.10)",
  border: "1px solid rgba(239,68,68,0.20)",
  color: "#fecaca",
  fontWeight: 800,
  borderWidth: 1,
  borderStyle: "solid",
};

const metricsGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "14px",
  marginBottom: "18px",
};

const metricCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.88) 0%, rgba(15,23,42,0.92) 100%)",
  border: "1px solid rgba(59,130,246,0.12)",
  borderRadius: "22px",
  padding: "18px",
  boxShadow: "0 14px 34px rgba(0,0,0,0.20)",
};

const metricCardStyleHighlightStyle: React.CSSProperties = {
  ...metricCardStyle,
  background:
    "linear-gradient(135deg, rgba(16,185,129,0.14) 0%, rgba(15,23,42,0.92) 85%)",
  border: "1px solid rgba(16,185,129,0.18)",
};

const metricTopStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  marginBottom: "12px",
};

const metricLabelStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#93c5fd",
  fontWeight: 700,
};

const metricIconStyle: React.CSSProperties = {
  fontSize: "18px",
  opacity: 0.9,
};

const metricValueStyle: React.CSSProperties = {
  display: "block",
  fontSize: "30px",
  lineHeight: 1.1,
  color: "#ffffff",
  fontWeight: 900,
};

const metricHintStyle: React.CSSProperties = {
  display: "block",
  marginTop: "10px",
  color: "#94a3b8",
  fontSize: "13px",
  lineHeight: 1.55,
};

const quickActionsWrapStyle: React.CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.88) 0%, rgba(15,23,42,0.92) 100%)",
  border: "1px solid rgba(59,130,246,0.12)",
  borderRadius: "24px",
  padding: "20px",
  boxShadow: "0 20px 48px rgba(0,0,0,0.24)",
  marginBottom: "18px",
};

const quickActionsHeaderStyle: React.CSSProperties = {
  marginBottom: "16px",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 800,
  color: "#ffffff",
};

const sectionSubtitleStyle: React.CSSProperties = {
  margin: "8px 0 0 0",
  fontSize: "14px",
  color: "#94a3b8",
  lineHeight: 1.6,
};

const quickActionsGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "14px",
};

const quickPrimaryCardButtonStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  textDecoration: "none",
  padding: "20px",
  borderRadius: "20px",
  background:
    "linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(15,23,42,0.90) 90%)",
  border: "1px solid rgba(16,185,129,0.16)",
  color: "#ffffff",
  textAlign: "left",
  cursor: "pointer",
};

const quickSecondaryCardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  textDecoration: "none",
  padding: "20px",
  borderRadius: "20px",
  background:
    "linear-gradient(135deg, rgba(37,99,235,0.14) 0%, rgba(15,23,42,0.90) 90%)",
  border: "1px solid rgba(59,130,246,0.16)",
  color: "#ffffff",
};

const quickUpgradeCardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  textDecoration: "none",
  padding: "20px",
  borderRadius: "20px",
  background:
    "linear-gradient(135deg, rgba(245,158,11,0.14) 0%, rgba(15,23,42,0.90) 90%)",
  border: "1px solid rgba(245,158,11,0.18)",
  color: "#ffffff",
};

const quickCardBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  width: "fit-content",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.08)",
  color: "#cbd5e1",
  fontSize: "12px",
  fontWeight: 700,
};

const quickCardTitleStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 800,
  color: "#ffffff",
};

const quickCardTextStyle: React.CSSProperties = {
  color: "#cbd5e1",
  fontSize: "14px",
  lineHeight: 1.65,
};

const planoStatusPanelStyle: React.CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.88) 0%, rgba(15,23,42,0.92) 100%)",
  border: "1px solid rgba(59,130,246,0.12)",
  borderRadius: "24px",
  padding: "20px",
  boxShadow: "0 20px 48px rgba(0,0,0,0.24)",
  marginBottom: "18px",
};

const planoStatusHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
  flexWrap: "wrap",
  marginBottom: "16px",
};

const planoStatusGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "14px",
};

const planoStatusCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(15,23,42,0.88) 0%, rgba(2,6,23,0.92) 100%)",
  border: "1px solid rgba(59,130,246,0.10)",
  borderRadius: "18px",
  padding: "18px",
};

const planoStatusValueStyle: React.CSSProperties = {
  display: "block",
  fontSize: "20px",
  color: "#ffffff",
  fontWeight: 900,
};

const upgradeMiniButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "12px 14px",
  borderRadius: "14px",
  background: "rgba(245,158,11,0.12)",
  border: "1px solid rgba(245,158,11,0.24)",
  color: "#fde68a",
  fontWeight: 800,
};

const panelStyle: React.CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.88) 0%, rgba(15,23,42,0.92) 100%)",
  border: "1px solid rgba(59,130,246,0.12)",
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

const panelCounterStyle: React.CSSProperties = {
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

const emptyStateStyle: React.CSSProperties = {
  borderRadius: "18px",
  padding: "30px 20px",
  background:
    "linear-gradient(180deg, rgba(15,23,42,0.82) 0%, rgba(2,6,23,0.88) 100%)",
  border: "1px solid rgba(59,130,246,0.10)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
};

const emptyIconStyle: React.CSSProperties = {
  fontSize: "34px",
  marginBottom: "12px",
};

const emptyTitleStyle: React.CSSProperties = {
  fontSize: "20px",
  color: "#ffffff",
};

const emptyTextStyle: React.CSSProperties = {
  margin: "10px 0 0 0",
  maxWidth: "560px",
  color: "#94a3b8",
  fontSize: "14px",
  lineHeight: 1.7,
};

const emptyActionButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  marginTop: "16px",
  padding: "14px 18px",
  borderRadius: "14px",
  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  color: "#ffffff",
  fontWeight: 800,
  border: "none",
  cursor: "pointer",
};

const notesListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
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

const noteTopRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "flex-start",
};

const noteTitleStyle: React.CSSProperties = {
  fontSize: "18px",
  color: "#ffffff",
  fontWeight: 800,
};

const noteDateStyle: React.CSSProperties = {
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

const noteActionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
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
  minWidth: "76px",
};

const fileButtonSecondaryStyle: React.CSSProperties = {
  backgroundColor: "rgba(59,130,246,0.14)",
  color: "#dbeafe",
  border: "1px solid rgba(59,130,246,0.28)",
  borderRadius: "12px",
  padding: "12px 16px",
  fontWeight: 700,
  cursor: "pointer",
  minWidth: "76px",
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
  minWidth: "76px",
};

const moreNotesWrapStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  marginTop: "4px",
};

const moreNotesButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "14px 18px",
  borderRadius: "14px",
  background: "rgba(59, 130, 246, 0.10)",
  border: "1px solid rgba(59, 130, 246, 0.20)",
  color: "#dbeafe",
  fontWeight: 800,
};

const whatsappButtonStyle: React.CSSProperties = {
  position: "fixed",
  right: "20px",
  bottom: "20px",
  width: "58px",
  height: "58px",
  borderRadius: "999px",
  background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#ffffff",
  fontSize: "26px",
  textDecoration: "none",
  boxShadow: "0 14px 30px rgba(0,0,0,0.30)",
  zIndex: 9999,
};