"use client";

import { useEffect, useState } from "react";
import { getPartnerCompanySession } from "@/lib/session";

type CheckoutResponse = {
  success: boolean;
  init_point?: string;
  sandbox_init_point?: string;
  message?: string;
};

export default function PlanosPage() {
  const whatsappLink =
    "https://wa.me/5511982966310?text=Olá!%20Quero%20falar%20sobre%20o%20plano%20Parceiro%20da%20MVP%20Automação%20Fiscal.";

  const [loadingPlano, setLoadingPlano] = useState<"essencial" | "full" | "">("");
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<
    "sucesso" | "erro" | "aviso" | ""
  >("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const status = url.searchParams.get("status");

    if (status === "success") {
      setMensagem(
        "Pagamento aprovado! Seu plano está em processamento de liberação."
      );
      setTipoMensagem("sucesso");
    } else if (status === "pending") {
      setMensagem(
        "Pagamento pendente. Assim que for confirmado, seu plano será liberado."
      );
      setTipoMensagem("aviso");
    } else if (status === "failure") {
      setMensagem(
        "Pagamento não concluído. Tente novamente ou fale com o suporte."
      );
      setTipoMensagem("erro");
    }
  }, []);

  async function assinarPlano(plano: "essencial" | "full") {
    try {
      setLoadingPlano(plano);
      setMensagem("");
      setTipoMensagem("");

      const empresaSession = getPartnerCompanySession();

      if (!empresaSession?.id) {
        setMensagem("Faça login como empresa antes de assinar um plano.");
        setTipoMensagem("erro");
        setLoadingPlano("");
        return;
      }

      const response = await fetch("/api/mercadopago/criar-preferencia", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          empresaId: empresaSession.id,
          plano,
        }),
      });

      const result: CheckoutResponse = await response.json();

      if (!response.ok || !result.success || !result.init_point) {
        setMensagem(result.message || "Não foi possível iniciar o pagamento.");
        setTipoMensagem("erro");
        setLoadingPlano("");
        return;
      }

      window.location.href = result.init_point;
    } catch (error) {
      console.log("Erro ao iniciar pagamento:", error);
      setMensagem("Erro inesperado ao iniciar pagamento.");
      setTipoMensagem("erro");
      setLoadingPlano("");
    }
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <section style={heroStyle}>
          <h1 style={titleStyle}>Escolha o plano ideal para sua operação</h1>

          <p style={subtitleStyle}>
            Assine online, avance para o checkout e ative o sistema conforme a
            necessidade da sua operação.
          </p>
        </section>

        {mensagem && (
          <div
            style={
              tipoMensagem === "sucesso"
                ? successMessageStyle
                : tipoMensagem === "aviso"
                ? warningMessageStyle
                : errorMessageStyle
            }
          >
            {mensagem}
          </div>
        )}

        <section style={plansGridStyle}>
          <div style={cardStyle}>
            <div style={pillRowStyle}>
              <span style={topPillStyle}>MEI</span>
            </div>

            <h2 style={planTitleStyle}>Essencial</h2>
            <p style={priceStyle}>R$ 29,90</p>
            <p style={planTextStyle}>
              Entrada com excelente custo-benefício para quem quer começar com organização.
            </p>

            <ul style={listStyle}>
              <li style={listItemStyle}>✔ Até 10 notas por mês</li>
              <li style={listItemStyle}>✔ Emissão individual</li>
              <li style={listItemStyle}>✔ Histórico básico</li>
              <li style={listItemStyle}>✔ PDF e XML organizados</li>
            </ul>

            <button
              onClick={() => assinarPlano("essencial")}
              disabled={loadingPlano !== ""}
              style={{
                ...buttonStyle,
                opacity: loadingPlano !== "" ? 0.75 : 1,
                cursor: loadingPlano !== "" ? "not-allowed" : "pointer",
              }}
            >
              {loadingPlano === "essencial"
                ? "Redirecionando..."
                : "Assinar Essencial"}
            </button>
          </div>

          <div style={cardFeaturedStyle}>
            <div style={pillRowStyle}>
              <span style={topPillFeaturedStyle}>MAIS COMPLETO</span>
            </div>

            <h2 style={planTitleStyle}>Full</h2>
            <p style={priceStyle}>R$ 59,90</p>
            <p style={planTextStyle}>
              Para quem quer operar com mais liberdade, velocidade e escala no dia a dia fiscal.
            </p>

            <ul style={listStyle}>
              <li style={listItemStyle}>✔ Notas ilimitadas</li>
              <li style={listItemStyle}>✔ Emissão automática completa</li>
              <li style={listItemStyle}>✔ Dashboard operacional completo</li>
              <li style={listItemStyle}>✔ Controle centralizado de clientes</li>
              <li style={listItemStyle}>✔ Histórico completo de emissões</li>
              <li style={listItemStyle}>✔ PDF e XML organizados</li>
            </ul>

            <button
              onClick={() => assinarPlano("full")}
              disabled={loadingPlano !== ""}
              style={{
                ...buttonPrimaryStyle,
                opacity: loadingPlano !== "" ? 0.75 : 1,
                cursor: loadingPlano !== "" ? "not-allowed" : "pointer",
              }}
            >
              {loadingPlano === "full" ? "Redirecionando..." : "Assinar Full"}
            </button>
          </div>

          <div style={cardStyle}>
            <div style={pillRowStyle}>
              <span style={topPillStyle}>Empresas e escritórios</span>
            </div>

            <h2 style={planTitleStyle}>Parceiro</h2>
            <p style={priceConsultStyle}>R$ 30/mês + R$ 7 por cliente ativo</p>
            <p style={planTextStyle}>
              Ideal para empresas parceiras e escritórios que operam com múltiplos
              clientes, cobrança escalável e emissão ilimitada.
            </p>

            <ul style={listStyle}>
              <li style={listItemStyle}>✔ Emissões ilimitadas</li>
              <li style={listItemStyle}>✔ Múltiplos clientes</li>
              <li style={listItemStyle}>✔ Emissão em massa</li>
              <li style={listItemStyle}>✔ Dashboard operacional</li>
              <li style={listItemStyle}>✔ Estrutura escalável SaaS</li>
              <li style={listItemStyle}>✔ Base fixa + valor por cliente ativo</li>
            </ul>

            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              style={partnerButtonStyle}
            >
              Falar com o consultor
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "linear-gradient(135deg, #020617 0%, #081224 35%, #0f172a 65%, #071b34 100%)",
  color: "#fff",
  display: "flex",
  justifyContent: "center",
  padding: "40px 20px",
};

