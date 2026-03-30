"use client";

import { useEffect, useState } from "react";
import { getClientSession } from "@/lib/session";

type CheckoutResponse = {
  success: boolean;
  init_point?: string;
  sandbox_init_point?: string;
  message?: string;
};

export default function PlanosPage() {
  const whatsappLink =
    "https://wa.me/5511982966310?text=Quero%20suporte%20no%20MVP%20Automa%C3%A7%C3%A3o%20Fiscal";

  const [loadingPlano, setLoadingPlano] = useState<"essencial" | "black" | "">("");
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<"sucesso" | "erro" | "aviso" | "">("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const status = url.searchParams.get("status");

    if (status === "success") {
      setMensagem("Pagamento aprovado! Seu plano está em processamento de liberação.");
      setTipoMensagem("sucesso");
    } else if (status === "pending") {
      setMensagem("Pagamento pendente. Assim que for confirmado, seu plano será liberado.");
      setTipoMensagem("aviso");
    } else if (status === "failure") {
      setMensagem("Pagamento não concluído. Tente novamente ou fale com o suporte.");
      setTipoMensagem("erro");
    }
  }, []);

  async function assinarPlano(plano: "essencial" | "black") {
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

      const response = await fetch("/api/mercadopago/criar-preferencia", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: clientSession.id,
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
          <h1 style={titleStyle}>
            Emita NFS-e automaticamente sem perder tempo
          </h1>

          <p style={subtitleStyle}>
            Pare de emitir nota manualmente. Automatize tudo em segundos,
            evite erros e ganhe tempo para focar no que realmente importa.
          </p>

          <a href={whatsappLink} target="_blank" style={ctaButtonStyle}>
            Falar no WhatsApp
          </a>
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
            <h2 style={planTitleStyle}>Essencial</h2>
            <p style={priceStyle}>R$29,90</p>

            <ul style={listStyle}>
              <li>✔ Até 10 notas por mês</li>
              <li>✔ Emissão automática</li>
              <li>✔ Simples e rápido</li>
              <li>✔ Ideal para MEI</li>
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
              {loadingPlano === "essencial" ? "Redirecionando..." : "Assinar Essencial"}
            </button>
          </div>

          <div style={{ ...cardStyle, border: "2px solid #22c55e" }}>
            <h2 style={planTitleStyle}>Black</h2>
            <p style={priceStyle}>R$59,90</p>

            <ul style={listStyle}>
              <li>✔ Notas ilimitadas</li>
              <li>✔ Emissão automática</li>
              <li>✔ Mais velocidade</li>
              <li>✔ Prioridade</li>
            </ul>

            <button
              onClick={() => assinarPlano("black")}
              disabled={loadingPlano !== ""}
              style={{
                ...buttonPrimaryStyle,
                opacity: loadingPlano !== "" ? 0.75 : 1,
                cursor: loadingPlano !== "" ? "not-allowed" : "pointer",
              }}
            >
              {loadingPlano === "black" ? "Redirecionando..." : "Assinar Black"}
            </button>
          </div>
        </section>

        <section style={footerNoteStyle}>
          <p>
            Empresas e contadores com múltiplos clientes possuem plano
            personalizado. O WhatsApp fica disponível para suporte e dúvidas.
          </p>
        </section>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#020617",
  color: "#fff",
  display: "flex",
  justifyContent: "center",
  padding: "40px 20px",
};

const containerStyle: React.CSSProperties = {
  maxWidth: "900px",
  width: "100%",
};

const heroStyle: React.CSSProperties = {
  textAlign: "center",
  marginBottom: "50px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "36px",
  fontWeight: "800",
  marginBottom: "20px",
};

const subtitleStyle: React.CSSProperties = {
  fontSize: "16px",
  color: "#94a3b8",
  marginBottom: "30px",
};

const ctaButtonStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "14px 24px",
  borderRadius: "10px",
  background: "#22c55e",
  color: "#fff",
  fontWeight: "700",
  textDecoration: "none",
};

const plansGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "20px",
  marginBottom: "40px",
};

const cardStyle: React.CSSProperties = {
  background: "#0f172a",
  borderRadius: "16px",
  padding: "24px",
  border: "1px solid #1e293b",
};

const planTitleStyle: React.CSSProperties = {
  fontSize: "22px",
  marginBottom: "10px",
};

const priceStyle: React.CSSProperties = {
  fontSize: "28px",
  fontWeight: "800",
  marginBottom: "20px",
};

const listStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  marginBottom: "20px",
  lineHeight: "28px",
};

const buttonStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "center",
  padding: "12px",
  borderRadius: "10px",
  background: "#1e293b",
  color: "#fff",
  textDecoration: "none",
  fontWeight: "600",
  border: "none",
};

const buttonPrimaryStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "center",
  padding: "12px",
  borderRadius: "10px",
  background: "#22c55e",
  color: "#fff",
  textDecoration: "none",
  fontWeight: "700",
  border: "none",
};

const footerNoteStyle: React.CSSProperties = {
  textAlign: "center",
  color: "#94a3b8",
  fontSize: "14px",
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