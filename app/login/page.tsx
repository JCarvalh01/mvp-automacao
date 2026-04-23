"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  clearAllSessions,
  getClientSession,
  saveClientSession,
} from "@/lib/session";

type Cliente = {
  id: number;
  name: string;
  email: string | null;
  cnpj?: string | null;
  phone?: string | null;
  address?: string | null;
  password?: string | null;
  emissor_password?: string | null;
  client_type?: string | null;
  mei_created_at?: string | null;
  is_active?: boolean | null;
  partner_company_id?: number | null;
  user_id?: number | null;
  plan_type?: string | null;
  notes_limit?: number | null;
  is_blocked?: boolean | null;
  subscription_status?: string | null;
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [verificandoSessao, setVerificandoSessao] = useState(true);

  useEffect(() => {
    try {
      const client = getClientSession();

      if (client?.id && client.is_active) {
        router.replace("/dashboard-cliente");
        return;
      }

      setVerificandoSessao(false);
    } catch (error) {
      console.log("Erro ao validar sessão existente:", error);
      clearAllSessions();
      setVerificandoSessao(false);
    }
  }, [router]);

  async function fazerLogin(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      setMensagem("");

      const emailNormalizado = email.trim().toLowerCase();
      const senhaNormalizada = password.trim();

      if (!emailNormalizado) {
        setMensagem("Informe seu email.");
        return;
      }

      if (!senhaNormalizada) {
        setMensagem("Informe sua senha.");
        return;
      }

      clearAllSessions();

      const { data: clienteData, error: clienteError } = await supabase
        .from("clients")
        .select("*")
        .ilike("email", emailNormalizado)
        .maybeSingle();

      if (clienteError) {
        console.log("Erro ao buscar cliente:", clienteError);
        setMensagem("Erro ao validar acesso.");
        return;
      }

      if (!clienteData) {
        setMensagem("Email ou senha inválidos.");
        return;
      }

      const cliente = clienteData as Cliente;

      if (String(cliente.password || "").trim() !== senhaNormalizada) {
        setMensagem("Email ou senha inválidos.");
        return;
      }

      if (cliente.is_active === false) {
        setMensagem("Seu cadastro está inativo.");
        return;
      }

      saveClientSession({
        id: cliente.id,
        name: cliente.name || "Cliente",
        email: cliente.email || emailNormalizado,
        cnpj: cliente.cnpj || "",
        phone: cliente.phone || "",
        address: cliente.address || "",
        password: cliente.password || null,
        emissor_password: cliente.emissor_password || null,
        client_type: cliente.client_type || null,
        mei_created_at: cliente.mei_created_at || null,
        is_active: cliente.is_active ?? true,
        partner_company_id: cliente.partner_company_id ?? null,
        user_id: cliente.user_id ?? null,
        plan_type: cliente.plan_type ?? null,
        notes_limit: cliente.notes_limit ?? null,
        is_blocked: cliente.is_blocked ?? null,
        subscription_status: cliente.subscription_status ?? null,
      });

      router.replace("/dashboard-cliente");
    } catch (error) {
      console.log("Erro inesperado no login:", error);
      clearAllSessions();
      setMensagem("Erro inesperado ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  if (verificandoSessao) {
    return (
      <main style={pageStyle}>
        <div style={glowTopStyle} />
        <div style={glowBottomStyle} />

        <div style={containerStyle}>
          <section style={heroCardStyle}>
            <div style={badgeStyle}>MVP_ Automação Fiscal</div>
            <h1 style={heroTitleStyle}>Entrar na plataforma</h1>
            <p style={heroDescriptionStyle}>Verificando acesso...</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={glowTopStyle} />
      <div style={glowBottomStyle} />

      <div style={containerStyle}>
        <section style={heroCardStyle}>
          <div style={badgeStyle}>MVP_ Automação Fiscal</div>

          <h1 style={heroTitleStyle}>Entrar na plataforma</h1>

          <div style={heroInfoRowStyle}>
            <div style={heroInfoCardStyle}>
              <span style={heroInfoLabelStyle}>Acesso</span>
              <strong style={heroInfoValueStyle}>Cliente</strong>
            </div>

            <div style={heroInfoCardStyle}>
              <span style={heroInfoLabelStyle}>Ambiente</span>
              <strong style={heroInfoValueStyle}>Centralizado</strong>
            </div>
          </div>
        </section>

        {mensagem && (
          <div
            style={{
              ...messageStyle,
              ...(mensagem.toLowerCase().includes("inválid") ||
              mensagem.toLowerCase().includes("erro") ||
              mensagem.toLowerCase().includes("inativ") ||
              mensagem.toLowerCase().includes("não encontrado")
                ? errorMessageStyle
                : successMessageStyle),
            }}
          >
            {mensagem}
          </div>
        )}

        <section style={loginCardStyle}>
          <div style={cardTopStyle}>
            <div>
              <p style={cardMiniTitleStyle}>Login</p>
              <h2 style={cardTitleStyle}>Acesse sua conta</h2>
            </div>

            <div style={sidePillStyle}>Online</div>
          </div>

          <form onSubmit={fazerLogin} style={formStyle}>
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
              <label style={labelStyle}>Senha</label>

              <div style={passwordWrapperStyle}>
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
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

            <div style={helperRowStyle}>
              <Link href="/cadastro-cliente" style={helperLinkStyle}>
                Criar conta
              </Link>

              <Link href="/reset-senha" style={helperLinkStyle}>
                Esqueci minha senha
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...loginButtonStyle,
                opacity: loading ? 0.78 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Entrando..." : "Entrar"}
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

const heroDescriptionStyle: React.CSSProperties = {
  margin: "10px 0 0 0",
  fontSize: "14px",
  color: "#cbd5e1",
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