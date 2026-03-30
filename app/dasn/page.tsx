"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type User = {
  id: number;
  name: string;
  email: string;
  user_type: string;
  is_active: boolean;
};

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
  is_active: boolean;
  client_type: string;
};

export default function DASNPage() {
  const router = useRouter();

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      setLoading(true);
      setMensagem("");

      const userStorage = localStorage.getItem("user");

      if (!userStorage) {
        router.push("/login-empresa");
        return;
      }

      const userConvertido: User = JSON.parse(userStorage);

      const { data: empresaData, error: empresaError } = await supabase
        .from("partner_companies")
        .select("*")
        .eq("user_id", userConvertido.id)
        .single();

      if (empresaError || !empresaData) {
        setMensagem("Nenhuma empresa parceira encontrada para este usuário.");
        setLoading(false);
        return;
      }

      setEmpresa(empresaData);

      const { data: clientesData, error: clientesError } = await supabase
        .from("clients")
        .select("id, name, cnpj, is_active, client_type")
        .eq("partner_company_id", empresaData.id)
        .order("name", { ascending: true });

      if (clientesError) {
        setMensagem("Erro ao carregar clientes.");
        setLoading(false);
        return;
      }

      setClientes(clientesData || []);
      setLoading(false);
    } catch (error) {
      console.log(error);
      setMensagem("Erro inesperado ao carregar a página.");
      setLoading(false);
    }
  }

  const meis = clientes.filter((c) => (c.client_type || "").toLowerCase() === "mei");
  const meisAtivos = meis.filter((c) => c.is_active).length;

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <div style={topBarStyle}>
          <div>
            <span style={brandMiniStyle}>MVP Automação Fiscal</span>
            <h1 style={titleStyle}>DASN-SIMEI</h1>
            <p style={subtitleStyle}>
              Área reservada para acompanhamento e futura automação da declaração anual dos clientes MEI.
            </p>
          </div>

          <div style={navActionsStyle}>
            <Link href="/dashboard-empresa" style={navButtonStyle}>
              Menu principal
            </Link>
            <Link href="/das" style={navButtonStyle}>
              DAS
            </Link>
            <Link href="/clientes" style={primaryNavButtonStyle}>
              Clientes
            </Link>
          </div>
        </div>

        {mensagem && <div style={errorMessageStyle}>{mensagem}</div>}

        <section style={heroCardStyle}>
          <div>
            <span style={heroTagStyle}>Declaração anual</span>
            <h2 style={heroTitleStyle}>Preparação do módulo DASN-SIMEI</h2>
            <p style={heroTextStyle}>
              Esta área será responsável por organizar clientes elegíveis, competências e informações para a declaração anual.
            </p>
          </div>

          <div style={heroInfoBoxStyle}>
            <span style={heroInfoLabelStyle}>Empresa logada</span>
            <strong style={heroInfoValueStyle}>
              {empresa?.name || "Carregando..."}
            </strong>
          </div>
        </section>

        {loading ? (
          <div style={loadingBoxStyle}>Carregando informações...</div>
        ) : (
          <>
            <section style={statsGridStyle}>
              <div style={statCardStyle}>
                <span style={statLabelStyle}>Clientes MEI</span>
                <strong style={statValueStyle}>{meis.length}</strong>
              </div>

              <div style={statCardStyle}>
                <span style={statLabelStyle}>MEIs ativos</span>
                <strong style={statValueStyle}>{meisAtivos}</strong>
              </div>

              <div style={statCardStyle}>
                <span style={statLabelStyle}>Declaração</span>
                <strong style={statValueStyle}>Em breve</strong>
              </div>
            </section>

            <section style={contentGridStyle}>
              <div style={mainCardStyle}>
                <div style={sectionHeaderStyle}>
                  <h3 style={sectionTitleStyle}>Planejamento do módulo</h3>
                  <p style={sectionTextStyle}>
                    Base visual pronta para receber a lógica da DASN-SIMEI.
                  </p>
                </div>

                <div style={featureListStyle}>
                  <div style={featureItemStyle}>
                    <strong>Lista de MEIs elegíveis</strong>
                    <p style={featureTextStyle}>
                      Separação automática dos clientes do tipo MEI para a declaração anual.
                    </p>
                  </div>

                  <div style={featureItemStyle}>
                    <strong>Organização por ano-base</strong>
                    <p style={featureTextStyle}>
                      Controle por exercício e conferência de movimentação anual.
                    </p>
                  </div>

                  <div style={featureItemStyle}>
                    <strong>Automação futura</strong>
                    <p style={featureTextStyle}>
                      Etapa preparada para integração com o fluxo de preenchimento e acompanhamento da DASN.
                    </p>
                  </div>
                </div>
              </div>

              <div style={sideCardStyle}>
                <div style={sectionHeaderStyle}>
                  <h3 style={sectionTitleStyle}>Situação atual</h3>
                </div>

                <div style={statusBoxStyle}>
                  <span style={statusTagStyle}>Estrutura pronta</span>
                  <p style={statusTextStyle}>
                    O módulo já está no sistema e pronto para receber regras, filtros e automações da declaração anual.
                  </p>
                </div>

                <div style={quickActionsStyle}>
                  <Link href="/das" style={secondaryLinkStyle}>
                    Ir para DAS
                  </Link>

                  <Link href="/dashboard-empresa" style={secondaryLinkStyle}>
                    Voltar ao dashboard
                  </Link>
                </div>
              </div>
            </section>
          </>
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

const navActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
};

const navButtonStyle: React.CSSProperties = {
  textDecoration: "none",
  backgroundColor: "#ffffff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: "12px",
  padding: "12px 16px",
  fontSize: "14px",
  fontWeight: 700,
  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.05)",
};

