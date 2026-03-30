"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Usuario = {
  id: number;
  name: string;
  email: string;
  password: string;
  user_type: string;
  is_active: boolean;
};

export default function ResetSenhaPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");

  async function redefinirSenha(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      setMensagem("");

      const emailNormalizado = email.trim().toLowerCase();

      if (!emailNormalizado) {
        setMensagem("Informe seu email.");
        setLoading(false);
        return;
      }

      if (!novaSenha.trim()) {
        setMensagem("Informe a nova senha.");
        setLoading(false);
        return;
      }

      if (novaSenha.trim().length < 6) {
        setMensagem("A nova senha precisa ter pelo menos 6 caracteres.");
        setLoading(false);
        return;
      }

      if (novaSenha !== confirmarSenha) {
        setMensagem("As senhas não coincidem.");
        setLoading(false);
        return;
      }

      const { data: usuario, error: usuarioError } = await supabase
        .from("users")
        .select("*")
        .eq("email", emailNormalizado)
        .single<Usuario>();

      if (usuarioError || !usuario) {
        console.log("Erro ao buscar usuário:", usuarioError);
        setMensagem("Nenhuma conta foi encontrada com este email.");
        setLoading(false);
        return;
      }

      if (!usuario.is_active) {
        setMensagem("Esta conta está inativa.");
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({
          password: novaSenha.trim(),
        })
        .eq("id", usuario.id);

      if (updateError) {
        console.log("Erro ao atualizar senha:", updateError);
        setMensagem(updateError.message || "Erro ao redefinir senha.");
        setLoading(false);
        return;
      }

      setMensagem("Senha redefinida com sucesso.");

      setTimeout(() => {
        router.push("/login");
      }, 900);
    } catch (error) {
      console.log("Erro inesperado ao redefinir senha:", error);
      setMensagem("Erro inesperado ao redefinir senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={pageStyle}>
      <div style={glowTopStyle} />
      <div style={glowBottomStyle} />

      <div style={containerStyle}>
        <section style={heroCardStyle}>
          <div style={badgeStyle}>MVP_ Automação Fiscal</div>
          <h1 style={heroTitleStyle}>Redefinir senha</h1>

          <div style={heroInfoRowStyle}>
            <div style={heroInfoCardStyle}>
              <span style={heroInfoLabelStyle}>Acesso</span>
              <strong style={heroInfoValueStyle}>Recuperação simplificada</strong>
            </div>

            <div style={heroInfoCardStyle}>
              <span style={heroInfoLabelStyle}>Fluxo</span>
              <strong style={heroInfoValueStyle}>Volta rápida ao sistema</strong>
            </div>
          </div>
        </section>

        {mensagem && (
          <div
            style={{
              ...messageStyle,
              ...(mensagem.toLowerCase().includes("sucesso")
                ? successMessageStyle
                : errorMessageStyle),
            }}
          >
            {mensagem}
          </div>
        )}

        <section style={formCardStyle}>
          <div style={cardTopStyle}>
            <div>
              <p style={cardMiniTitleStyle}>Senha</p>
              <h2 style={cardTitleStyle}>Atualize seu acesso</h2>
            </div>

            <div style={sidePillStyle}>Seguro</div>
          </div>

          <form onSubmit={redefinirSenha} style={formStyle}>
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

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Nova senha</label>
              <div style={passwordWrapperStyle}>
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Digite sua nova senha"
                  style={passwordInputStyle}
                />

                <button
                  type="button"
                  onClick={() => setMostrarSenha((valor) => !valor)}
                  style={showPasswordButtonStyle}
                >
                  {mostrarSenha ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Confirmar nova senha</label>
              <div style={passwordWrapperStyle}>
                <input
                  type={mostrarConfirmacao ? "text" : "password"}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita sua nova senha"
                  style={passwordInputStyle}
                />

                <button
                  type="button"
                  onClick={() => setMostrarConfirmacao((valor) => !valor)}
                  style={showPasswordButtonStyle}
                >
                  {mostrarConfirmacao ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>

            <div style={helperRowStyle}>
              <Link href="/login" style={helperLinkStyle}>
                Voltar para login
              </Link>

              <Link href="/cadastro-cliente" style={helperLinkStyle}>
                Criar conta
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...primaryButtonStyle,
                opacity: loading ? 0.78 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Salvando..." : "Redefinir senha"}
            </button>
          </form>
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

const glowTopStyle: React.CSSProperties = {
  position: "absolute",
  top: "-120px",
  left: "-100px",
  width: "320px",
  height: "320px",
  borderRadius: "50%",
  background: "rgba(59,130,246,0.18)",
  filter: "blur(95px)",
  pointerEvents: "none",
};

const glowBottomStyle: React.CSSProperties = {
  position: "absolute",
  right: "-120px",
  bottom: "-140px",
  width: "340px",
  height: "340px",
  borderRadius: "50%",
  background: "rgba(29,78,216,0.18)",
  filter: "blur(100px)",
  pointerEvents: "none",
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

const formCardStyle: React.CSSProperties = {
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

const passwordWrapperStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  borderRadius: "16px",
  overflow: "hidden",
  border: "1px solid rgba(59,130,246,0.16)",
  background: "rgba(15,23,42,0.92)",
};

const passwordInputStyle: React.CSSProperties = {
  flex: 1,
  padding: "15px 16px",
  border: "none",
  background: "transparent",
  color: "#ffffff",
  fontSize: "14px",
  outline: "none",
};

const showPasswordButtonStyle: React.CSSProperties = {
  padding: "0 16px",
  border: "none",
  background: "rgba(37,99,235,0.16)",
  color: "#dbeafe",
  fontWeight: 700,
  cursor: "pointer",
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

const primaryButtonStyle: React.CSSProperties = {
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