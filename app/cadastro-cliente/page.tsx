"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type NovoUsuario = {
  id: number;
};

type EmpresaParceira = {
  id: number;
  name: string;
  email?: string | null;
  plan?: string | null;
  is_blocked?: boolean | null;
  payment_status?: string | null;
};

export default function CadastroClientePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const empresaIdParam = searchParams.get("empresa_id");

  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isMei, setIsMei] = useState(true);
  const [meiCreatedAt, setMeiCreatedAt] = useState("");
  const [nationalEmitterPassword, setNationalEmitterPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingEmpresa, setLoadingEmpresa] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [empresaParceira, setEmpresaParceira] = useState<EmpresaParceira | null>(null);

  function limparCnpj(valor: string) {
    return valor.replace(/\D/g, "");
  }

  function formatarCnpjVisual(valor: string) {
    const numeros = valor.replace(/\D/g, "").slice(0, 14);

    return numeros
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  useEffect(() => {
    async function carregarEmpresaParceira() {
      if (!empresaIdParam) {
        setEmpresaParceira(null);
        return;
      }

      const empresaIdNumero = Number(empresaIdParam);

      if (!Number.isFinite(empresaIdNumero) || empresaIdNumero <= 0) {
        setMensagem("Link de cadastro da empresa inválido.");
        setEmpresaParceira(null);
        return;
      }

      try {
        setLoadingEmpresa(true);

        const { data, error } = await supabase
          .from("partner_companies")
          .select("id, name, email, plan, is_blocked, payment_status")
          .eq("id", empresaIdNumero)
          .single();

        if (error || !data) {
          console.log("Erro ao carregar empresa parceira:", error);
          setMensagem("Empresa parceira não encontrada para este cadastro.");
          setEmpresaParceira(null);
          return;
        }

        setEmpresaParceira(data as EmpresaParceira);
      } catch (error) {
        console.log("Erro inesperado ao carregar empresa parceira:", error);
        setMensagem("Erro ao validar empresa parceira.");
        setEmpresaParceira(null);
      } finally {
        setLoadingEmpresa(false);
      }
    }

    carregarEmpresaParceira();
  }, [empresaIdParam]);

  async function cadastrarCliente(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      setMensagem("");

      if (loadingEmpresa) {
        setMensagem("Aguarde a validação da empresa parceira.");
        setLoading(false);
        return;
      }

      const partnerCompanyId = empresaParceira?.id ?? null;

      if (empresaIdParam && !partnerCompanyId) {
        setMensagem("Não foi possível validar a empresa parceira deste cadastro.");
        setLoading(false);
        return;
      }

      if (!name.trim()) {
        setMensagem("Informe seu nome.");
        setLoading(false);
        return;
      }

      if (!email.trim()) {
        setMensagem("Informe seu email.");
        setLoading(false);
        return;
      }

      if (!password.trim()) {
        setMensagem("Informe sua senha.");
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setMensagem("A senha deve ter pelo menos 6 caracteres.");
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setMensagem("As senhas não coincidem.");
        setLoading(false);
        return;
      }

      const cnpjLimpo = limparCnpj(cnpj);

      if (cnpjLimpo && cnpjLimpo.length !== 14) {
        setMensagem("O CNPJ precisa ter 14 dígitos.");
        setLoading(false);
        return;
      }

      const emailNormalizado = email.trim().toLowerCase();

      const { data: usuarioExistente, error: usuarioExistenteError } =
        await supabase
          .from("users")
          .select("id")
          .eq("email", emailNormalizado)
          .maybeSingle();

      if (usuarioExistenteError) {
        console.log("Erro ao validar usuário existente:", usuarioExistenteError);
      }

      if (usuarioExistente) {
        setMensagem("Já existe uma conta cadastrada com este email.");
        setLoading(false);
        return;
      }

      if (cnpjLimpo) {
        const { data: clienteExistente, error: clienteExistenteError } =
          await supabase
            .from("clients")
            .select("id")
            .eq("cnpj", cnpjLimpo)
            .maybeSingle();

        if (clienteExistenteError) {
          console.log("Erro ao validar cliente existente:", clienteExistenteError);
        }

        if (clienteExistente) {
          setMensagem("Já existe um cliente cadastrado com este CNPJ.");
          setLoading(false);
          return;
        }
      }

      const { data: usuarioCriado, error: usuarioError } = await supabase
        .from("users")
        .insert({
          name: name.trim(),
          email: emailNormalizado,
          password: password.trim(),
          user_type: "client",
          is_active: true,
        })
        .select("id")
        .single();

      if (usuarioError || !usuarioCriado) {
        console.log("Erro ao criar usuário:", usuarioError);
        setMensagem(usuarioError?.message || "Erro ao criar usuário.");
        setLoading(false);
        return;
      }

      const novoUsuario = usuarioCriado as NovoUsuario;

      const payloadCliente = {
        name: name.trim(),
        cnpj: cnpjLimpo || null,
        email: emailNormalizado,
        phone: phone.trim() || null,
        address: address.trim() || null,
        is_mei: isMei,
        mei_created_at: meiCreatedAt || null,
        is_active: true,
        password: nationalEmitterPassword.trim() || null,
        user_id: novoUsuario.id,
        partner_company_id: partnerCompanyId,
        plan_type: null,
        notes_limit: partnerCompanyId ? null : 0,
        is_blocked: false,
      };

      const { data: clienteCriado, error: clienteError } = await supabase
        .from("clients")
        .insert(payloadCliente)
        .select("id")
        .single();

      if (clienteError || !clienteCriado) {
        console.log("Erro ao criar cliente:", clienteError);

        await supabase.from("users").delete().eq("id", novoUsuario.id);

        setMensagem(clienteError?.message || "Erro ao criar cadastro do cliente.");
        setLoading(false);
        return;
      }

      localStorage.setItem(
        "user",
        JSON.stringify({
          id: novoUsuario.id,
          name: name.trim(),
          email: emailNormalizado,
          user_type: "client",
        })
      );

      setMensagem("Cadastro realizado com sucesso! Escolha um plano para começar.");

      setTimeout(() => {
        router.push("/planos");
      }, 1500);
    } catch (error) {
      console.log("Erro inesperado ao cadastrar cliente:", error);
      setMensagem("Erro inesperado ao realizar cadastro.");
    } finally {
      setLoading(false);
    }
  }

  const cadastroVinculadoEmpresa = Boolean(empresaParceira);

  return (
    <main style={pageStyle}>
      <div style={bgGlowOne} />
      <div style={bgGlowTwo} />

      <div style={containerStyle}>
        <section style={heroCardStyle}>
          <div style={heroTopRowStyle}>
            <div>
              <p style={heroMiniStyle}>MVP_ AUTOMAÇÃO FISCAL</p>
              <h1 style={heroTitleStyle}>Cadastro do Cliente</h1>
              <p style={heroSubtitleStyle}>
                Crie sua conta e acesse sua área para acompanhar notas, arquivos
                e faturamento dentro da plataforma.
              </p>
            </div>

            <div style={heroBadgeStyle}>Acesso do Cliente</div>
          </div>

          {loadingEmpresa && (
            <div style={empresaInfoLoadingStyle}>
              Validando empresa parceira...
            </div>
          )}

          {!loadingEmpresa && cadastroVinculadoEmpresa && empresaParceira && (
            <div style={empresaInfoCardStyle}>
              <span style={empresaInfoLabelStyle}>Cadastro vinculado à empresa</span>
              <strong style={empresaInfoNameStyle}>{empresaParceira.name}</strong>
              <span style={empresaInfoTextStyle}>
                Este cliente será vinculado automaticamente à empresa parceira.
              </span>
            </div>
          )}
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
          <form onSubmit={cadastrarCliente} style={formStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <h2 style={sectionTitleStyle}>Dados do cadastro</h2>
                <p style={sectionSubtitleStyle}>
                  Preencha suas informações para criar sua conta na MVP.
                </p>
              </div>
            </div>

            <div style={gridStyle}>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Nome completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Digite seu nome"
                  style={inputStyle}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>CNPJ</label>
                <input
                  type="text"
                  value={formatarCnpjVisual(cnpj)}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  style={inputStyle}
                  maxLength={18}
                />
              </div>

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
                <label style={labelStyle}>Telefone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  style={inputStyle}
                />
              </div>

              <div style={{ ...fieldGroupStyle, gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Endereço</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Digite seu endereço"
                  style={inputStyle}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Senha de acesso</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Crie sua senha"
                  style={inputStyle}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Confirmar senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita sua senha"
                  style={inputStyle}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Data de abertura do MEI</label>
                <input
                  type="date"
                  value={meiCreatedAt}
                  onChange={(e) => setMeiCreatedAt(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Senha do Emissor Nacional</label>
                <input
                  type="password"
                  value={nationalEmitterPassword}
                  onChange={(e) => setNationalEmitterPassword(e.target.value)}
                  placeholder="Digite a senha do emissor"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={togglesRowStyle}>
              <div style={toggleCardStyle}>
                <span style={toggleLabelStyle}>Você é MEI?</span>
                <div style={toggleButtonsStyle}>
                  <button
                    type="button"
                    onClick={() => setIsMei(true)}
                    style={{
                      ...toggleButtonStyle,
                      ...(isMei ? toggleButtonActiveBlueStyle : {}),
                    }}
                  >
                    Sim
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsMei(false)}
                    style={{
                      ...toggleButtonStyle,
                      ...(!isMei ? toggleButtonActiveDarkStyle : {}),
                    }}
                  >
                    Não
                  </button>
                </div>
              </div>
            </div>

            <div style={actionsStyle}>
              <Link href="/login" style={secondaryButtonStyle}>
                Já tenho conta
              </Link>

              <button
                type="submit"
                disabled={loading || loadingEmpresa}
                style={{
                  ...saveButtonStyle,
                  opacity: loading || loadingEmpresa ? 0.75 : 1,
                  cursor: loading || loadingEmpresa ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Cadastrando..." : "Criar conta"}
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
  maxWidth: "1100px",
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

const heroTopRowStyle: React.CSSProperties = {
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
  maxWidth: "720px",
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

const empresaInfoCardStyle: React.CSSProperties = {
  marginTop: "18px",
  padding: "16px",
  borderRadius: "18px",
  background: "rgba(16, 185, 129, 0.10)",
  border: "1px solid rgba(16, 185, 129, 0.24)",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const empresaInfoLoadingStyle: React.CSSProperties = {
  marginTop: "18px",
  padding: "14px 16px",
  borderRadius: "18px",
  background: "rgba(59, 130, 246, 0.10)",
  border: "1px solid rgba(59, 130, 246, 0.24)",
  color: "#bfdbfe",
  fontSize: "14px",
  fontWeight: 700,
};

const empresaInfoLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: "#a7f3d0",
  fontWeight: 700,
};

const empresaInfoNameStyle: React.CSSProperties = {
  fontSize: "18px",
  color: "#ffffff",
  fontWeight: 800,
};

const empresaInfoTextStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#d1fae5",
  lineHeight: 1.6,
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

const formCardStyle: React.CSSProperties = {
  background: "rgba(2, 6, 23, 0.68)",
  border: "1px solid rgba(59, 130, 246, 0.14)",
  borderRadius: "28px",
  padding: "20px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.34)",
  backdropFilter: "blur(16px)",
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "18px",
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
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

const togglesRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "14px",
};

const toggleCardStyle: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.92)",
  border: "1px solid rgba(59, 130, 246, 0.12)",
  borderRadius: "18px",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const toggleLabelStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#ffffff",
  fontWeight: 700,
};

const toggleButtonsStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const toggleButtonStyle: React.CSSProperties = {
  padding: "11px 14px",
  borderRadius: "12px",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  background: "rgba(2, 6, 23, 0.8)",
  color: "#cbd5e1",
  fontWeight: 700,
  cursor: "pointer",
};

const toggleButtonActiveBlueStyle: React.CSSProperties = {
  background: "rgba(37, 99, 235, 0.18)",
  color: "#dbeafe",
  border: "1px solid rgba(59, 130, 246, 0.35)",
};

const toggleButtonActiveDarkStyle: React.CSSProperties = {
  background: "rgba(71, 85, 105, 0.22)",
  color: "#ffffff",
  border: "1px solid rgba(148, 163, 184, 0.28)",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "4px",
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "13px 16px",
  borderRadius: "14px",
  background:
    "linear-gradient(135deg, rgba(37,99,235,0.20) 0%, rgba(59,130,246,0.16) 100%)",
  border: "1px solid rgba(59, 130, 246, 0.28)",
  color: "#ffffff",
  fontWeight: 700,
};

const saveButtonStyle: React.CSSProperties = {
  padding: "13px 18px",
  borderRadius: "14px",
  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  color: "#ffffff",
  border: "none",
  fontWeight: 800,
  boxShadow: "0 12px 28px rgba(16,185,129,0.26)",
};