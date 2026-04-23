"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabaseClient";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import ProtectedPageLoader from "@/components/ProtectedPageLoader";
import { getPartnerCompanySession } from "@/lib/session";
import EmpresaPageShell from "@/components/EmpresaPageShell";

type EmpresaSessao = {
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
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  client_type?: string | null;
  is_mei?: boolean | null;
  is_active?: boolean | null;
  partner_company_id?: number | null;
  created_at?: string | null;
};

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
  if (!valor) return "Não informada";

  const data = new Date(valor);
  if (!Number.isNaN(data.getTime())) {
    return data.toLocaleDateString("pt-BR");
  }

  return valor;
}

export default function ClientesPage() {
  const router = useRouter();
  const { isLoading: loadingAccess, isAuthorized: authorized } =
    useProtectedRoute(["partner_company"]);

  const [empresa, setEmpresa] = useState<EmpresaSessao | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    if (!loadingAccess && authorized) {
      carregarPagina();
    }
  }, [loadingAccess, authorized]);

  async function carregarPagina() {
    try {
      setLoading(true);
      setMensagem("");

      const empresaSessao = getPartnerCompanySession();

      if (!empresaSessao?.id) {
        setMensagem("Empresa não identificada.");
        setLoading(false);
        return;
      }

      const empresaNormalizada: EmpresaSessao = {
        id: Number(empresaSessao.id),
        name: String(empresaSessao.name || ""),
        cnpj: String(empresaSessao.cnpj || ""),
        email: String(empresaSessao.email || ""),
        phone: String(empresaSessao.phone || ""),
        address: String(empresaSessao.address || ""),
        user_id: Number(empresaSessao.user_id ?? 0),
      };

      setEmpresa(empresaNormalizada);

      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("partner_company_id", empresaNormalizada.id)
        .order("id", { ascending: false });

      if (error) {
        console.log("Erro ao carregar clientes:", error);
        setMensagem("Erro ao carregar clientes.");
        setClientes([]);
        setLoading(false);
        return;
      }

      setClientes((data || []) as Cliente[]);
      setLoading(false);
    } catch (error) {
      console.log("Erro inesperado ao carregar clientes:", error);
      setMensagem("Erro inesperado ao carregar clientes.");
      setLoading(false);
    }
  }

  function novoCliente() {
    router.push("/clientes/novo");
  }

  function abrirCliente(clienteId: number) {
    router.push(`/clientes/${clienteId}/painel`);
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
  }, [clientes, busca]);

  const resumo = useMemo(() => {
    const total = clientes.length;
    const ativos = clientes.filter((cliente) => cliente.is_active !== false).length;
    const inativos = clientes.filter((cliente) => cliente.is_active === false).length;
    const meis = clientes.filter((cliente) => cliente.is_mei === true).length;

    return {
      total,
      ativos,
      inativos,
      meis,
    };
  }, [clientes]);

  function baixarXlsx() {
    try {
      const base = clientesFiltrados.length > 0 ? clientesFiltrados : clientes;

      if (!base.length) {
        alert("Não há clientes para exportar.");
        return;
      }

      const dados = base.map((cliente) => ({
        "ID do cliente": cliente.id,
        Nome: cliente.name || "",
        CNPJ: formatarCnpj(cliente.cnpj),
        Email: cliente.email || "",
        Telefone: formatarTelefone(cliente.phone),
        Endereço: cliente.address || "",
        Status: cliente.is_active === false ? "Inativo" : "Ativo",
        "É MEI": cliente.is_mei === true ? "Sim" : "Não",
        "Data de cadastro": formatarData(cliente.created_at),
      }));

      const worksheet = XLSX.utils.json_to_sheet(dados);
      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");

      const nomeEmpresa = String(empresa?.name || "empresa")
        .trim()
        .replace(/[\\/:*?"<>|]+/g, "")
        .replace(/\s+/g, "_");

      const dataAtual = new Date();
      const dia = String(dataAtual.getDate()).padStart(2, "0");
      const mes = String(dataAtual.getMonth() + 1).padStart(2, "0");
      const ano = dataAtual.getFullYear();

      XLSX.writeFile(workbook, `clientes_${nomeEmpresa}_${dia}-${mes}-${ano}.xlsx`);
    } catch (error) {
      console.log("Erro ao exportar XLSX:", error);
      alert("Não foi possível gerar o arquivo XLSX.");
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
      title="Clientes"
      subtitle={`Gerencie os clientes vinculados à empresa ${empresa?.name || "Empresa"}.`}
    >
      <div style={pageWrapStyle}>
        <div style={backgroundGlowTopStyle} />
        <div style={backgroundGlowBottomStyle} />

        <div style={containerStyle}>
          <section style={heroCardStyle}>
            <div style={heroTopRowStyle}>
              <div style={heroLeftStyle}>
                <p style={heroMiniStyle}>MVP_ AUTOMAÇÃO FISCAL</p>
                <h1 style={heroTitleStyle}>Carteira de Clientes</h1>
                <p style={heroSubtitleStyle}>
                  Gerencie sua base de clientes com mais organização, acesso rápido ao painel
                  individual e exibição mais protegida dos dados sensíveis.
                </p>

                <div style={heroPillsStyle}>
                  <span style={heroPillStyle}>{resumo.total} clientes</span>
                  <span style={heroPillStyle}>{resumo.ativos} ativos</span>
                  <span style={heroPillStyle}>{resumo.inativos} inativos</span>
                  <span style={heroPillStyle}>{resumo.meis} MEIs</span>
                </div>
              </div>

              <div style={heroSideBoxStyle}>
                <span style={heroInfoLabelStyle}>Empresa logada</span>
                <strong style={heroInfoValueStyle}>
                  {empresa?.name || "Área da Empresa"}
                </strong>
                <span style={heroInfoSubStyle}>
                  {empresa?.cnpj ? formatarCnpj(empresa.cnpj) : "CNPJ não disponível"}
                </span>
              </div>
            </div>
          </section>

          <section style={summaryGridStyle}>
            <div style={summaryCardStyle}>
              <span style={summaryLabelStyle}>Total de clientes</span>
              <strong style={summaryValueStyle}>{resumo.total}</strong>
            </div>

            <div style={summaryCardStyle}>
              <span style={summaryLabelStyle}>Clientes ativos</span>
              <strong style={summaryValueStyle}>{resumo.ativos}</strong>
            </div>

            <div style={summaryCardStyle}>
              <span style={summaryLabelStyle}>Clientes inativos</span>
              <strong style={summaryValueStyle}>{resumo.inativos}</strong>
            </div>

            <div style={summaryCardStyle}>
              <span style={summaryLabelStyle}>Clientes MEI</span>
              <strong style={summaryValueStyle}>{resumo.meis}</strong>
            </div>
          </section>

          {mensagem && (
            <div style={{ ...messageStyle, ...errorMessageStyle }}>{mensagem}</div>
          )}

          <section style={toolbarCardStyle}>
            <div style={searchWrapperStyle}>
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar cliente por nome, CNPJ, email, telefone ou endereço"
                style={searchInputStyle}
              />
            </div>

            <div style={toolbarButtonsStyle}>
              <button onClick={baixarXlsx} style={exportButtonStyle}>
                Baixar XLSX
              </button>

              <button onClick={novoCliente} style={newButtonStyle}>
                Novo cliente
              </button>

              <Link href="/clientes/lote" style={secondaryToolbarButtonStyle}>
                Cadastro em lote
              </Link>

              <Link href="/dashboard-empresa" style={backButtonStyle}>
                Voltar ao dashboard
              </Link>
            </div>
          </section>

          <section style={listCardStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <h2 style={sectionTitleStyle}>Lista de clientes</h2>
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
              <div style={emptyStyle}>Nenhum cliente encontrado.</div>
            ) : (
              <div style={gridStyle}>
                {clientesFiltrados.map((cliente) => {
                  const ativo = cliente.is_active !== false;
                  const tipo = cliente.is_mei === true ? "MEI" : "Não MEI";

                  return (
                    <article key={cliente.id} style={clientCardStyle}>
                      <div style={cardHeaderStyle}>
                        <div style={{ flex: 1 }}>
                          <span style={clientIdStyle}>CLIENTE #{cliente.id}</span>
                          <h3 style={clientNameStyle}>{cliente.name}</h3>
                        </div>

                        <span
                          style={{
                            ...statusBadgeStyle,
                            ...(ativo ? statusActiveStyle : statusInactiveStyle),
                          }}
                        >
                          {ativo ? "Ativo" : "Inativo"}
                        </span>
                      </div>

                      <div style={infoGridStyle}>
                        <div style={infoBoxStyle}>
                          <span style={infoLabelStyle}>CNPJ</span>
                          <strong style={infoValueStyle}>
                            {mascararCnpj(cliente.cnpj)}
                          </strong>
                        </div>

                        <div style={infoBoxStyle}>
                          <span style={infoLabelStyle}>Email</span>
                          <strong style={infoValueStyle}>
                            {mascararEmail(cliente.email)}
                          </strong>
                        </div>

                        <div style={infoBoxStyle}>
                          <span style={infoLabelStyle}>Telefone</span>
                          <strong style={infoValueStyle}>
                            {formatarTelefone(cliente.phone)}
                          </strong>
                        </div>

                        <div style={infoBoxStyle}>
                          <span style={infoLabelStyle}>Tipo</span>
                          <strong style={infoValueStyle}>{tipo}</strong>
                        </div>

                        <div style={infoBoxStyle}>
                          <span style={infoLabelStyle}>Endereço</span>
                          <strong style={infoValueStyle}>
                            {cliente.address || "Não informado"}
                          </strong>
                        </div>

                        <div style={infoBoxStyle}>
                          <span style={infoLabelStyle}>Cadastro</span>
                          <strong style={infoValueStyle}>
                            {formatarData(cliente.created_at)}
                          </strong>
                        </div>
                      </div>

                      <div style={actionsStyle}>
                        <button
                          type="button"
                          style={accessButtonStyle}
                          onClick={() => abrirCliente(cliente.id)}
                        >
                          Ver cliente
                        </button>

                        <Link
                          href={`/emitir?client_id=${cliente.id}`}
                          style={quickActionStyle}
                        >
                          Emitir nota
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
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
  maxWidth: "1280px",
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
  minWidth: "220px",
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
};

const heroInfoSubStyle: CSSProperties = {
  color: "#cbd5e1",
  fontSize: "13px",
  lineHeight: 1.5,
};

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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

const toolbarCardStyle: CSSProperties = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "18px",
  background: "rgba(2, 6, 23, 0.68)",
  border: "1px solid rgba(59, 130, 246, 0.14)",
  borderRadius: "24px",
  padding: "16px",
  boxShadow: "0 18px 45px rgba(0,0,0,0.28)",
  backdropFilter: "blur(14px)",
};

const searchWrapperStyle: CSSProperties = {
  flex: 1,
  minWidth: "280px",
};

const searchInputStyle: CSSProperties = {
  width: "100%",
  background: "rgba(15, 23, 42, 0.92)",
  border: "1px solid rgba(59, 130, 246, 0.18)",
  borderRadius: "16px",
  color: "#ffffff",
  padding: "15px 16px",
  outline: "none",
  fontSize: "14px",
  boxSizing: "border-box",
  boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
};

const toolbarButtonsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const exportButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "13px 17px",
  borderRadius: "16px",
  background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
  color: "#ffffff",
  border: "none",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 12px 28px rgba(14,165,233,0.24)",
};

const newButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "13px 17px",
  borderRadius: "16px",
  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  color: "#ffffff",
  border: "none",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 12px 28px rgba(16,185,129,0.26)",
};

const secondaryToolbarButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "13px 17px",
  borderRadius: "16px",
  background:
    "linear-gradient(135deg, rgba(37,99,235,0.20) 0%, rgba(59,130,246,0.16) 100%)",
  border: "1px solid rgba(59, 130, 246, 0.28)",
  color: "#ffffff",
  fontWeight: 700,
  textDecoration: "none",
};

const backButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "13px 17px",
  borderRadius: "16px",
  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  color: "#ffffff",
  border: "none",
  fontWeight: 800,
  textDecoration: "none",
  boxShadow: "0 12px 28px rgba(37,99,235,0.26)",
};

const listCardStyle: CSSProperties = {
  background: "rgba(2, 6, 23, 0.68)",
  border: "1px solid rgba(59, 130, 246, 0.14)",
  borderRadius: "28px",
  padding: "18px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.34)",
  backdropFilter: "blur(16px)",
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "18px",
  paddingBottom: "14px",
  borderBottom: "1px solid rgba(148, 163, 184, 0.10)",
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "22px",
  fontWeight: 800,
  color: "#ffffff",
};

const sectionSubtitleStyle: CSSProperties = {
  margin: "6px 0 0 0",
  fontSize: "14px",
  color: "#94a3b8",
};

const loadingStyle: CSSProperties = {
  color: "#cbd5e1",
  padding: "24px 10px",
  fontSize: "15px",
};

const emptyStyle: CSSProperties = {
  color: "#94a3b8",
  padding: "24px 10px",
  fontSize: "15px",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
  gap: "16px",
};

const clientCardStyle: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(2, 6, 23, 0.92) 0%, rgba(15, 23, 42, 0.92) 100%)",
  border: "1px solid rgba(59, 130, 246, 0.16)",
  borderRadius: "24px",
  padding: "18px",
  boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
};

const cardHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "16px",
};

const clientIdStyle: CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#93c5fd",
  letterSpacing: "0.08em",
  marginBottom: "6px",
  fontWeight: 700,
};

const clientNameStyle: CSSProperties = {
  margin: 0,
  fontSize: "19px",
  fontWeight: 800,
  color: "#ffffff",
  lineHeight: 1.3,
};

const statusBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "74px",
  padding: "7px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
};

const statusActiveStyle: CSSProperties = {
  color: "#bbf7d0",
  backgroundColor: "rgba(16, 185, 129, 0.16)",
  border: "1px solid rgba(16, 185, 129, 0.28)",
};

const statusInactiveStyle: CSSProperties = {
  color: "#fecaca",
  backgroundColor: "rgba(239, 68, 68, 0.12)",
  border: "1px solid rgba(239, 68, 68, 0.24)",
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
  lineHeight: 1.5,
};

const actionsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  marginTop: "16px",
  flexWrap: "wrap",
};

const accessButtonStyle: CSSProperties = {
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

const quickActionStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "12px 16px",
  borderRadius: "14px",
  background: "rgba(16, 185, 129, 0.15)",
  border: "1px solid rgba(16, 185, 129, 0.28)",
  color: "#d1fae5",
  fontWeight: 700,
};