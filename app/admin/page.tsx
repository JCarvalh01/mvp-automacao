"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ProtectedPageLoader from "@/components/ProtectedPageLoader";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import {
  clearAllSessions,
  savePartnerCompanySession,
  saveUserSession,
} from "@/lib/session";

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
  last_payment_date?: string | null;
  next_due_date?: string | null;
};

type Usuario = {
  id: number;
  name: string;
  email: string;
  user_type: string;
  is_active: boolean;
};

type ClienteEmpresa = {
  id: number;
  partner_company_id: number | null;
};

type ClientsCountMap = Record<number, number>;

export default function AdminPage() {
  const router = useRouter();
  const { isLoading: loadingAccess, isAuthorized: authorized } = useProtectedRoute();

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [clientsCountMap, setClientsCountMap] = useState<ClientsCountMap>({});
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  useEffect(() => {
    if (authorized) {
      carregarEmpresas();
    }
  }, [authorized]);

  async function carregarEmpresas() {
    try {
      setLoading(true);
      setMensagem("");

      const [
        { data: empresasData, error: empresasError },
        { data: clientesData, error: clientesError },
      ] = await Promise.all([
        supabase
          .from("partner_companies")
          .select("*")
          .order("id", { ascending: false }),

        supabase.from("clients").select("id, partner_company_id"),
      ]);

      if (empresasError) {
        console.log("Erro ao buscar empresas:", empresasError);
        setMensagem("Erro ao carregar empresas.");
        setLoading(false);
        return;
      }

      if (clientesError) {
        console.log("Erro ao buscar clientes das empresas:", clientesError);
      }

      const empresasLista = (empresasData || []) as Empresa[];
      const clientesLista = (clientesData || []) as ClienteEmpresa[];

      const novoMapa: ClientsCountMap = {};

      for (const cliente of clientesLista) {
        if (!cliente.partner_company_id) continue;
        novoMapa[cliente.partner_company_id] =
          (novoMapa[cliente.partner_company_id] || 0) + 1;
      }

      setEmpresas(empresasLista);
      setClientsCountMap(novoMapa);
      setLoading(false);
    } catch (error) {
      console.log("Erro inesperado ao buscar empresas:", error);
      setMensagem("Erro inesperado ao carregar empresas.");
      setLoading(false);
    }
  }

  async function atualizarEmpresa(
    empresaId: number,
    payload: Partial<Empresa>,
    successMessage: string
  ) {
    try {
      setActionLoadingId(empresaId);
      setMensagem("");

      const { error } = await supabase
        .from("partner_companies")
        .update(payload)
        .eq("id", empresaId);

      if (error) {
        console.log("Erro ao atualizar empresa:", error);
        setMensagem("Não foi possível atualizar a empresa.");
        return;
      }

      setEmpresas((prev) =>
        prev.map((empresa) =>
          empresa.id === empresaId ? { ...empresa, ...payload } : empresa
        )
      );

      setMensagem(successMessage);
    } catch (error) {
      console.log("Erro inesperado ao atualizar empresa:", error);
      setMensagem("Erro inesperado ao atualizar empresa.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function marcarEmpresaComoPaga(empresaId: number) {
    try {
      setActionLoadingId(empresaId);
      setMensagem("");

      const hoje = new Date();
      const proximoVencimento = new Date(hoje);
      proximoVencimento.setDate(proximoVencimento.getDate() + 30);

      const payload: Partial<Empresa> = {
        payment_status: "paid",
        is_blocked: false,
        last_payment_date: hoje.toISOString().split("T")[0],
        next_due_date: proximoVencimento.toISOString().split("T")[0],
      };

      const { error } = await supabase
        .from("partner_companies")
        .update(payload)
        .eq("id", empresaId);

      if (error) {
        console.log("Erro ao marcar empresa como paga:", error);
        setMensagem("Não foi possível atualizar o pagamento da empresa.");
        return;
      }

      setEmpresas((prev) =>
        prev.map((empresa) =>
          empresa.id === empresaId ? { ...empresa, ...payload } : empresa
        )
      );

      setMensagem("Empresa marcada como paga com sucesso.");
    } catch (error) {
      console.log("Erro inesperado ao marcar empresa como paga:", error);
      setMensagem("Erro inesperado ao atualizar pagamento da empresa.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function marcarEmpresaComoNaoPaga(empresaId: number) {
    try {
      setActionLoadingId(empresaId);
      setMensagem("");

      const payload: Partial<Empresa> = {
        payment_status: "unpaid",
        is_blocked: true,
      };

      const { error } = await supabase
        .from("partner_companies")
        .update(payload)
        .eq("id", empresaId);

      if (error) {
        console.log("Erro ao marcar empresa como não paga:", error);
        setMensagem("Não foi possível atualizar o status da empresa.");
        return;
      }

      setEmpresas((prev) =>
        prev.map((empresa) =>
          empresa.id === empresaId ? { ...empresa, ...payload } : empresa
        )
      );

      setMensagem("Empresa marcada como não paga e bloqueada.");
    } catch (error) {
      console.log("Erro inesperado ao marcar empresa como não paga:", error);
      setMensagem("Erro inesperado ao atualizar empresa.");
    } finally {
      setActionLoadingId(null);
    }
  }

  const empresasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) return empresas;

    return empresas.filter((empresa) => {
      const nome = empresa.name?.toLowerCase() || "";
      const cnpj = empresa.cnpj?.toLowerCase() || "";
      const email = empresa.email?.toLowerCase() || "";
      const telefone = empresa.phone?.toLowerCase() || "";
      const endereco = empresa.address?.toLowerCase() || "";
      const paymentStatus = String(empresa.payment_status || "").toLowerCase();
      const bloqueio = empresa.is_blocked ? "bloqueada" : "ativa";

      return (
        nome.includes(termo) ||
        cnpj.includes(termo) ||
        email.includes(termo) ||
        telefone.includes(termo) ||
        endereco.includes(termo) ||
        paymentStatus.includes(termo) ||
        bloqueio.includes(termo)
      );
    });
  }, [busca, empresas]);

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

  function formatarData(valor?: string | null) {
    if (!valor) return "Não definido";

    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return valor;

    return data.toLocaleDateString("pt-BR");
  }

  function abrirEmpresa(empresaId: number) {
    router.push(`/admin/empresa/${empresaId}`);
  }

  function novaEmpresa() {
    router.push("/admin/empresa/novo");
  }

  function logout() {
    clearAllSessions();
    router.push("/login");
  }

  async function entrarComoEmpresa(empresa: Empresa) {
    try {
      if (!empresa.user_id) {
        alert("Esta empresa não possui usuário vinculado.");
        return;
      }

      const { data: userData, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", empresa.user_id)
        .single();

      if (error) {
        console.log("Erro ao buscar usuário da empresa:", error);
        alert("Não foi possível entrar como empresa.");
        return;
      }

      saveUserSession(userData as Usuario);
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
      console.log("Erro inesperado ao entrar como empresa:", error);
      alert("Não foi possível entrar como empresa.");
    }
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

  return (
    <main style={pageStyle}>
      <div style={bgGlowOne} />
      <div style={bgGlowTwo} />

      <div style={containerStyle}>
        <section style={heroCardStyle}>
          <div style={heroTopRowStyle}>
            <div>
              <p style={heroMiniStyle}>MVP_ AUTOMAÇÃO FISCAL</p>
              <h1 style={heroTitleStyle}>Painel Administrativo</h1>
              <p style={heroSubtitleStyle}>
                Controle geral da plataforma, gestão financeira das empresas e
                visão central da operação SaaS.
              </p>
            </div>

            <div style={heroBadgeStyle}>Admin</div>
          </div>
        </section>

        <section style={summaryGridStyle}>
          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Empresas cadastradas</span>
            <strong style={summaryValueStyle}>{empresas.length}</strong>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Empresas encontradas</span>
            <strong style={summaryValueStyle}>{empresasFiltradas.length}</strong>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Empresas pagas</span>
            <strong style={summaryValueStyle}>
              {
                empresas.filter((empresa) => empresa.payment_status === "paid")
                  .length
              }
            </strong>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Empresas bloqueadas</span>
            <strong style={summaryValueStyle}>
              {empresas.filter((empresa) => empresa.is_blocked).length}
            </strong>
          </div>
        </section>

        {mensagem && (
          <div
            style={{
              ...messageStyle,
              ...(mensagem.toLowerCase().includes("sucesso") ||
              mensagem.toLowerCase().includes("atualizada") ||
              mensagem.toLowerCase().includes("marcada") ||
              mensagem.toLowerCase().includes("liberada") ||
              mensagem.toLowerCase().includes("bloqueada")
                ? successMessageStyle
                : errorMessageStyle),
            }}
          >
            {mensagem}
          </div>
        )}

        <section style={toolbarStyle}>
          <div style={searchWrapperStyle}>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, CNPJ, email, telefone, endereço ou status"
              style={searchInputStyle}
            />
          </div>

          <div style={toolbarButtonsStyle}>
            <button onClick={carregarEmpresas} style={refreshButtonStyle}>
              Atualizar
            </button>

            <button onClick={novaEmpresa} style={newCompanyButtonStyle}>
              Nova Empresa
            </button>

            <button onClick={logout} style={logoutButtonStyle}>
              Sair
            </button>
          </div>
        </section>

        <section style={listCardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Empresas</h2>
              <p style={sectionSubtitleStyle}>
                {loading
                  ? "Carregando empresas..."
                  : `${empresasFiltradas.length} empresa(s) encontrada(s)`}
              </p>
            </div>
          </div>

          {loading ? (
            <div style={loadingStyle}>Carregando...</div>
          ) : empresasFiltradas.length === 0 ? (
            <div style={emptyStyle}>Nenhuma empresa encontrada.</div>
          ) : (
            <div style={gridStyle}>
              {empresasFiltradas.map((empresa) => {
                const paymentMeta = getPaymentMeta(empresa.payment_status);
                const blockedMeta = getBlockedMeta(empresa.is_blocked);
                const totalClientes = clientsCountMap[empresa.id] || 0;
                const estaCarregandoAcao = actionLoadingId === empresa.id;

                return (
                  <article key={empresa.id} style={empresaCardStyle}>
                    <div style={cardHeaderStyle}>
                      <div style={{ flex: 1 }}>
                        <span style={empresaIdStyle}>EMPRESA #{empresa.id}</span>
                        <h3 style={empresaNameStyle}>{empresa.name}</h3>
                      </div>

                      <div style={badgesColumnStyle}>
                        <span style={{ ...statusBadgeStyle, ...paymentMeta.style }}>
                          {paymentMeta.label}
                        </span>

                        <span style={{ ...statusBadgeStyle, ...blockedMeta.style }}>
                          {blockedMeta.label}
                        </span>
                      </div>
                    </div>

                    <div style={infoGridStyle}>
                      <div style={infoBoxStyle}>
                        <span style={infoLabelStyle}>CNPJ</span>
                        <strong style={infoValueStyle}>
                          {formatarCnpj(empresa.cnpj)}
                        </strong>
                      </div>

                      <div style={infoBoxStyle}>
                        <span style={infoLabelStyle}>Email</span>
                        <strong style={infoValueStyle}>
                          {empresa.email || "Não informado"}
                        </strong>
                      </div>

                      <div style={infoBoxStyle}>
                        <span style={infoLabelStyle}>Telefone</span>
                        <strong style={infoValueStyle}>
                          {empresa.phone || "Não informado"}
                        </strong>
                      </div>

                      <div style={infoBoxStyle}>
                        <span style={infoLabelStyle}>Clientes vinculados</span>
                        <strong style={infoValueStyle}>{totalClientes}</strong>
                      </div>

                      <div style={infoBoxStyle}>
                        <span style={infoLabelStyle}>Base mensal</span>
                        <strong style={infoValueStyle}>
                          {formatarMoeda(empresa.base_price)}
                        </strong>
                      </div>

                      <div style={infoBoxStyle}>
                        <span style={infoLabelStyle}>Valor por cliente</span>
                        <strong style={infoValueStyle}>
                          {formatarMoeda(empresa.price_per_client)}
                        </strong>
                      </div>

                      <div style={infoBoxStyle}>
                        <span style={infoLabelStyle}>Limite de clientes</span>
                        <strong style={infoValueStyle}>
                          {empresa.clients_limit ?? "Não definido"}
                        </strong>
                      </div>

                      <div style={infoBoxStyle}>
                        <span style={infoLabelStyle}>Endereço</span>
                        <strong style={infoValueStyle}>
                          {empresa.address || "Não informado"}
                        </strong>
                      </div>

                      <div style={infoBoxStyle}>
                        <span style={infoLabelStyle}>Último pagamento</span>
                        <strong style={infoValueStyle}>
                          {formatarData(empresa.last_payment_date)}
                        </strong>
                      </div>

                      <div style={infoBoxStyle}>
                        <span style={infoLabelStyle}>Próximo vencimento</span>
                        <strong style={infoValueStyle}>
                          {formatarData(empresa.next_due_date)}
                        </strong>
                      </div>
                    </div>

                    <div style={actionsStyle}>
                      <button
                        style={accessButtonStyle}
                        onClick={() => abrirEmpresa(empresa.id)}
                      >
                        Acessar empresa
                      </button>

                      <button
                        style={impersonateButtonStyle}
                        onClick={() => entrarComoEmpresa(empresa)}
                      >
                        Entrar como empresa
                      </button>
                    </div>

                    <div style={adminActionsGridStyle}>
                      <button
                        disabled={estaCarregandoAcao || empresa.payment_status === "paid"}
                        style={{
                          ...actionButtonPaidStyle,
                          opacity:
                            estaCarregandoAcao || empresa.payment_status === "paid"
                              ? 0.65
                              : 1,
                          cursor:
                            estaCarregandoAcao || empresa.payment_status === "paid"
                              ? "not-allowed"
                              : "pointer",
                        }}
                        onClick={() => marcarEmpresaComoPaga(empresa.id)}
                      >
                        {estaCarregandoAcao ? "Salvando..." : "Marcar como pago"}
                      </button>

                      <button
                        disabled={
                          estaCarregandoAcao ||
                          (empresa.payment_status === "unpaid" &&
                            empresa.is_blocked === true)
                        }
                        style={{
                          ...actionButtonUnpaidStyle,
                          opacity:
                            estaCarregandoAcao ||
                            (empresa.payment_status === "unpaid" &&
                              empresa.is_blocked === true)
                              ? 0.65
                              : 1,
                          cursor:
                            estaCarregandoAcao ||
                            (empresa.payment_status === "unpaid" &&
                              empresa.is_blocked === true)
                              ? "not-allowed"
                              : "pointer",
                        }}
                        onClick={() => marcarEmpresaComoNaoPaga(empresa.id)}
                      >
                        {estaCarregandoAcao ? "Salvando..." : "Marcar como não pago"}
                      </button>

                      <button
                        disabled={estaCarregandoAcao || empresa.is_blocked === true}
                        style={{
                          ...actionButtonBlockStyle,
                          opacity:
                            estaCarregandoAcao || empresa.is_blocked === true ? 0.65 : 1,
                          cursor:
                            estaCarregandoAcao || empresa.is_blocked === true
                              ? "not-allowed"
                              : "pointer",
                        }}
                        onClick={() =>
                          atualizarEmpresa(
                            empresa.id,
                            { is_blocked: true },
                            "Empresa bloqueada com sucesso."
                          )
                        }
                      >
                        {estaCarregandoAcao ? "Salvando..." : "Bloquear"}
                      </button>

                      <button
                        disabled={estaCarregandoAcao || empresa.is_blocked === false}
                        style={{
                          ...actionButtonUnblockStyle,
                          opacity:
                            estaCarregandoAcao || empresa.is_blocked === false
                              ? 0.65
                              : 1,
                          cursor:
                            estaCarregandoAcao || empresa.is_blocked === false
                              ? "not-allowed"
                              : "pointer",
                        }}
                        onClick={() =>
                          atualizarEmpresa(
                            empresa.id,
                            { is_blocked: false },
                            "Empresa liberada com sucesso."
                          )
                        }
                      >
                        {estaCarregandoAcao ? "Salvando..." : "Liberar"}
                      </button>
                    </div>
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

const heroBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 14px",
  borderRadius: "999px",
  background: "rgba(59, 130, 246, 0.15)",
  border: "1px solid rgba(59, 130, 246, 0.24)",
  color: "#bfdbfe",
  fontSize: "13px",
  fontWeight: 700,
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

const toolbarButtonsStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const refreshButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "16px",
  padding: "13px 17px",
  fontWeight: 700,
  fontSize: "14px",
  cursor: "pointer",
  border: "1px solid rgba(59, 130, 246, 0.25)",
  background: "rgba(37, 99, 235, 0.14)",
  color: "#dbeafe",
};

const newCompanyButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "16px",
  padding: "13px 17px",
  fontWeight: 700,
  fontSize: "14px",
  cursor: "pointer",
  border: "none",
  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  color: "#ffffff",
  boxShadow: "0 12px 28px rgba(16,185,129,0.26)",
};

const logoutButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "16px",
  padding: "13px 17px",
  fontWeight: 700,
  fontSize: "14px",
  cursor: "pointer",
  border: "1px solid rgba(239, 68, 68, 0.25)",
  background: "rgba(127, 29, 29, 0.28)",
  color: "#fecaca",
};

const listCardStyle: React.CSSProperties = {
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
  gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
  gap: "16px",
};

const empresaCardStyle: React.CSSProperties = {
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

const badgesColumnStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  alignItems: "flex-end",
};

const empresaIdStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#93c5fd",
  letterSpacing: "0.08em",
  marginBottom: "6px",
  fontWeight: 700,
};

const empresaNameStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "19px",
  fontWeight: 800,
  color: "#ffffff",
  lineHeight: 1.3,
};

const statusBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "88px",
  padding: "7px 12px",
  borderRadius: "999px",
  fontSize: "12px",
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

const infoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
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

const impersonateButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "12px 16px",
  borderRadius: "14px",
  background: "linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)",
  border: "none",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 12px 28px rgba(37,99,235,0.25)",
};

const adminActionsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
  marginTop: "16px",
};

const actionButtonPaidStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: "14px",
  border: "1px solid rgba(16, 185, 129, 0.26)",
  background: "rgba(16, 185, 129, 0.12)",
  color: "#bbf7d0",
  fontWeight: 800,
};

const actionButtonUnpaidStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: "14px",
  border: "1px solid rgba(245, 158, 11, 0.26)",
  background: "rgba(245, 158, 11, 0.12)",
  color: "#fde68a",
  fontWeight: 800,
};

const actionButtonBlockStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: "14px",
  border: "1px solid rgba(239, 68, 68, 0.26)",
  background: "rgba(239, 68, 68, 0.12)",
  color: "#fecaca",
  fontWeight: 800,
};

const actionButtonUnblockStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: "14px",
  border: "1px solid rgba(59, 130, 246, 0.26)",
  background: "rgba(59, 130, 246, 0.12)",
  color: "#dbeafe",
  fontWeight: 800,
};