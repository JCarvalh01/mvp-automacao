"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  clearAllSessions,
  getClientSession,
  getPartnerCompanySession,
  getUserSession,
  saveClientSession,
  savePartnerCompanySession,
  saveUserSession,
} from "@/lib/session";

type Usuario = {
  id: number;
  name: string;
  email: string;
  password: string;
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
  email: string | null;
  user_id?: number | null;
  is_active?: boolean | null;
  cnpj?: string | null;
  phone?: string | null;
  address?: string | null;
  password?: string | null;
  client_type?: string | null;
  mei_created_at?: string | null;
  partner_company_id?: number | null;
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    try {
      const user = getUserSession();
      const client = getClientSession();
      const empresa = getPartnerCompanySession();

      if (user?.is_active) {
        if (user.user_type === "admin") {
          router.replace("/admin");
          return;
        }

        if (user.user_type === "partner_company" && empresa) {
          router.replace("/dashboard-empresa");
          return;
        }

        if (user.user_type === "client" && client) {
          router.replace("/area-cliente");
          return;
        }
      }

      if ((!user && empresa) || (!user && client)) {
        clearAllSessions();
      }
    } catch (error) {
      console.log("Erro ao validar sessão existente:", error);
      clearAllSessions();
    }
  }, [router]);

  async function criarEmpresaAutomaticaParaUsuario(usuario: Usuario) {
    const nomeBase = usuario.name?.trim() || "Empresa";
    const emailBase = usuario.email?.trim().toLowerCase() || "";
    const telefoneBase = "";
    const enderecoBase = "";
    const cnpjBase = "";

    const { data: empresaCriada, error: createError } = await supabase
      .from("partner_companies")
      .insert({
        name: nomeBase,
        cnpj: cnpjBase,
        email: emailBase,
        phone: telefoneBase,
        address: enderecoBase,
        user_id: usuario.id,
      })
      .select("*")
      .single();

    if (createError || !empresaCriada) {
      console.log("Erro ao criar empresa automática:", createError);
      return null;
    }

    return empresaCriada as Empresa;
  }

  async function buscarOuCriarEmpresaDoUsuario(usuario: Usuario) {
    const { data: empresas, error: empresaError } = await supabase
      .from("partner_companies")
      .select("*")
      .eq("user_id", usuario.id);

    console.log("Resultado partner_companies:", {
      usuarioId: usuario.id,
      empresas,
      empresaError,
    });

    if (empresaError) {
      return {
        empresa: null,
        erro: `Erro ao buscar empresa: ${empresaError.message}`,
      };
    }

    if (empresas && empresas.length === 1) {
      return {
        empresa: empresas[0] as Empresa,
        erro: "",
      };
    }

    if (empresas && empresas.length > 1) {
      return {
        empresa: null,
        erro: "Mais de uma empresa vinculada a este usuário.",
      };
    }

    const empresaCriada = await criarEmpresaAutomaticaParaUsuario(usuario);

    if (!empresaCriada) {
      return {
        empresa: null,
        erro: "Empresa vinculada não encontrada e não foi possível criar automaticamente.",
      };
    }

    return {
      empresa: empresaCriada,
      erro: "",
    };
  }

  async function buscarClienteDoUsuario(usuario: Usuario) {
    const emailNormalizado = (usuario.email || "").trim().toLowerCase();

    const { data: clientesPorUserId, error: clientePorUserIdError } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", usuario.id);

    console.log("Resultado clients por user_id:", {
      usuarioId: usuario.id,
      clientesPorUserId,
      clientePorUserIdError,
    });

    if (clientePorUserIdError) {
      return {
        cliente: null,
        erro: `Erro ao buscar cliente por vínculo do usuário: ${clientePorUserIdError.message}`,
      };
    }

    if (clientesPorUserId && clientesPorUserId.length === 1) {
      return {
        cliente: clientesPorUserId[0] as Cliente,
        erro: "",
      };
    }

    if (clientesPorUserId && clientesPorUserId.length > 1) {
      return {
        cliente: null,
        erro: "Mais de um cliente vinculado a este usuário.",
      };
    }

    const { data: clientesPorEmail, error: clientePorEmailError } = await supabase
      .from("clients")
      .select("*")
      .ilike("email", emailNormalizado);

    console.log("Resultado clients por email:", {
      email: emailNormalizado,
      clientesPorEmail,
      clientePorEmailError,
    });

    if (clientePorEmailError) {
      return {
        cliente: null,
        erro: `Erro ao buscar cliente por email: ${clientePorEmailError.message}`,
      };
    }

    if (!clientesPorEmail || clientesPorEmail.length === 0) {
      return {
        cliente: null,
        erro: "Cliente vinculado não encontrado.",
      };
    }

    if (clientesPorEmail.length > 1) {
      return {
        cliente: null,
        erro: "Mais de um cliente encontrado com este email.",
      };
    }

    return {
      cliente: clientesPorEmail[0] as Cliente,
      erro: "",
    };
  }

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

      const { data: usuarios, error: usuarioError } = await supabase
        .from("users")
        .select("*")
        .ilike("email", emailNormalizado)
        .eq("password", senhaNormalizada);

      const usuario =
        !usuarioError && usuarios && usuarios.length === 1
          ? (usuarios[0] as Usuario)
          : null;

      if (usuario && !usuarioError) {
        if (!usuario.is_active) {
          setMensagem("Seu acesso está inativo.");
          return;
        }

        const tipoUsuarioNormalizado =
          usuario.user_type === "empresa"
            ? "partner_company"
            : usuario.user_type === "cliente"
            ? "client"
            : usuario.user_type === "partner"
            ? "partner_company"
            : usuario.user_type;

        const userSession = {
          id: usuario.id,
          name: usuario.name,
          email: usuario.email,
          user_type: tipoUsuarioNormalizado,
          is_active: usuario.is_active,
        };

        saveUserSession(userSession);

        if (tipoUsuarioNormalizado === "admin") {
          router.replace("/admin");
          return;
        }

        if (tipoUsuarioNormalizado === "partner_company") {
          const resultadoEmpresa = await buscarOuCriarEmpresaDoUsuario(usuario);

          if (!resultadoEmpresa.empresa) {
            clearAllSessions();
            setMensagem(resultadoEmpresa.erro || "Empresa vinculada não encontrada.");
            return;
          }

          const empresa = resultadoEmpresa.empresa;

          savePartnerCompanySession({
            id: empresa.id,
            name: empresa.name,
            cnpj: empresa.cnpj,
            email: empresa.email,
            phone: empresa.phone,
            address: empresa.address,
            user_id: empresa.user_id,
          });

          router.replace("/dashboard-empresa");
          return;
        }

        if (tipoUsuarioNormalizado === "client") {
          const resultadoCliente = await buscarClienteDoUsuario(usuario);

          if (!resultadoCliente.cliente) {
            clearAllSessions();
            setMensagem(resultadoCliente.erro || "Cliente vinculado não encontrado.");
            return;
          }

          const cliente = resultadoCliente.cliente;

          if (cliente.is_active === false) {
            clearAllSessions();
            setMensagem("Seu cadastro está inativo.");
            return;
          }

          saveClientSession({
            id: cliente.id,
            name: cliente.name || usuario.name,
            email: cliente.email || usuario.email || "",
            cnpj: cliente.cnpj || "",
            phone: cliente.phone || "",
            address: cliente.address || "",
            password: cliente.password || null,
            client_type: cliente.client_type || undefined,
            mei_created_at: cliente.mei_created_at || null,
            is_active: cliente.is_active ?? true,
            partner_company_id: cliente.partner_company_id ?? null,
          });

          router.replace("/area-cliente");
          return;
        }

        clearAllSessions();
        setMensagem("Tipo de usuário inválido.");
        return;
      }

      if (usuarioError) {
        console.log("Erro ao buscar usuário:", usuarioError);
      }

      if (usuarios && usuarios.length > 1) {
        setMensagem("Mais de um usuário encontrado com este login.");
        return;
      }

      const { data: clientesDiretos, error: clienteDiretoError } = await supabase
        .from("clients")
        .select("*")
        .ilike("email", emailNormalizado)
        .eq("password", senhaNormalizada);

      console.log("Fallback clients:", {
        email: emailNormalizado,
        clientesDiretos,
        clienteDiretoError,
      });

      if (clienteDiretoError) {
        setMensagem(`Erro ao validar cliente: ${clienteDiretoError.message}`);
        return;
      }

      if (!clientesDiretos || clientesDiretos.length === 0) {
        setMensagem("Email ou senha inválidos.");
        return;
      }

      if (clientesDiretos.length > 1) {
        setMensagem("Mais de um cliente encontrado com este login.");
        return;
      }

      const clienteDireto = clientesDiretos[0] as Cliente;

      if (clienteDireto.is_active === false) {
        setMensagem("Seu cadastro está inativo.");
        return;
      }

      saveUserSession({
        id: clienteDireto.user_id ?? clienteDireto.id,
        name: clienteDireto.name,
        email: clienteDireto.email || emailNormalizado,
        user_type: "client",
        is_active: clienteDireto.is_active ?? true,
      });

      saveClientSession({
        id: clienteDireto.id,
        name: clienteDireto.name,
        email: clienteDireto.email || "",
        cnpj: clienteDireto.cnpj || "",
        phone: clienteDireto.phone || "",
        address: clienteDireto.address || "",
        password: clienteDireto.password || null,
        client_type: clienteDireto.client_type || undefined,
        mei_created_at: clienteDireto.mei_created_at || null,
        is_active: clienteDireto.is_active ?? true,
        partner_company_id: clienteDireto.partner_company_id ?? null,
      });

      router.replace("/area-cliente");
    } catch (error) {
      console.log("Erro inesperado no login:", error);
      clearAllSessions();
      setMensagem("Erro inesperado ao entrar.");
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

          <h1 style={heroTitleStyle}>Entrar na plataforma</h1>

          <div style={heroInfoRowStyle}>
            <div style={heroInfoCardStyle}>
              <span style={heroInfoLabelStyle}>Acesso</span>
              <strong style={heroInfoValueStyle}>Cliente e Empresa</strong>
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
              mensagem.toLowerCase().includes("não encontrado") ||
              mensagem.toLowerCase().includes("mais de uma")
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