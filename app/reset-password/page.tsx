"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<"sucesso" | "erro" | "">("");
  const [loading, setLoading] = useState(false);

  async function handleUpdate() {
    setMensagem("");
    setTipoMensagem("");

    if (!senha.trim()) {
      setMensagem("Informe a nova senha.");
      setTipoMensagem("erro");
      return;
    }

    if (senha.length < 6) {
      setMensagem("A senha deve ter pelo menos 6 caracteres.");
      setTipoMensagem("erro");
      return;
    }

    if (senha !== confirmarSenha) {
      setMensagem("A confirmação de senha não confere.");
      setTipoMensagem("erro");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password: senha,
      });

      if (error) throw error;

      setMensagem("Senha atualizada com sucesso. Agora você já pode acessar o sistema.");
      setTipoMensagem("sucesso");
      setSenha("");
      setConfirmarSenha("");
    } catch (error: any) {
      setMensagem(error?.message || "Erro ao atualizar senha.");
      setTipoMensagem("erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <div style={topBarStyle}>
          <div>
            <span style={brandMiniStyle}>MVP Automação Fiscal</span>
            <h1 style={titleStyle}>Redefinir senha</h1>
            <p style={subtitleStyle}>
              Crie uma nova senha para voltar a acessar sua conta com segurança.
            </p>
          </div>

          <div style={topActionsStyle}>
            <Link href="/" style={secondaryLinkStyle}>
              Voltar ao site
            </Link>
          </div>
        </div>

        <section style={heroCardStyle}>
          <div>
            <span style={heroTagStyle}>Acesso e segurança</span>
            <h2 style={heroTitleStyle}>Nova senha de acesso</h2>
            <p style={heroTextStyle}>
              Escolha uma senha segura para concluir a redefinição da sua conta.
            </p>
          </div>

          <div style={heroInfoBoxStyle}>
            <span style={heroInfoLabelStyle}>Etapa</span>
            <strong style={heroInfoValueStyle}>Atualização de senha</strong>
          </div>
        </section>

        <section style={formCardStyle}>
          <div style={sectionHeaderStyle}>
            <h3 style={sectionTitleStyle}>Defina sua nova senha</h3>
            <p style={sectionTextStyle}>
              Informe a nova senha e confirme para concluir a alteração.
            </p>
          </div>

          <div style={gridStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Nova senha</label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite a nova senha"
                style={inputStyle}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Confirmar senha</label>
              <input
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Confirme a nova senha"
                style={inputStyle}
              />
            </div>
          </div>

          {mensagem && (
            <div
              style={
                tipoMensagem === "erro" ? errorMessageStyle : successMessageStyle
              }
            >
              {mensagem}
            </div>
          )}

          <div style={actionsStyle}>
            <button
              onClick={handleUpdate}
              disabled={loading}
              style={loading ? disabledButtonStyle : primaryButtonStyle}
            >
              {loading ? "Atualizando senha..." : "Atualizar senha"}
            </button>
          </div>
        </section>
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
  maxWidth: "980px",
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

const topActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
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
  maxWidth: "760px",
};

const secondaryLinkStyle: React.CSSProperties = {
  textDecoration: "none",
  backgroundColor: "#ffffff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: "12px",
  padding: "12px 16px",
  fontSize: "14px",
  fontWeight: 700,
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

const formCardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "24px",
  padding: "28px",
  boxShadow: "0 14px 38px rgba(15, 23, 42, 0.06)",
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
  lineHeight: 1.5,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "18px",
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const labelStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#334155",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "50px",
  borderRadius: "14px",
  border: "1px solid #cbd5e1",
  padding: "0 14px",
  fontSize: "14px",
  backgroundColor: "#ffffff",
  outline: "none",
  color: "#0f172a",
  boxSizing: "border-box",
};

const actionsStyle: React.CSSProperties = {
  marginTop: "24px",
};

const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  height: "52px",
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: "#fff",
  border: "none",
  borderRadius: "14px",
  fontSize: "15px",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(37, 99, 235, 0.22)",
};

const disabledButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  opacity: 0.7,
  cursor: "not-allowed",
};

const successMessageStyle: React.CSSProperties = {
  marginTop: "18px",
  backgroundColor: "#ecfdf5",
  border: "1px solid #a7f3d0",
  color: "#065f46",
  borderRadius: "14px",
  padding: "12px 14px",
  fontSize: "14px",
};

const errorMessageStyle: React.CSSProperties = {
  marginTop: "18px",
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  borderRadius: "14px",
  padding: "12px 14px",
  fontSize: "14px",
};