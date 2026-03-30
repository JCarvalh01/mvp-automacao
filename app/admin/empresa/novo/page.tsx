"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import ProtectedPageLoader from "@/components/ProtectedPageLoader";

export default function NovaEmpresaPage() {
  const router = useRouter();
  const { loading: loadingAccess, authorized } = useProtectedRoute(["admin"]);

  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [senha, setSenha] = useState("");

  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");

  async function criarEmpresa(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      setMensagem("");

      const nomeLimpo = nome.trim();
      const cnpjLimpo = cnpj.trim();
      const emailLimpo = email.trim().toLowerCase();
      const telefoneLimpo = telefone.trim();
      const enderecoLimpo = endereco.trim();
      const senhaLimpa = senha.trim();

      if (!nomeLimpo || !emailLimpo || !senhaLimpa) {
        setMensagem("Preencha nome, email e senha.");
        setLoading(false);
        return;
      }

      const { data: usuarioExistente, error: buscaUsuarioError } = await supabase
        .from("users")
        .select("id")
        .eq("email", emailLimpo)
        .maybeSingle();

      if (buscaUsuarioError) {
        console.log("Erro ao validar email existente:", buscaUsuarioError);
        setMensagem("Erro ao validar email.");
        setLoading(false);
        return;
      }

      if (usuarioExistente) {
        setMensagem("Já existe um usuário com esse email.");
        setLoading(false);
        return;
      }

      const { data: usuario, error: userError } = await supabase
        .from("users")
        .insert([
          {
            name: nomeLimpo,
            email: emailLimpo,
            password: senhaLimpa,
            user_type: "partner_company",
            is_active: true,
          },
        ])
        .select()
        .single();

      if (userError || !usuario) {
        console.log("Erro ao criar usuário:", userError);
        setMensagem("Erro ao criar usuário da empresa.");
        setLoading(false);
        return;
      }

      const { error: empresaError } = await supabase
        .from("partner_companies")
        .insert([
          {
            name: nomeLimpo,
            cnpj: cnpjLimpo || null,
            email: emailLimpo,
            phone: telefoneLimpo || null,
            address: enderecoLimpo || null,
            user_id: usuario.id,
          },
        ]);

      if (empresaError) {
        console.log("Erro ao criar empresa:", empresaError);
        setMensagem("Usuário criado, mas houve erro ao criar a empresa.");
        setLoading(false);
        return;
      }

      setMensagem("Empresa criada com sucesso.");

      setNome("");
      setCnpj("");
      setEmail("");
      setTelefone("");
      setEndereco("");
      setSenha("");

      setTimeout(() => {
        router.push("/admin");
      }, 1000);
    } catch (error) {
      console.log("Erro inesperado ao criar empresa:", error);
      setMensagem("Erro inesperado ao criar empresa.");
    } finally {
      setLoading(false);
    }
  }

  function voltar() {
    router.push("/admin");
  }

  if (loadingAccess) {
    return <ProtectedPageLoader label="Validando acesso administrativo..." />;
  }

  if (!authorized) {
    return null;
  }

  return (
    <main style={pageStyle}>
      <div style={bgGlowOne} />
      <div style={bgGlowTwo} />

      <div style={containerStyle}>
        <section style={heroCardStyle}>
          <div style={heroHeaderStyle}>
            <div>
              <p style={heroMiniStyle}>MVP_ AUTOMAÇÃO FISCAL</p>
              <h1 style={heroTitleStyle}>Nova Empresa</h1>
              <p style={heroSubtitleStyle}>
                Cadastre uma nova empresa parceira e libere o acesso ao sistema.
              </p>
            </div>

            <div style={heroBadgeStyle}>Admin</div>
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
          <div style={sectionHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Cadastro da empresa</h2>
              <p style={sectionSubtitleStyle}>
                Preencha os dados principais para criar o acesso da empresa parceira.
              </p>
            </div>
          </div>

          <form onSubmit={criarEmpresa} style={formStyle}>
            <div style={gridStyle}>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Nome da empresa *</label>
                <input
                  placeholder="Digite o nome da empresa"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>CNPJ</label>
                <input
                  placeholder="Digite o CNPJ"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Email *</label>
                <input
                  type="email"
                  placeholder="Digite o email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Telefone</label>
                <input
                  placeholder="Digite o telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ ...fieldGroupStyle, gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Endereço</label>
                <input
                  placeholder="Digite o endereço"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Senha de acesso *</label>
                <input
                  type="password"
                  placeholder="Digite a senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={infoBoxStyle}>
              <p style={infoTextStyle}>
                Essa ação cria um usuário do tipo <strong>partner_company</strong> na tabela
                <strong> users</strong> e depois cria o registro correspondente em
                <strong> partner_companies</strong>.
              </p>
            </div>

            <div style={actionsStyle}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  ...primaryButtonStyle,
                  opacity: loading ? 0.75 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Criando..." : "Criar empresa"}
              </button>

              <button
                type="button"
                onClick={voltar}
                style={secondaryButtonStyle}
              >
                Cancelar
              </button>
            </div>
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
    "linear-gradient(135deg, #020617 0%, #081224 35%, #0f172a 65%, #071b34 100%)",
  padding: "32px 20px 48px",
  fontFamily: "Arial, sans-serif",
  color: "#f8fafc",
};

const bgGlowOne: React.CSSProperties = {
  position: "absolute",
  top: "-120px",
  left: "-80px",
  width: "320px",
  height: "320px",
  borderRadius: "50%",
  background: "rgba(37, 99, 235, 0.18)",
  filter: "blur(90px)",
  pointerEvents: "none",
};

const bgGlowTwo: React.CSSProperties = {
  position: "absolute",
  bottom: "-140px",
  right: "-80px",
  width: "340px",
  height: "340px",
  borderRadius: "50%",
  background: "rgba(59, 130, 246, 0.14)",
  filter: "blur(90px)",
  pointerEvents: "none",
};

const containerStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  maxWidth: "820px",
  margin: "0 auto",
};

