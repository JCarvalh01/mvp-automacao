"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import ProtectedPageLoader from "@/components/ProtectedPageLoader";
import { getPartnerCompanySession } from "@/lib/session";
import EmpresaPageShell from "@/components/EmpresaPageShell";

function limparDocumento(valor: string) {
  return valor.replace(/\D/g, "");
}

function formatarCnpjVisual(valor: string) {
  const numeros = limparDocumento(valor).slice(0, 14);

  return numeros
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatarTelefoneVisual(valor: string) {
  const digits = valor.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export default function NovoClientePage() {
  const router = useRouter();
  const { isLoading: loadingAccess, isAuthorized: authorized } = useProtectedRoute();

  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isMei, setIsMei] = useState(true);
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<"sucesso" | "erro" | "">("");

  async function salvarCliente(e: React.FormEvent) {
    e.preventDefault();

    if (loading) return;

    try {
      setLoading(true);
      setMensagem("");
      setTipoMensagem("");

      const empresaSessao = getPartnerCompanySession();

      if (!empresaSessao?.id) {
        setMensagem("Empresa não encontrada na sessão.");
        setTipoMensagem("erro");
        return;
      }

      const nomeFinal = name.trim();
      const cnpjFinal = limparDocumento(cnpj);
      const emailFinal = email.trim();
      const phoneFinal = limparDocumento(phone);
      const addressFinal = address.trim();
      const passwordFinal = password.trim();

      if (!nomeFinal) {
        setMensagem("Informe o nome do cliente.");
        setTipoMensagem("erro");
        return;
      }

      if (!cnpjFinal || cnpjFinal.length !== 14) {
        setMensagem("Informe um CNPJ válido com 14 dígitos.");
        setTipoMensagem("erro");
        return;
      }

      if (!passwordFinal) {
        setMensagem("Informe a senha do Emissor Nacional.");
        setTipoMensagem("erro");
        return;
      }

      if (phoneFinal && phoneFinal.length < 10) {
        setMensagem("Informe um telefone válido.");
        setTipoMensagem("erro");
        return;
      }

      const payload = {
        name: nomeFinal,
        cnpj: cnpjFinal,
        email: emailFinal || null,
        phone: phoneFinal || null,
        address: addressFinal || null,
        password: passwordFinal,
        client_type: isMei ? "mei" : "outro",
        is_mei: isMei,
        is_active: true,
        partner_company_id: empresaSessao.id,
      };

      const { data, error } = await supabase
        .from("clients")
        .insert([payload])
        .select("id")
        .single();

      if (error) {
        console.log("Erro ao cadastrar cliente:", error);
        setMensagem(error.message || "Erro ao cadastrar cliente.");
        setTipoMensagem("erro");
        return;
      }

      setMensagem("Cliente cadastrado com sucesso.");
      setTipoMensagem("sucesso");

      setTimeout(() => {
        router.push(`/clientes/${data.id}/painel`);
      }, 700);
    } catch (error) {
      console.log("Erro inesperado:", error);
      setMensagem("Erro inesperado ao cadastrar cliente.");
      setTipoMensagem("erro");
    } finally {
      setLoading(false);
    }
  }

  if (loadingAccess) {
    return <ProtectedPageLoader label="Validando acesso da empresa..." />;
  }

  if (!authorized) {
    return null;
  }

  return (
    <EmpresaPageShell
      title="Novo Cliente"
      subtitle="Cadastre um novo cliente dentro da carteira da empresa, mantendo o fluxo centralizado e o padrão visual da MVP."
    >
      <div style={pageWrapStyle}>
        <div style={backgroundGlowTopStyle} />
        <div style={backgroundGlowBottomStyle} />

        <div style={containerStyle}>
          <section style={heroCardStyle}>
            <div style={heroTopRowStyle}>
              <div style={heroLeftStyle}>
                <p style={heroMiniStyle}>MVP_ AUTOMAÇÃO FISCAL</p>
                <h1 style={heroTitleStyle}>Novo Cliente</h1>
                <p style={heroSubtitleStyle}>
                  Cadastre um novo cliente dentro da carteira da empresa, mantendo o fluxo
                  centralizado e o padrão visual da MVP.
                </p>
              </div>

              <div style={heroSideBoxStyle}>
                <span style={heroInfoLabelStyle}>Empresa logada</span>
                <strong style={heroInfoValueStyle}>
                  {getPartnerCompanySession()?.name || "Empresa"}
                </strong>
              </div>
            </div>
          </section>

          {mensagem && (
            <div
              style={{
                ...messageStyle,
                ...(tipoMensagem === "sucesso"
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
                <h2 style={sectionTitleStyle}>Dados do cliente</h2>
                <p style={sectionSubtitleStyle}>
                  Preencha as informações principais antes de salvar.
                </p>
              </div>
            </div>

            <form onSubmit={salvarCliente} style={formStyle}>
              <div style={gridStyle}>
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Nome do cliente</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Digite o nome do cliente"
                    style={inputStyle}
                    disabled={loading}
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
                    disabled={loading}
                  />
                </div>

                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cliente@email.com"
                    style={inputStyle}
                    disabled={loading}
                  />
                </div>

                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Telefone</label>
                  <input
                    type="text"
                    value={formatarTelefoneVisual(phone)}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    style={inputStyle}
                    maxLength={15}
                    disabled={loading}
                  />
                </div>

                <div style={{ ...fieldGroupStyle, gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Endereço</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Digite o endereço do cliente"
                    style={inputStyle}
                    disabled={loading}
                  />
                </div>

                <div style={{ ...fieldGroupStyle, gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Senha do Emissor Nacional</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Informe a senha de acesso do Emissor Nacional"
                    style={inputStyle}
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <span style={helperTextStyle}>
                    Campo obrigatório no seu banco atual para cadastrar o cliente.
                  </span>
                </div>
              </div>

              <div style={toggleCardStyle}>
                <span style={toggleLabelStyle}>Cliente é MEI?</span>

                <div style={toggleButtonsStyle}>
                  <button
                    type="button"
                    onClick={() => setIsMei(true)}
                    disabled={loading}
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
                    disabled={loading}
                    style={{
                      ...toggleButtonStyle,
                      ...(!isMei ? toggleButtonActiveDarkStyle : {}),
                    }}
                  >
                    Não
                  </button>
                </div>
              </div>

              <div style={infoBoxStyle}>
                O cliente será cadastrado vinculado à empresa logada e ficará disponível no
                módulo de clientes e no fluxo de emissão fiscal.
              </div>

              <div style={actionsStyle}>
                <button
                  type="button"
                  onClick={() => router.push("/clientes")}
                  style={backButtonStyle}
                  disabled={loading}
                >
                  Voltar
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    ...saveButtonStyle,
                    opacity: loading ? 0.75 : 1,
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "Salvando..." : "Salvar cliente"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </EmpresaPageShell>
  );
}

const pageWrapStyle: CSSProperties = {
  position: "relative",
  overflow: "hidden",
};

const backgroundGlowTopStyle: CSSProperties = {
  position: "absolute",
  top: "-120px",
  right: "-120px",
  width: "280px",
  height: "280px",
  borderRadius: "999px",
  background: "rgba(59, 130, 246, 0.18)",
  filter: "blur(70px)",
  pointerEvents: "none",
};

const backgroundGlowBottomStyle: CSSProperties = {
  position: "absolute",
  bottom: "-140px",
  left: "-100px",
  width: "260px",
  height: "260px",
  borderRadius: "999px",
  background: "rgba(14, 165, 233, 0.14)",
  filter: "blur(70px)",
  pointerEvents: "none",
};

const containerStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  maxWidth: "1200px",
  margin: "0 auto",
};

const heroCardStyle: CSSProperties = {
  background: "rgba(2, 6, 23, 0.72)",
  border: "1px solid rgba(59, 130, 246, 0.18)",
  borderRadius: "28px",
  padding: "26px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.36)",
  backdropFilter: "blur(16px)",
  marginBottom: "18px",
};

const heroTopRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
};

const heroLeftStyle: CSSProperties = {
  maxWidth: "760px",
};

const heroMiniStyle: CSSProperties = {
  margin: 0,
  fontSize: "12px",
  letterSpacing: "0.18em",
  color: "#93c5fd",
  fontWeight: 700,
};

const heroTitleStyle: CSSProperties = {
  margin: "10px 0 10px 0",
  fontSize: "34px",
  fontWeight: 800,
  color: "#ffffff",
};

const heroSubtitleStyle: CSSProperties = {
  margin: 0,
  color: "#cbd5e1",
  fontSize: "15px",
  lineHeight: 1.7,
  maxWidth: "720px",
};

const heroSideBoxStyle: CSSProperties = {
  display: "inline-flex",
  flexDirection: "column",
  gap: "8px",
  padding: "16px",
  borderRadius: "20px",
  background: "rgba(59, 130, 246, 0.08)",
  border: "1px solid rgba(59, 130, 246, 0.18)",
  minWidth: "220px",
};

const heroInfoLabelStyle: CSSProperties = {
  fontSize: "12px",
  color: "#93c5fd",
  fontWeight: 700,
};

const heroInfoValueStyle: CSSProperties = {
  color: "#ffffff",
  fontSize: "18px",
  fontWeight: 800,
};

const messageStyle: CSSProperties = {
  borderRadius: "18px",
  padding: "14px 16px",
  marginBottom: "16px",
  fontSize: "14px",
  border: "1px solid transparent",
};

const successMessageStyle: CSSProperties = {
  backgroundColor: "rgba(16, 185, 129, 0.12)",
  border: "1px solid rgba(16, 185, 129, 0.25)",
  color: "#bbf7d0",
};

const errorMessageStyle: CSSProperties = {
  backgroundColor: "rgba(239, 68, 68, 0.12)",
  border: "1px solid rgba(239, 68, 68, 0.25)",
  color: "#fecaca",
};

const formCardStyle: CSSProperties = {
  background: "rgba(2, 6, 23, 0.68)",
  border: "1px solid rgba(59, 130, 246, 0.14)",
  borderRadius: "28px",
  padding: "20px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.34)",
  backdropFilter: "blur(16px)",
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  paddingBottom: "14px",
  borderBottom: "1px solid rgba(148, 163, 184, 0.10)",
  marginBottom: "18px",
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "22px",
  fontWeight: 800,
  color: "#ffffff",
};

const sectionSubtitleStyle: CSSProperties = {
  margin: "6px 0 0 0",
  fontSize: "14px",
  color: "#94a3b8",
};

const formStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "18px",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "14px",
};

const fieldGroupStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const labelStyle: CSSProperties = {
  fontSize: "13px",
  color: "#93c5fd",
  fontWeight: 700,
};

const inputStyle: CSSProperties = {
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

const helperTextStyle: CSSProperties = {
  fontSize: "12px",
  color: "#94a3b8",
  lineHeight: 1.5,
};

const toggleCardStyle: CSSProperties = {
  background: "rgba(15, 23, 42, 0.92)",
  border: "1px solid rgba(59, 130, 246, 0.12)",
  borderRadius: "18px",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const toggleLabelStyle: CSSProperties = {
  fontSize: "14px",
  color: "#ffffff",
  fontWeight: 700,
};

const toggleButtonsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const toggleButtonStyle: CSSProperties = {
  padding: "11px 14px",
  borderRadius: "12px",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  background: "rgba(2, 6, 23, 0.8)",
  color: "#cbd5e1",
  fontWeight: 700,
  cursor: "pointer",
};

const toggleButtonActiveBlueStyle: CSSProperties = {
  background: "rgba(37, 99, 235, 0.18)",
  color: "#dbeafe",
  border: "1px solid rgba(59, 130, 246, 0.35)",
};

const toggleButtonActiveDarkStyle: CSSProperties = {
  background: "rgba(71, 85, 105, 0.22)",
  color: "#ffffff",
  border: "1px solid rgba(148, 163, 184, 0.28)",
};

const infoBoxStyle: CSSProperties = {
  backgroundColor: "rgba(15, 23, 42, 0.92)",
  border: "1px solid rgba(59, 130, 246, 0.12)",
  borderRadius: "16px",
  padding: "14px 16px",
  color: "#cbd5e1",
  fontSize: "14px",
  lineHeight: 1.6,
};

const actionsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "4px",
};

const backButtonStyle: CSSProperties = {
  padding: "13px 16px",
  borderRadius: "14px",
  backgroundColor: "rgba(15, 23, 42, 0.9)",
  color: "#ffffff",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  fontWeight: 700,
  cursor: "pointer",
};

const saveButtonStyle: CSSProperties = {
  padding: "13px 18px",
  borderRadius: "14px",
  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  color: "#ffffff",
  border: "none",
  fontWeight: 800,
  boxShadow: "0 12px 28px rgba(16,185,129,0.26)",
};