"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

function NovaSenhaContent() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<"sucesso" | "erro" | "">("");

  async function handleRedefinirSenha() {
    try {
      setLoading(true);
      setMensagem("");
      setTipoMensagem("");

      const response = await fetch("/api/auth/redefinir-senha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          senha,
          confirmarSenha,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setMensagem(data?.message || "Erro ao redefinir senha.");
        setTipoMensagem("erro");
        return;
      }

      setMensagem("Senha atualizada com sucesso. Agora você já pode entrar no sistema.");
      setTipoMensagem("sucesso");
      setSenha("");
      setConfirmarSenha("");
    } catch (error: any) {
      setMensagem(error?.message || "Erro ao redefinir senha.");
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

          <h1 style={heroTitleStyle}>Nova senha</h1>

          <div style={heroInfoRowStyle}>
            <div style={heroInfoCardStyle}>
              <span style={heroInfoLabelStyle}>Acesso</span>
              <strong style={heroInfoValueStyle}>Atualização segura</strong>
            </div>

            <div style={heroInfoCardStyle}>
              <span style={heroInfoLabelStyle}>Fluxo</span>
              <strong style={heroInfoValueStyle}>Nova senha</strong>
            </div>
          </div>
        </section>

        {mensagem && (
          <div
            style={{
              ...messageStyle,
              ...(tipoMensagem === "erro" ? errorMessageStyle : successMessageStyle),
            }}
          >
            {mensagem}
          </div>
        )}

        <section style={loginCardStyle}>
          <div style={cardTopStyle}>
            <div>
              <p style={cardMiniTitleStyle}>Senha</p>
              <h2 style={cardTitleStyle}>Defina sua nova senha</h2>
            </div>

            <div style={sidePillStyle}>Seguro</div>
          </div>

          {!token ? (
            <div style={formStyle}>
              <div style={infoBoxStyle}>
                Link inválido ou ausente. Solicite uma nova redefinição de senha.
              </div>

              <div style={helperRowStyle}>
                <Link href="/reset-senha" style={helperLinkStyle}>
                  Solicitar novo link
                </Link>

                <Link href="/login" style={helperLinkStyle}>
                  Voltar para login
                </Link>
              </div>
            </div>
          ) : (
            <div style={formStyle}>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Nova senha</label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite a nova senha"
                  style={inputStyle}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Confirmar nova senha</label>
                <input
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Confirme a nova senha"
                  style={inputStyle}
                />
              </div>

              <div style={helperRowStyle}>
                <Link href="/login" style={helperLinkStyle}>
                  Voltar para login
                </Link>

                <Link href="/reset-senha" style={helperLinkStyle}>
                  Solicitar novo link
                </Link>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handleRedefinirSenha}
                style={{
                  ...loginButtonStyle,
                  opacity: loading ? 0.78 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Atualizando..." : "Redefinir senha"}
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function NovaSenhaPage() {
  return (
    <Suspense
      fallback={
        <main style={pageStyle}>
          <div style={containerStyle}>
            <section style={heroCardStyle}>
              <div style={badgeStyle}>MVP_ Automação Fiscal</div>
              <h1 style={heroTitleStyle}>Nova senha</h1>
            </section>

            <section style={loginCardStyle}>
              <div style={infoBoxStyle}>Carregando recuperação de senha...</div>
            </section>
          </div>
        </main>
      }
    >
      <NovaSenhaContent />
    </Suspense>
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

const messageStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: "16px",
  marginBottom: "16px",
  fontSize: "14px",
  border: "1px solid transparent",
};

const errorMessageStyle: React.CSSProperties = {
  background: "rgba(239,68,68,0.12)",
  border: "1px solid rgba(239,68,68,0.22)",
  color: "#fecaca",
};

const successMessageStyle: React.CSSProperties = {
  background: "rgba(16,185,129,0.12)",
  border: "1px solid rgba(16,185,129,0.22)",
  color: "#bbf7d0",
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

const infoBoxStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: "16px",
  fontSize: "14px",
  border: "1px solid rgba(59,130,246,0.16)",
  background: "rgba(15,23,42,0.92)",
  color: "#ffffff",
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