const containerStyle: React.CSSProperties = {
  maxWidth: "1200px",
  width: "100%",
};

const heroStyle: React.CSSProperties = {
  marginBottom: "28px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "48px",
  fontWeight: 800,
  margin: 0,
  marginBottom: "12px",
  lineHeight: 1.1,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: "18px",
  color: "#cbd5e1",
  margin: 0,
};

const plansGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "18px",
};

const cardStyle: React.CSSProperties = {
  background: "rgba(2, 6, 23, 0.78)",
  borderRadius: "24px",
  padding: "20px",
  border: "1px solid rgba(59, 130, 246, 0.18)",
  boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
};

const cardFeaturedStyle: React.CSSProperties = {
  ...cardStyle,
  border: "1px solid rgba(16, 185, 129, 0.35)",
  boxShadow: "0 22px 50px rgba(0,0,0,0.32)",
};

const pillRowStyle: React.CSSProperties = {
  marginBottom: "16px",
};

const topPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 12px",
  borderRadius: "999px",
  background: "rgba(37, 99, 235, 0.16)",
  border: "1px solid rgba(59, 130, 246, 0.28)",
  color: "#dbeafe",
  fontSize: "12px",
  fontWeight: 800,
};

const topPillFeaturedStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 12px",
  borderRadius: "999px",
  background: "rgba(16, 185, 129, 0.16)",
  border: "1px solid rgba(16, 185, 129, 0.28)",
  color: "#d1fae5",
  fontSize: "12px",
  fontWeight: 800,
};

const planTitleStyle: React.CSSProperties = {
  fontSize: "22px",
  margin: 0,
  marginBottom: "10px",
  fontWeight: 800,
};

const priceStyle: React.CSSProperties = {
  fontSize: "30px",
  fontWeight: 800,
  margin: 0,
  marginBottom: "12px",
};

const priceConsultStyle: React.CSSProperties = {
  fontSize: "30px",
  fontWeight: 800,
  margin: 0,
  marginBottom: "12px",
  color: "#bfdbfe",
  lineHeight: 1.3,
};

const planTextStyle: React.CSSProperties = {
  fontSize: "15px",
  color: "#e2e8f0",
  lineHeight: 1.7,
  marginBottom: "18px",
};

const listStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  marginBottom: "18px",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const listItemStyle: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.92)",
  border: "1px solid rgba(59, 130, 246, 0.16)",
  borderRadius: "14px",
  padding: "12px 14px",
  lineHeight: "24px",
  fontWeight: 700,
};

const buttonStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "center",
  padding: "14px 16px",
  borderRadius: "14px",
  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 800,
  border: "none",
  fontSize: "16px",
};

const buttonPrimaryStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "center",
  padding: "14px 16px",
  borderRadius: "14px",
  background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 800,
  border: "none",
  fontSize: "16px",
};

const partnerButtonStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "center",
  padding: "14px 16px",
  borderRadius: "14px",
  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 800,
  fontSize: "16px",
};

const successMessageStyle: React.CSSProperties = {
  marginBottom: "20px",
  padding: "14px 16px",
  borderRadius: "12px",
  backgroundColor: "rgba(16, 185, 129, 0.12)",
  border: "1px solid rgba(16, 185, 129, 0.25)",
  color: "#bbf7d0",
};

const warningMessageStyle: React.CSSProperties = {
  marginBottom: "20px",
  padding: "14px 16px",
  borderRadius: "12px",
  backgroundColor: "rgba(245, 158, 11, 0.12)",
  border: "1px solid rgba(245, 158, 11, 0.25)",
  color: "#fde68a",
};

const errorMessageStyle: React.CSSProperties = {
  marginBottom: "20px",
  padding: "14px 16px",
  borderRadius: "12px",
  backgroundColor: "rgba(239, 68, 68, 0.12)",
  border: "1px solid rgba(239, 68, 68, 0.25)",
  color: "#fecaca",
};