"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { getClientSession } from "@/lib/session";

export default function PlanosPage() {
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

      const clientSession = getClientSession();

      if (!clientSession?.id) {
        setMensagem("Faça login como cliente antes de assinar um plano.");
        setTipoMensagem("erro");
        setLoadingPlano("");
        return;
      }

      window.location.href = `/checkout?plano=${plano}`;
    } catch (error) {
      console.log("Erro ao iniciar checkout:", error);
      setMensagem("Erro inesperado ao iniciar checkout.");
      setTipoMensagem("erro");
      setLoadingPlano("");
    }
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <section style={heroStyle}>
          <h1 className="planos-title-responsive" style={titleStyle}>
            Escolha o plano ideal para sua operação
          </h1>

          <p className="planos-subtitle-responsive" style={subtitleStyle}>
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

        <section className="planos-grid-responsive" style={plansGridStyle}>
          <div className="planos-card-responsive" style={cardStyle}>
            <div style={pillRowStyle}>
              <span style={topPillStyle}>MEI</span>
            </div>

            <h2 style={planTitleStyle}>Essencial</h2>
            <p style={priceStyle}>R$ 29,90</p>
            <p style={planTextStyle}>
              Entrada com excelente custo-benefício para quem quer começar com
              organização.
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

          <div className="planos-card-responsive" style={cardFeaturedStyle}>
            <div style={pillRowStyle}>
              <span style={topPillFeaturedStyle}>MAIS COMPLETO</span>
            </div>

            <h2 style={planTitleStyle}>Full</h2>
            <p style={priceStyle}>R$ 59,90</p>
            <p style={planTextStyle}>
              Para quem quer operar com mais liberdade, velocidade e escala no
              dia a dia fiscal.
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
        </section>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .planos-grid-responsive {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 768px) {
          .planos-title-responsive {
            font-size: 28px !important;
            line-height: 1.1 !important;
          }

          .planos-subtitle-responsive {
            font-size: 16px !important;
          }

          .planos-card-responsive {
            padding: 18px !important;
            border-radius: 22px !important;
          }
        }
      `}</style>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background:
    "linear-gradient(135deg, #020617 0%, #081224 35%, #0f172a 65%, #071b34 100%)",
  color: "#fff",
  display: "flex",
  justifyContent: "center",
  padding: "40px 20px",
};

const containerStyle: CSSProperties = {
  maxWidth: "1200px",
  width: "100%",
};

const heroStyle: CSSProperties = {
  marginBottom: "28px",
};

const titleStyle: CSSProperties = {
  fontSize: "clamp(28px, 6vw, 48px)",
  fontWeight: 800,
  margin: 0,
  marginBottom: "12px",
  lineHeight: 1.1,
};

const subtitleStyle: CSSProperties = {
  fontSize: "18px",
  color: "#cbd5e1",
  margin: 0,
  maxWidth: "860px",
};

const plansGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "18px",
};

const cardStyle: CSSProperties = {
  background: "rgba(2, 6, 23, 0.78)",
  borderRadius: "24px",
  padding: "20px",
  border: "1px solid rgba(59, 130, 246, 0.18)",
  boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
};

const cardFeaturedStyle: CSSProperties = {
  ...cardStyle,
  border: "1px solid rgba(16, 185, 129, 0.35)",
  boxShadow: "0 22px 50px rgba(0,0,0,0.32)",
};

const pillRowStyle: CSSProperties = {
  marginBottom: "16px",
};

const topPillStyle: CSSProperties = {
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

const topPillFeaturedStyle: CSSProperties = {
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

const planTitleStyle: CSSProperties = {
  fontSize: "22px",
  margin: 0,
  marginBottom: "10px",
  fontWeight: 800,
};

const priceStyle: CSSProperties = {
  fontSize: "30px",
  fontWeight: 800,
  margin: 0,
  marginBottom: "12px",
};

const planTextStyle: CSSProperties = {
  fontSize: "15px",
  color: "#e2e8f0",
  lineHeight: 1.7,
  marginBottom: "18px",
};

const listStyle: CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  marginBottom: "18px",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const listItemStyle: CSSProperties = {
  background: "rgba(15, 23, 42, 0.92)",
  border: "1px solid rgba(59, 130, 246, 0.16)",
  borderRadius: "14px",
  padding: "12px 14px",
  lineHeight: "24px",
  fontWeight: 700,
};

const buttonStyle: CSSProperties = {
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

const buttonPrimaryStyle: CSSProperties = {
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

const successMessageStyle: CSSProperties = {
  marginBottom: "20px",
  padding: "14px 16px",
  borderRadius: "12px",
  backgroundColor: "rgba(16, 185, 129, 0.12)",
  border: "1px solid rgba(16, 185, 129, 0.25)",
  color: "#bbf7d0",
};

const warningMessageStyle: CSSProperties = {
  marginBottom: "20px",
  padding: "14px 16px",
  borderRadius: "12px",
  backgroundColor: "rgba(245, 158, 11, 0.12)",
  border: "1px solid rgba(245, 158, 11, 0.25)",
  color: "#fde68a",
};

const errorMessageStyle: CSSProperties = {
  marginBottom: "20px",
  padding: "14px 16px",
  borderRadius: "12px",
  backgroundColor: "rgba(239, 68, 68, 0.12)",
  border: "1px solid rgba(239, 68, 68, 0.25)",
  color: "#fecaca",
};