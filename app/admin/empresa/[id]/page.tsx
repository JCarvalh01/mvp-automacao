"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import ProtectedPageLoader from "@/components/ProtectedPageLoader";
import { savePartnerCompanySession, saveUserSession } from "@/lib/session";

type Empresa = {
  id: number;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  user_id?: number | null;
  payment_status?: string | null;
  is_blocked?: boolean | null;
  clients_limit?: number | null;
  price_per_client?: number | null;
  base_price?: number | null;
};

type Cliente = {
  id: number;
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_mei: boolean | null;
  is_active?: boolean | null;
  partner_company_id?: number | null;
};

type UsuarioEmpresa = {
  id: number;
  name: string;
  email: string;
  user_type: string;
  is_active: boolean;
};

export default function AdminEmpresaDetalhePage() {
  const router = useRouter();
  const params = useParams();
  const { loading: loadingAccess, authorized } = useProtectedRoute(["admin"]);

  const empresaId = Number(params?.id);

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [entrandoComoEmpresa, setEntrandoComoEmpresa] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (authorized) {
      iniciarPagina();
    }
  }, [authorized, empresaId]);

  async function iniciarPagina() {
    try {
      setLoading(true);
      setMensagem("");

      if (!empresaId || Number.isNaN(empresaId)) {
        setMensagem("Empresa inválida.");
        setLoading(false);
        return;
      }

      const { data: empresaData, error: empresaError } = await supabase
        .from("partner_companies")
        .select("*")
        .eq("id", empresaId)
        .single();

      if (empresaError || !empresaData) {
        console.log("Erro ao buscar empresa:", empresaError);
        setMensagem("Empresa não encontrada.");
        setLoading(false);
        return;
      }

      setEmpresa(empresaData as Empresa);

      const { data: clientesData, error: clientesError } = await supabase
        .from("clients")
        .select("*")
        .eq("partner_company_id", empresaData.id)
        .order("id", { ascending: false });

      if (clientesError) {
        console.log("Erro ao buscar clientes:", clientesError);
        setMensagem("Empresa carregada, mas houve erro ao carregar clientes.");
        setClientes([]);
        setLoading(false);
        return;
      }

      setClientes((clientesData || []) as Cliente[]);
      setLoading(false);
    } catch (error) {
      console.log("Erro inesperado ao carregar empresa:", error);
      setMensagem("Erro inesperado ao carregar empresa.");
      setLoading(false);
    }
  }

  async function atualizarEmpresa(
    payload: Partial<Empresa>,
    successMessage: string
  ) {
    try {
      if (!empresa) return;

      setActionLoading(true);
      setMensagem("");

      const { error } = await supabase
        .from("partner_companies")
        .update(payload)
        .eq("id", empresa.id);

      if (error) {
        console.log("Erro ao atualizar empresa:", error);
        setMensagem("Não foi possível atualizar a empresa.");
        return;
      }

      setEmpresa((prev) => (prev ? { ...prev, ...payload } : prev));
      setMensagem(successMessage);
    } catch (error) {
      console.log("Erro inesperado ao atualizar empresa:", error);
      setMensagem("Erro inesperado ao atualizar empresa.");
    } finally {
      setActionLoading(false);
    }
  }

  async function entrarComoEmpresa() {
    try {
      if (!empresa) {
        setMensagem("Empresa não encontrada.");
        return;
      }

      if (!empresa.user_id) {
        setMensagem("Esta empresa não possui usuário vinculado.");
        return;
      }

      setEntrandoComoEmpresa(true);
      setMensagem("");

      const { data: usuarioEmpresa, error: usuarioEmpresaError } = await supabase
        .from("users")
        .select("id, name, email, user_type, is_active")
        .eq("id", empresa.user_id)
        .single<UsuarioEmpresa>();

      if (usuarioEmpresaError || !usuarioEmpresa) {
        console.log("Erro ao buscar usuário da empresa:", usuarioEmpresaError);
        setMensagem("Não foi possível carregar o usuário da empresa.");
        return;
      }

      if (!usuarioEmpresa.is_active) {
        setMensagem("O usuário desta empresa está inativo.");
        return;
      }

      saveUserSession({
        id: usuarioEmpresa.id,
        name: usuarioEmpresa.name,
        email: usuarioEmpresa.email,
        user_type: usuarioEmpresa.user_type,
        is_active: usuarioEmpresa.is_active,
      });

      savePartnerCompanySession({
        id: empresa.id,
        name: empresa.name,
        cnpj: empresa.cnpj,
        email: empresa.email,
        phone: empresa.phone,
        address: empresa.address,
        user_id: empresa.user_id || 0,
      });

      router.push("/dashboard-empresa");
    } catch (error) {
      console.log("Erro ao entrar como empresa:", error);
      setMensagem("Erro ao entrar como empresa.");
    } finally {
      setEntrandoComoEmpresa(false);
    }
  }

  const clientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) return clientes;

    return clientes.filter((cliente) => {
      const nome = cliente.name?.toLowerCase() || "";
      const cnpj = cliente.cnpj?.toLowerCase() || "";
      const email = cliente.email?.toLowerCase() || "";
      const telefone = cliente.phone?.toLowerCase() || "";
      const endereco = cliente.address?.toLowerCase() || "";

      return (
        nome.includes(termo) ||
        cnpj.includes(termo) ||
        email.includes(termo) ||
        telefone.includes(termo) ||
        endereco.includes(termo)
      );
    });
  }, [busca, clientes]);

  const resumo = useMemo(() => {
    const totalClientes = clientes.length;
    const totalAtivos = clientes.filter((cliente) => cliente.is_active !== false).length;
    const totalMei = clientes.filter((cliente) => cliente.is_mei).length;
    const totalNaoMei = totalClientes - totalMei;
    const valorBase = Number(empresa?.base_price || 0);
    const valorPorCliente = Number(empresa?.price_per_client || 0);
    const faturamentoEstimado = valorBase + totalClientes * valorPorCliente;

    return {
      totalClientes,
      totalAtivos,
      totalMei,
      totalNaoMei,
      faturamentoEstimado,
    };
  }, [clientes, empresa]);

  function formatarCnpj(valor?: string | null) {
    if (!valor) return "Não informado";

    const numeros = valor.replace(/\D/g, "");

    if (numeros.length !== 14) return valor;

    return numeros.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5"
    );
  }

  function formatarMoeda(valor?: number | null) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function voltar() {
    router.push("/admin");
  }

  function abrirCliente(clienteId: number) {
    router.push(`/clientes/${clienteId}`);
  }

  function editarEmpresa() {
    router.push(`/admin/empresa/${empresaId}/editar`);
  }

  function getPaymentMeta(paymentStatus?: string | null) {
    const status = String(paymentStatus || "").toLowerCase();

    if (status === "paid") {
      return {
        label: "Pago",
        style: paidBadgeStyle,
      };
    }

    return {
      label: "Não pago",
      style: unpaidBadgeStyle,
    };
  }

  function getBlockedMeta(isBlocked?: boolean | null) {
    if (isBlocked) {
      return {
        label: "Bloqueada",
        style: blockedBadgeStyle,
      };
    }

    return {
      label: "Liberada",
      style: unblockedBadgeStyle,
    };
  }

  if (loadingAccess) {
    return <ProtectedPageLoader label="Validando acesso administrativo..." />;
  }

  if (!authorized) {
    return null;
  }

  const paymentMeta = getPaymentMeta(empresa?.payment_status);
  const blockedMeta = getBlockedMeta(empresa?.is_blocked);

  return (
    <main style={pageStyle}>
      <div style={bgGlowOne} />
      <div style={bgGlowTwo} />

      <div style={containerStyle}>
        <section style={heroCardStyle}>
          <div style={heroTopRowStyle}>
            <div>
              <p style={heroMiniStyle}>MVP_ AUTOMAÇÃO FISCAL</p>
              <h1 style={heroTitleStyle}>{empresa?.name || "Empresa"}</h1>
              <p style={heroSubtitleStyle}>
                Visão administrativa da empresa, clientes vinculados, controle
                financeiro e bloqueio operacional.
              </p>
            </div>

            <div style={heroBadgesWrapStyle}>
              <span style={{ ...heroStatusBadgeStyle, ...paymentMeta.style }}>
                {paymentMeta.label}
              </span>

              <span style={{ ...heroStatusBadgeStyle, ...blockedMeta.style }}>
                {blockedMeta.label}
              </span>
            </div>
          </div>
        </section>

        <section style={summaryGridStyle}>
          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Clientes cadastrados</span>
            <strong style={summaryValueStyle}>{resumo.totalClientes}</strong>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Clientes ativos</span>
            <strong style={summaryValueStyle}>{resumo.totalAtivos}</strong>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Clientes MEI</span>
            <strong style={summaryValueStyle}>{resumo.totalMei}</strong>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Estimativa mensal</span>
            <strong style={summaryValueStyle}>
              {formatarMoeda(resumo.faturamentoEstimado)}
            </strong>
          </div>
        </section>

        {mensagem && (
          <div
            style={{
              ...messageStyle,
              ...(mensagem.toLowerCase().includes("sucesso") ||
              mensagem.toLowerCase().includes("marcada") ||
              mensagem.toLowerCase().includes("bloqueada") ||
              mensagem.toLowerCase().includes("liberada") ||
              mensagem.toLowerCase().includes("atualizada")
                ? successMessageStyle
                : errorMessageStyle),
            }}
          >
            {mensagem}
          </div>
        )}

        <section style={detailsGridStyle}>
          <article style={contentCardStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <h2 style={sectionTitleStyle}>Dados da empresa</h2>
                <p style={sectionSubtitleStyle}>
                  Informações principais do cadastro.
                </p>
              </div>
            </div>

            <div style={infoGridStyle}>
              <div style={infoBoxStyle}>
                <span style={infoLabelStyle}>Nome</span>
                <strong style={infoValueStyle}>
                  {empresa?.name || "Não informado"}
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

              <div style={infoBoxStyle}>
                <span style={infoLabelStyle}>Status de pagamento</span>
                <strong style={infoValueStyle}>{paymentMeta.label}</strong>
              </div>

              <div style={infoBoxStyle}>
                <span style={infoLabelStyle}>Status de acesso</span>
                <strong style={infoValueStyle}>{blockedMeta.label}</strong>
              </div>

              <div style={infoBoxStyle}>
                <span style={infoLabelStyle}>Base mensal</span>
                <strong style={infoValueStyle}>
                  {formatarMoeda(empresa?.base_price)}
                </strong>
              </div>

              <div style={infoBoxStyle}>
                <span style={infoLabelStyle}>Valor por cliente</span>
                <strong style={infoValueStyle}>
                  {formatarMoeda(empresa?.price_per_client)}
                </strong>
              </div>

              <div style={infoBoxStyle}>
                <span style={infoLabelStyle}>Limite de clientes</span>
                <strong style={infoValueStyle}>
                  {empresa?.clients_limit ?? "Não definido"}
                </strong>
              </div>

              <div style={infoBoxStyle}>
                <span style={infoLabelStyle}>Clientes não MEI</span>
                <strong style={infoValueStyle}>{resumo.totalNaoMei}</strong>
              </div>

              <div style={{ ...infoBoxStyle, gridColumn: "1 / -1" }}>
                <span style={infoLabelStyle}>Endereço</span>
                <strong style={infoValueStyle}>
                  {empresa?.address || "Não informado"}
                </strong>
              </div>
            </div>
          </article>

          <article style={contentCardStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <h2 style={sectionTitleStyle}>Ações rápidas</h2>
                <p style={sectionSubtitleStyle}>
                  Continue a operação administrativa da plataforma.
                </p>
              </div>
            </div>

            <div style={quickActionsStyle}>
              <button
                onClick={() =>
                  atualizarEmpresa(
                    { payment_status: "paid" },
                    "Empresa marcada como paga com sucesso."
                  )
                }
                disabled={actionLoading || empresa?.payment_status === "paid"}
                style={{
                  ...actionPaidButtonStyle,
                  opacity:
                    actionLoading || empresa?.payment_status === "paid" ? 0.65 : 1,
                  cursor:
                    actionLoading || empresa?.payment_status === "paid"
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {actionLoading ? "Salvando..." : "Marcar como pago"}
              </button>

              <button
                onClick={() =>
                  atualizarEmpresa(
                    { payment_status: "unpaid" },
                    "Empresa marcada como não paga."
                  )
                }
                disabled={actionLoading || empresa?.payment_status !== "paid"}
                style={{
                  ...actionUnpaidButtonStyle,
                  opacity:
                    actionLoading || empresa?.payment_status !== "paid" ? 0.65 : 1,
                  cursor:
                    actionLoading || empresa?.payment_status !== "paid"
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {actionLoading ? "Salvando..." : "Marcar como não pago"}
              </button>

              <button
                onClick={() =>
                  atualizarEmpresa(
                    { is_blocked: true },
                    "Empresa bloqueada com sucesso."
                  )
                }
                disabled={actionLoading || empresa?.is_blocked === true}
                style={{
                  ...actionBlockButtonStyle,
                  opacity:
                    actionLoading || empresa?.is_blocked === true ? 0.65 : 1,
                  cursor:
                    actionLoading || empresa?.is_blocked === true
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {actionLoading ? "Salvando..." : "Bloquear empresa"}
              </button>

              <button
                onClick={() =>
                  atualizarEmpresa(
                    { is_blocked: false },
                    "Empresa liberada com sucesso."
                  )
                }
                disabled={actionLoading || empresa?.is_blocked === false}
                style={{
                  ...actionUnblockButtonStyle,
                  opacity:
                    actionLoading || empresa?.is_blocked === false ? 0.65 : 1,
                  cursor:
                    actionLoading || empresa?.is_blocked === false
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {actionLoading ? "Salvando..." : "Liberar empresa"}
              </button>

              <button
                onClick={entrarComoEmpresa}
                disabled={entrandoComoEmpresa}
                style={{
                  ...impersonateButtonStyle,
                  opacity: entrandoComoEmpresa ? 0.75 : 1,
                  cursor: entrandoComoEmpresa ? "not-allowed" : "pointer",
                }}
              >
                {entrandoComoEmpresa ? "Entrando..." : "Entrar como empresa"}
              </button>

              <button onClick={editarEmpresa} style={editButtonStyle}>
                Editar empresa
              </button>

              <button onClick={voltar} style={backButtonStyle}>
                Voltar para admin
              </button>

              <button
                onClick={() => router.push("/admin")}
                style={secondaryButtonStyle}
              >
                Ver todas as empresas
              </button>
            </div>
          </article>
        </section>

        <section style={toolbarStyle}>
          <div style={searchWrapperStyle}>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente por nome, CNPJ, email, telefone ou endereço"
              style={searchInputStyle}
            />
          </div>
        </section>

        <section style={listCardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Clientes da empresa</h2>
              <p style={sectionSubtitleStyle}>
                {loading
                  ? "Carregando clientes..."
                  : `${clientesFiltrados.length} cliente(s) encontrado(s)`}
              </p>
            </div>
          </div>

          {loading ? (
            <div style={loadingStyle}>Carregando...</div>
          ) : clientesFiltrados.length === 0 ? (
            <div style={emptyStyle}>Nenhum cliente encontrado para esta empresa.</div>
          ) : (
            <div style={gridStyle}>
              {clientesFiltrados.map((cliente) => (
                <article key={cliente.id} style={clientCardStyle}>
                  <div style={cardHeaderStyle}>
                    <div style={{ flex: 1 }}>
                      <span style={clientIdStyle}>CLIENTE #{cliente.id}</span>
                      <h3 style={clientNameStyle}>{cliente.name}</h3>
                    </div>

                    <div style={cardBadgesStyle}>
                      <span
                        style={{
                          ...meiBadgeStyle,
                          ...(cliente.is_mei ? meiBadgeGreenStyle : meiBadgeDarkStyle),
                        }}
                      >
                        {cliente.is_mei ? "MEI" : "Não MEI"}
                      </span>

                      <span
                        style={{
                          ...statusBadgeStyle,
                          ...(cliente.is_active === false
                            ? statusInactiveStyle
                            : statusActiveStyle),
                        }}
                      >
                        {cliente.is_active === false ? "Inativo" : "Ativo"}
                      </span>
                    </div>
                  </div>

                  <div style={infoGridStyle}>
                    <div style={infoBoxStyle}>
                      <span style={infoLabelStyle}>CNPJ</span>
                      <strong style={infoValueStyle}>
                        {formatarCnpj(cliente.cnpj)}
                      </strong>
                    </div>

                    <div style={infoBoxStyle}>
                      <span style={infoLabelStyle}>Email</span>
                      <strong style={infoValueStyle}>
                        {cliente.email || "Não informado"}
                      </strong>
                    </div>

                    <div style={infoBoxStyle}>
                      <span style={infoLabelStyle}>Telefone</span>
                      <strong style={infoValueStyle}>
                        {cliente.phone || "Não informado"}
                      </strong>
                    </div>

                    <div style={infoBoxStyle}>
                      <span style={infoLabelStyle}>Endereço</span>
                      <strong style={infoValueStyle}>
                        {cliente.address || "Não informado"}
                      </strong>
                    </div>
                  </div>

                  <div style={actionsStyle}>
                    <button
                      style={accessButtonStyle}
                      onClick={() => abrirCliente(cliente.id)}
                    >
                      Ver cliente
                    </button>
                  </div>
                </article>
              ))}
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

const paidBadgeStyle: React.CSSProperties = {
  color: "#bbf7d0",
  backgroundColor: "rgba(16, 185, 129, 0.14)",
  border: "1px solid rgba(16, 185, 129, 0.30)",
};

const unpaidBadgeStyle: React.CSSProperties = {
  color: "#fde68a",
  backgroundColor: "rgba(245, 158, 11, 0.14)",
  border: "1px solid rgba(245, 158, 11, 0.30)",
};

const blockedBadgeStyle: React.CSSProperties = {
  color: "#fecaca",
  backgroundColor: "rgba(239, 68, 68, 0.12)",
  border: "1px solid rgba(239, 68, 68, 0.24)",
};

const unblockedBadgeStyle: React.CSSProperties = {
  color: "#bfdbfe",
  backgroundColor: "rgba(37, 99, 235, 0.16)",
  border: "1px solid rgba(59, 130, 246, 0.28)",
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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

const messageStyle: React.CSSProperties = {
  borderRadius: "18px",
  padding: "14px 16px",
  marginBottom: "16px",
  fontSize: "14px",
  border: "1px solid transparent",
};

const successMessageStyle: React.CSSProperties = {
  backgroundColor: "rgba(16, 185, 129, 0.12)",
  border: "1px solid rgba(16, 185, 129, 0.25)",
  color: "#bbf7d0",
};

const errorMessageStyle: React.CSSProperties = {
  backgroundColor: "rgba(239, 68, 68, 0.12)",
  border: "1px solid rgba(239, 68, 68, 0.25)",
  color: "#fecaca",
};

const detailsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.3fr 0.7fr",
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

const quickActionsStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const actionPaidButtonStyle: React.CSSProperties = {
  padding: "13px 16px",
  borderRadius: "14px",
  background: "rgba(16, 185, 129, 0.12)",
  color: "#bbf7d0",
  border: "1px solid rgba(16, 185, 129, 0.28)",
  fontWeight: 800,
};

const actionUnpaidButtonStyle: React.CSSProperties = {
  padding: "13px 16px",
  borderRadius: "14px",
  background: "rgba(245, 158, 11, 0.12)",
  color: "#fde68a",
  border: "1px solid rgba(245, 158, 11, 0.28)",
  fontWeight: 800,
};

const actionBlockButtonStyle: React.CSSProperties = {
  padding: "13px 16px",
  borderRadius: "14px",
  background: "rgba(239, 68, 68, 0.12)",
  color: "#fecaca",
  border: "1px solid rgba(239, 68, 68, 0.28)",
  fontWeight: 800,
};

const actionUnblockButtonStyle: React.CSSProperties = {
  padding: "13px 16px",
  borderRadius: "14px",
  background: "rgba(59, 130, 246, 0.12)",
  color: "#dbeafe",
  border: "1px solid rgba(59, 130, 246, 0.28)",
  fontWeight: 800,
};

const impersonateButtonStyle: React.CSSProperties = {
  padding: "13px 16px",
  borderRadius: "14px",
  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  color: "#ffffff",
  border: "none",
  fontWeight: 800,
  boxShadow: "0 12px 28px rgba(16,185,129,0.26)",
};

const editButtonStyle: React.CSSProperties = {
  padding: "13px 16px",
  borderRadius: "14px",
  background: "linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)",
  color: "#ffffff",
  border: "none",
  fontWeight: 800,
  boxShadow: "0 12px 28px rgba(37,99,235,0.26)",
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "13px 16px",
  borderRadius: "14px",
  backgroundColor: "rgba(15, 23, 42, 0.9)",
  color: "#ffffff",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  fontWeight: 700,
  cursor: "pointer",
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

const toolbarStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "18px",
};

const searchWrapperStyle: React.CSSProperties = {
  flex: 1,
  minWidth: "280px",
};

const searchInputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(2, 6, 23, 0.74)",
  border: "1px solid rgba(59, 130, 246, 0.18)",
  borderRadius: "16px",
  color: "#ffffff",
  padding: "15px 16px",
  outline: "none",
  fontSize: "14px",
  boxSizing: "border-box",
  boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
};

const listCardStyle: React.CSSProperties = {
  background: "rgba(2, 6, 23, 0.68)",
  border: "1px solid rgba(59, 130, 246, 0.14)",
  borderRadius: "28px",
  padding: "18px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.34)",
  backdropFilter: "blur(16px)",
};

const loadingStyle: React.CSSProperties = {
  color: "#cbd5e1",
  padding: "24px 10px",
  fontSize: "15px",
};

const emptyStyle: React.CSSProperties = {
  color: "#94a3b8",
  padding: "24px 10px",
  fontSize: "15px",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "16px",
};

const clientCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(2, 6, 23, 0.92) 0%, rgba(15, 23, 42, 0.92) 100%)",
  border: "1px solid rgba(59, 130, 246, 0.16)",
  borderRadius: "24px",
  padding: "18px",
  boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "16px",
};

const cardBadgesStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  alignItems: "flex-end",
};

const clientIdStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#93c5fd",
  letterSpacing: "0.08em",
  marginBottom: "6px",
  fontWeight: 700,
};

const clientNameStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "19px",
  fontWeight: 800,
  color: "#ffffff",
  lineHeight: 1.3,
};

const meiBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "74px",
  padding: "7px 12px",
  borderRadius: "999px",
  fontSize: "12px",
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

const statusBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "74px",
  padding: "7px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
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

const accessButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "12px 16px",
  borderRadius: "14px",
  background:
    "linear-gradient(135deg, rgba(37,99,235,0.20) 0%, rgba(59,130,246,0.16) 100%)",
  border: "1px solid rgba(59, 130, 246, 0.28)",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer",
};