"use client";

import Link from "next/link";
import { useState } from "react";

export default function ResetSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<"sucesso" | "erro" | "">("");

  async function handleSolicitarLink() {
    try {
      setLoading(true);
      setMensagem("");
      setTipoMensagem("");

      const response = await fetch("/api/auth/solicitar-reset-senha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setMensagem(data?.message || "Erro ao solicitar redefinição de senha.");
        setTipoMensagem("erro");
        return;
      }

      setMensagem(
        data?.message || "Foi encaminhado no seu e-mail o link para recuperar sua senha."
      );
      setTipoMensagem("sucesso");
      setEmail("");
    } catch (error: any) {
      setMensagem(error?.message || "Erro ao solicitar redefinição de senha.");
      setTipoMensagem("erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <section style={heroCardStyle}>
          <div style={badgeStyle}>MVP_ Automação Fiscal</div>

          <h1 style={heroTitleStyle}>Recuperar senha</h1>

          <div style={heroInfoRowStyle}>
            <div style={heroInfoCardStyle}>
              <span style={heroInfoLabelStyle}>Acesso</span>
              <strong style={heroInfoValueStyle}>Solicitação por email</strong>
            </div>

            <div style={heroInfoCardStyle}>
              <span style={heroInfoLabelStyle}>Fluxo</span>
              <strong style={heroInfoValueStyle}>Envio de link</strong>
            </div>
          </div>
        </section>

        <section style={loginCardStyle}>
          <div style={cardTopStyle}>
            <div>
              <p style={cardMiniTitleStyle}>Recuperação</p>
              <h2 style={cardTitleStyle}>Receba o link por email</h2>
            </div>

            <div style={sidePillStyle}>Email</div>
          </div>

          <div style={formStyle}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                style={inputStyle}
              />
            </div>

            {mensagem && (
              <div
                style={
                  tipoMensagem === "erro"
                    ? inlineErrorMessageStyle
                    : inlineSuccessMessageStyle
                }
              >
                <strong style={{ display: "block", marginBottom: "4px" }}>
                  {tipoMensagem === "erro"
                    ? "Não foi possível enviar"
                    : "Solicitação recebida"}
                </strong>
                <span>{mensagem}</span>
              </div>
            )}

            <div style={helperRowStyle}>
              <Link href="/login" style={helperLinkStyle}>
                Voltar para login
              </Link>

              <Link href="/cadastro-cliente" style={helperLinkStyle}>
                Criar conta
              </Link>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleSolicitarLink}
              style={{
                ...loginButtonStyle,
                opacity: loading ? 0.78 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Enviando link..." : "Enviar link por email"}
            </button>
          </div>
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
    "radial-gradient(circle at top, rgba(37,99,235,0.20) 0%, rgba(2,6,23,1) 30%, rgba(2,6,23,1) 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "28px 18px",
  fontFamily: "Arial, sans-serif",
  color: "#ffffff",
};

const containerStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  width: "100%",
  maxWidth: "560px",
};

const heroCardStyle: React.CSSProperties = {
  marginBottom: "18px",
  padding: "24px 24px 20px",
  borderRadius: "28px",
  background:
    "linear-gradient(135deg, rgba(2,6,23,0.82) 0%, rgba(8,17,40,0.92) 100%)",
  border: "1px solid rgba(59,130,246,0.16)",
  boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
  backdropFilter: "blur(16px)",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 14px",
  borderRadius: "999px",
  background: "rgba(59,130,246,0.14)",
  border: "1px solid rgba(59,130,246,0.20)",
  color: "#bfdbfe",
  fontSize: "12px",
  fontWeight: 700,
  marginBottom: "14px",
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "40px",
  fontWeight: 800,
  lineHeight: 1.1,
  letterSpacing: "-0.02em",
  color: "#ffffff",
};

const heroInfoRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
  marginTop: "18px",
};

const heroInfoCardStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: "18px",
  background: "rgba(15,23,42,0.86)",
  border: "1px solid rgba(59,130,246,0.12)",
};

const heroInfoLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#93c5fd",
  marginBottom: "6px",
};

const heroInfoValueStyle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  color: "#ffffff",
};

const loginCardStyle: React.CSSProperties = {
  padding: "24px",
  borderRadius: "28px",
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.90) 0%, rgba(15,23,42,0.92) 100%)",
  border: "1px solid rgba(59,130,246,0.16)",
  boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
  backdropFilter: "blur(16px)",
};

const cardTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "20px",
};

const cardMiniTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "12px",
  color: "#93c5fd",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 700,
};

const cardTitleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: "28px",
  fontWeight: 800,
  color: "#ffffff",
};

const sidePillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 12px",
  borderRadius: "999px",
  background: "rgba(16,185,129,0.12)",
  border: "1px solid rgba(16,185,129,0.22)",
  color: "#a7f3d0",
  fontSize: "12px",
  fontWeight: 700,
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const fieldGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const labelStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#93c5fd",
  fontWeight: 700,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "15px 16px",
  borderRadius: "16px",
  border: "1px solid rgba(59,130,246,0.16)",
  background: "rgba(15,23,42,0.92)",
  color: "#ffffff",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const helperRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
};

const helperLinkStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#93c5fd",
  textDecoration: "none",
  fontWeight: 700,
};

const loginButtonStyle: React.CSSProperties = {
  marginTop: "6px",
  width: "100%",
  padding: "15px 18px",
  borderRadius: "16px",
  border: "none",
  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  color: "#ffffff",
  fontWeight: 800,
  fontSize: "15px",
  boxShadow: "0 14px 30px rgba(37,99,235,0.30)",
};

const inlineSuccessMessageStyle: React.CSSProperties = {
  background: "rgba(16,185,129,0.10)",
  border: "1px solid rgba(16,185,129,0.18)",
  color: "#d1fae5",
  borderRadius: "16px",
  padding: "14px 16px",
  fontSize: "13px",
  lineHeight: 1.5,
};

const inlineErrorMessageStyle: React.CSSProperties = {
  background: "rgba(239,68,68,0.10)",
  border: "1px solid rgba(239,68,68,0.18)",
  color: "#fecaca",
  borderRadius: "16px",
  padding: "14px 16px",
  fontSize: "13px",
  lineHeight: 1.5,
};