const primaryNavButtonStyle: React.CSSProperties = {
  textDecoration: "none",
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: "#ffffff",
  border: "none",
  borderRadius: "12px",
  padding: "12px 16px",
  fontSize: "14px",
  fontWeight: 700,
  boxShadow: "0 10px 24px rgba(37, 99, 235, 0.20)",
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

const heroInfoBoxStyle: React.CSSProperties = {
  minWidth: "220px",
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
  gridTemplateColumns: "minmax(0, 1.5fr) minmax(280px, 0.8fr)",
  gap: "24px",
};

const mainCardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "24px",
  padding: "28px",
  boxShadow: "0 14px 38px rgba(15, 23, 42, 0.06)",
};

const sideCardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "24px",
  padding: "24px",
  boxShadow: "0 14px 38px rgba(15, 23, 42, 0.06)",
  alignSelf: "start",
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
};

const featureListStyle: React.CSSProperties = {
  display: "grid",
  gap: "16px",
};

const featureItemStyle: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  padding: "16px",
};

const featureTextStyle: React.CSSProperties = {
  margin: "8px 0 0 0",
  color: "#475569",
  lineHeight: 1.6,
};

const statusBoxStyle: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  padding: "16px",
};

const statusTagStyle: React.CSSProperties = {
  display: "inline-block",
  fontSize: "12px",
  fontWeight: 700,
  color: "#1d4ed8",
  backgroundColor: "#dbeafe",
  borderRadius: "999px",
  padding: "6px 10px",
  marginBottom: "10px",
};

const statusTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#475569",
  lineHeight: 1.6,
};

const quickActionsStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
  marginTop: "16px",
};

const secondaryLinkStyle: React.CSSProperties = {
  textDecoration: "none",
  textAlign: "center",
  backgroundColor: "#eef2ff",
  color: "#3730a3",
  border: "1px solid #c7d2fe",
  borderRadius: "12px",
  padding: "12px 14px",
  fontSize: "14px",
  fontWeight: 700,
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