const heroCardStyle: React.CSSProperties = {
  background: "rgba(2, 6, 23, 0.72)",
  border: "1px solid rgba(59, 130, 246, 0.18)",
  borderRadius: "28px",
  padding: "26px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.36)",
  backdropFilter: "blur(16px)",
  marginBottom: "18px",
};

const heroHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
};

const heroMiniStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "12px",
  letterSpacing: "0.18em",
  color: "#93c5fd",
  fontWeight: 700,
};

const heroTitleStyle: React.CSSProperties = {
  margin: "10px 0 10px 0",
  fontSize: "34px",
  fontWeight: 800,
  color: "#ffffff",
};

const heroSubtitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#cbd5e1",
  fontSize: "15px",
  lineHeight: 1.7,
};

const heroBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 14px",
  borderRadius: "999px",
  background: "rgba(59, 130, 246, 0.15)",
  border: "1px solid rgba(59, 130, 246, 0.24)",
  color: "#bfdbfe",
  fontSize: "13px",
  fontWeight: 700,
};

const formCardStyle: React.CSSProperties = {
  background: "rgba(2, 6, 23, 0.68)",
  border: "1px solid rgba(59, 130, 246, 0.14)",
  borderRadius: "28px",
  padding: "20px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.34)",
  backdropFilter: "blur(16px)",
};

const sectionHeaderStyle: React.CSSProperties = {
  marginBottom: "18px",
  paddingBottom: "14px",
  borderBottom: "1px solid rgba(148, 163, 184, 0.10)",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "22px",
  fontWeight: 800,
  color: "#ffffff",
};

const sectionSubtitleStyle: React.CSSProperties = {
  margin: "6px 0 0 0",
  fontSize: "14px",
  color: "#94a3b8",
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "18px",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "14px",
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
  background: "rgba(15, 23, 42, 0.92)",
  border: "1px solid rgba(59, 130, 246, 0.16)",
  borderRadius: "16px",
  color: "#ffffff",
  padding: "14px 15px",
  outline: "none",
  fontSize: "14px",
  boxSizing: "border-box",
};

const infoBoxStyle: React.CSSProperties = {
  backgroundColor: "rgba(15, 23, 42, 0.92)",
  border: "1px solid rgba(59, 130, 246, 0.12)",
  borderRadius: "16px",
  padding: "14px 16px",
};

const infoTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#cbd5e1",
  fontSize: "14px",
  lineHeight: 1.7,
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "14px 18px",
  borderRadius: "14px",
  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  color: "#ffffff",
  border: "none",
  fontWeight: 800,
  boxShadow: "0 12px 28px rgba(16,185,129,0.26)",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "14px 18px",
  borderRadius: "14px",
  backgroundColor: "rgba(15, 23, 42, 0.9)",
  color: "#ffffff",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  fontWeight: 700,
  cursor: "pointer",
};

const messageStyle: React.CSSProperties = {
  borderRadius: "18px",
  padding: "14px 16px",
  marginBottom: "16px",
  fontSize: "14px",
  border: "1px solid transparent",
};

const successMessageStyle: React.CSSProperties = {
  backgroundColor: "rgba(16, 185, 129, 0.12)",
  border: "1px solid rgba(16, 185, 129, 0.25)",
  color: "#bbf7d0",
};

const errorMessageStyle: React.CSSProperties = {
  backgroundColor: "rgba(239, 68, 68, 0.12)",
  border: "1px solid rgba(239, 68, 68, 0.25)",
  color: "#fecaca",
};