"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ProtectedPageLoader from "@/components/ProtectedPageLoader";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { getPartnerCompanySession } from "@/lib/session";
import EmpresaPageShell from "@/components/EmpresaPageShell";

type Empresa = {
  id: number;
  name: string;
};

type Cliente = {
  id: number;
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_mei: boolean | null;
  mei_created_at: string | null;
  is_active: boolean | null;
  password?: string | null;
  partner_company_id: number | null;
};

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

function mascararCnpj(valor: string | null | undefined) {
  const digits = limparCnpj(String(valor || ""));
  if (digits.length !== 14) return "Não informado";
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.***/****-${digits.slice(12)}`;
}

function mascararEmail(valor: string | null | undefined) {
  const email = String(valor || "").trim();
  if (!email || !email.includes("@")) return "Não informado";

  const [usuario, dominio] = email.split("@");
  if (!usuario || !dominio) return email;

  const inicio = usuario.slice(0, 2);
  return `${inicio}${"*".repeat(Math.max(usuario.length - 2, 2))}@${dominio}`;
}

function formatarTelefoneVisual(valor: string | null | undefined) {
  const digits = String(valor || "").replace(/\D/g, "").slice(0, 11);

  if (!digits) return "Não informado";

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export default function EditarClientePage() {
  const router = useRouter();
  const params = useParams();
  const { loading: loadingAccess, authorized } = useProtectedRoute(["partner_company"]);

  const clienteId = Number(params?.id);

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);

  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isMei, setIsMei] = useState(true);
  const [meiCreatedAt, setMeiCreatedAt] = useState("");
  const [isActive, setIsActive] = useState(true);

  // senha nova somente se quiser alterar
  const [senhaEmissor, setSenhaEmissor] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<"sucesso" | "erro" | "aviso" | "">("");

  useEffect(() => {
    if (!loadingAccess && authorized) {
      carregarDados();
    }
  }, [loadingAccess, authorized, clienteId]);

  async function carregarDados() {
    try {
      setLoading(true);
      setMensagem("");
      setTipoMensagem("");

      const session = getPartnerCompanySession();

      if (!session?.id) {
        router.push("/login");
        return;
      }

      if (!clienteId || Number.isNaN(clienteId)) {
        setMensagem("Cliente inválido.");
        setTipoMensagem("erro");
        setLoading(false);
        return;
      }

      setEmpresa({ id: session.id, name: session.name });

      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clienteId)
        .eq("partner_company_id", session.id)
        .single();

      if (error || !data) {
        setMensagem("Cliente não encontrado.");
        setTipoMensagem("erro");
        setLoading(false);
        return;
      }

      setCliente(data as Cliente);

      setName(data.name || "");
      setCnpj(data.cnpj || "");
      setEmail(data.email || "");
      setPhone(data.phone || "");
      setAddress(data.address || "");
      setIsMei(data.is_mei !== false);
      setMeiCreatedAt(data.mei_created_at || "");
      setIsActive(data.is_active !== false);

      // IMPORTANTE:
      // não carregar a senha antiga no input
      setSenhaEmissor("");

      setLoading(false);
    } catch (err) {
      console.log(err);
      setMensagem("Erro ao carregar cliente.");
      setTipoMensagem("erro");
      setLoading(false);
    }
  }

  const resumoStatus = useMemo(() => {
    return {
      status: isActive ? "Ativo" : "Inativo",
      mei: isMei ? "MEI" : "Não MEI",
      cnpjMascarado: mascararCnpj(cnpj),
      emailMascarado: mascararEmail(email),
    };
  }, [isActive, isMei, cnpj, email]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();

    if (saving) return;

    try {
      setSaving(true);
      setMensagem("");
      setTipoMensagem("");

      if (!name.trim()) {
        setMensagem("Informe o nome.");
        setTipoMensagem("erro");
        return;
      }

      const cnpjLimpo = limparCnpj(cnpj);

      if (cnpjLimpo && cnpjLimpo.length !== 14) {
        setMensagem("O CNPJ precisa ter 14 dígitos.");
        setTipoMensagem("erro");
        return;
      }

      const session = getPartnerCompanySession();

      const payloadBase: Record<string, unknown> = {
        name: name.trim(),
        cnpj: cnpjLimpo || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        is_mei: isMei,
        mei_created_at: meiCreatedAt || null,
        is_active: isActive,
      };

      // só altera a senha se o campo tiver sido preenchido
      if (senhaEmissor.trim()) {
        payloadBase.password = senhaEmissor.trim();
      }

      const { error } = await supabase
        .from("clients")
        .update(payloadBase)
        .eq("id", clienteId)
        .eq("partner_company_id", session?.id);

      if (error) {
        setMensagem(error.message || "Erro ao salvar.");
        setTipoMensagem("erro");
        return;
      }

      setMensagem(
        senhaEmissor.trim()
          ? "Cliente e senha do emissor atualizados com sucesso."
          : "Cliente atualizado com sucesso."
      );
      setTipoMensagem("sucesso");

      setTimeout(() => {
        router.push(`/clientes/${clienteId}/painel`);
      }, 700);
    } catch (err) {
      console.log(err);
      setMensagem("Erro inesperado.");
      setTipoMensagem("erro");
    } finally {
      setSaving(false);
    }
  }

  if (loadingAccess) {
    return <ProtectedPageLoader label="Validando acesso..." />;
  }

  if (!authorized) return null;

  if (loading) {
    return <ProtectedPageLoader label="Carregando cliente..." />;
  }

  return (
    <EmpresaPageShell
      title="Editar Cliente"
      subtitle="Atualize os dados do cliente com segurança, mantendo o padrão do MVP e o vínculo correto com a empresa logada."
    >
      <div style={pageWrapStyle}>
        <div style={backgroundGlowTopStyle} />
        <div style={backgroundGlowBottomStyle} />

        <div style={containerStyle}>
          <section style={heroCardStyle}>
            <div style={heroTopRowStyle}>
              <div style={heroLeftStyle}>
                <p style={heroMiniStyle}>MVP_ AUTOMAÇÃO FISCAL</p>
                <h1 style={heroTitleStyle}>Editar Cliente</h1>
                <p style={heroSubtitleStyle}>
                  Atualize os dados cadastrais e fiscais do cliente sem perder o padrão visual
                  da plataforma e com mais cuidado na exibição dos dados sensíveis.
                </p>

                <div style={heroPillsStyle}>
                  <span style={heroPillStyle}>{resumoStatus.status}</span>
                  <span style={heroPillStyle}>{resumoStatus.mei}</span>
                  <span style={heroPillStyle}>Empresa vinculada</span>
                </div>
              </div>

              <div style={heroSideBoxStyle}>
                <span style={heroInfoLabelStyle}>Empresa logada</span>
                <strong style={heroInfoValueStyle}>
                  {empresa?.name || "Área da Empresa"}
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
                  : tipoMensagem === "aviso"
                  ? warningMessageStyle
                  : errorMessageStyle),
              }}
            >
              {mensagem}
            </div>
          )}

          <section style={mainGridStyle}>
            <section style={formCardStyle}>
              <form onSubmit={salvar} style={formStyle}>
                <div style={sectionHeaderStyle}>
                  <div>
                    <h2 style={sectionTitleStyle}>Dados cadastrais</h2>
                    <p style={sectionSubtitleStyle}>
                      Revise as informações antes de salvar.
                    </p>
                  </div>
                </div>

                {saving && (
                  <div style={processingBannerStyle}>
                    <div style={processingDotStyle} />
                    <div>
                      <strong style={processingTitleStyle}>Salvando alterações...</strong>
                      <p style={processingTextStyle}>
                        Aguarde. Estamos atualizando os dados do cliente com segurança.
                      </p>
                    </div>
                  </div>
                )}

                <div style={gridStyle}>
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Nome do cliente</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Digite o nome do cliente"
                      style={inputStyle}
                      disabled={saving}
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
                      disabled={saving}
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
                      disabled={saving}
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
                      disabled={saving}
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
                      disabled={saving}
                    />
                  </div>

                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Data de abertura do MEI</label>
                    <input
                      type="date"
                      value={meiCreatedAt || ""}
                      onChange={(e) => setMeiCreatedAt(e.target.value)}
                      style={inputStyle}
                      disabled={saving}
                    />
                  </div>

                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Nova senha do Emissor Nacional</label>

                    <div style={passwordWrapStyle}>
                      <input
                        type={mostrarSenha ? "text" : "password"}
                        value={senhaEmissor}
                        onChange={(e) => setSenhaEmissor(e.target.value)}
                        placeholder="Preencha somente se quiser alterar"
                        style={passwordInputStyle}
                        disabled={saving}
                        autoComplete="new-password"
                      />

                      <button
                        type="button"
                        onClick={() => setMostrarSenha((prev) => !prev)}
                        style={togglePasswordButtonStyle}
                        disabled={saving}
                      >
                        {mostrarSenha ? "Ocultar" : "Mostrar"}
                      </button>
                    </div>

                    <span style={helperTextStyle}>
                      A senha atual não é exibida. Deixe em branco para manter a senha já salva.
                    </span>
                  </div>
                </div>

                <div style={togglesRowStyle}>
                  <div style={toggleCardStyle}>
                    <span style={toggleLabelStyle}>Cliente é MEI?</span>

                    <div style={toggleButtonsStyle}>
                      <button
                        type="button"
                        onClick={() => setIsMei(true)}
                        disabled={saving}
                        style={{
                          ...toggleButtonStyle,
                          ...(isMei ? toggleButtonActiveBlueStyle : {}),
                          ...(saving ? disabledToggleStyle : {}),
                        }}
                      >
                        Sim
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsMei(false)}
                        disabled={saving}
                        style={{
                          ...toggleButtonStyle,
                          ...(!isMei ? toggleButtonActiveDarkStyle : {}),
                          ...(saving ? disabledToggleStyle : {}),
                        }}
                      >
                        Não
                      </button>
                    </div>
                  </div>

                  <div style={toggleCardStyle}>
                    <span style={toggleLabelStyle}>Status do cliente</span>

                    <div style={toggleButtonsStyle}>
                      <button
                        type="button"
                        onClick={() => setIsActive(true)}
                        disabled={saving}
                        style={{
                          ...toggleButtonStyle,
                          ...(isActive ? toggleButtonActiveGreenStyle : {}),
                          ...(saving ? disabledToggleStyle : {}),
                        }}
                      >
                        Ativo
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsActive(false)}
                        disabled={saving}
                        style={{
                          ...toggleButtonStyle,
                          ...(!isActive ? toggleButtonActiveRedStyle : {}),
                          ...(saving ? disabledToggleStyle : {}),
                        }}
                      >
                        Inativo
                      </button>
                    </div>
                  </div>
                </div>

                <div style={actionsStyle}>
                  <Link href={`/clientes/${clienteId}/painel`} style={secondaryButtonStyle}>
                    Ver cliente
                  </Link>

                  <button
                    type="button"
                    onClick={() => router.push(`/clientes/${clienteId}/painel`)}
                    style={backButtonStyle}
                    disabled={saving}
                  >
                    Voltar
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      ...saveButtonStyle,
                      opacity: saving ? 0.75 : 1,
                      cursor: saving ? "not-allowed" : "pointer",
                    }}
                  >
                    {saving ? "Salvando..." : "Salvar alterações"}
                  </button>
                </div>
              </form>
            </section>

            <aside style={sideCardStyle}>
              <div style={sideHeaderStyle}>
                <h3 style={sideTitleStyle}>Resumo protegido</h3>
                <p style={sideSubtitleStyle}>
                  Visualização rápida com menos exposição de dados sensíveis.
                </p>
              </div>

              <div style={summaryGridStyleSide}>
                <div style={summaryItemStyle}>
                  <span style={summaryLabelStyleSide}>Nome</span>
                  <p style={summaryValueStyleSide}>{name || "Não informado"}</p>
                </div>

                <div style={summaryItemStyle}>
                  <span style={summaryLabelStyleSide}>CNPJ</span>
                  <p style={summaryValueStyleSide}>{resumoStatus.cnpjMascarado}</p>
                </div>

                <div style={summaryItemStyle}>
                  <span style={summaryLabelStyleSide}>Email</span>
                  <p style={summaryValueStyleSide}>{resumoStatus.emailMascarado}</p>
                </div>

                <div style={summaryItemStyle}>
                  <span style={summaryLabelStyleSide}>Telefone</span>
                  <p style={summaryValueStyleSide}>
                    {formatarTelefoneVisual(phone) || "Não informado"}
                  </p>
                </div>

                <div style={summaryItemStyle}>
                  <span style={summaryLabelStyleSide}>Tipo</span>
                  <p style={summaryValueStyleSide}>{isMei ? "MEI" : "Não MEI"}</p>
                </div>

                <div style={summaryItemStyle}>
                  <span style={summaryLabelStyleSide}>Status</span>
                  <p style={summaryValueStyleSide}>{isActive ? "Ativo" : "Inativo"}</p>
                </div>
              </div>

              <div style={securityBoxStyle}>
                <strong style={securityTitleStyle}>Atenção com dados sensíveis</strong>
                <p style={securityTextStyle}>
                  A senha anterior não é exibida na interface. Aqui você só informa uma nova senha
                  quando realmente quiser substituir a atual.
                </p>
              </div>

              <div style={quickActionsStyle}>
                <Link href={`/clientes/${clienteId}/painel`} style={quickActionPrimaryStyle}>
                  Ir para o painel do cliente
                </Link>

                <Link
                  href={`/emitir?client_id=${clienteId}`}
                  style={quickActionSecondaryStyle}
                >
                  Emitir nota para este cliente
                </Link>
              </div>
            </aside>
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

const heroPillsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "16px",
};

const heroPillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 12px",
  borderRadius: "999px",
  background: "rgba(59, 130, 246, 0.15)",
  border: "1px solid rgba(59, 130, 246, 0.24)",
  color: "#bfdbfe",
  fontSize: "12px",
  fontWeight: 700,
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

const warningMessageStyle: CSSProperties = {
  backgroundColor: "rgba(245, 158, 11, 0.12)",
  border: "1px solid rgba(245, 158, 11, 0.24)",
  color: "#fde68a",
};

const errorMessageStyle: CSSProperties = {
  backgroundColor: "rgba(239, 68, 68, 0.12)",
  border: "1px solid rgba(239, 68, 68, 0.25)",
  color: "#fecaca",
};

const mainGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.6fr) minmax(300px, 0.95fr)",
  gap: "18px",
  alignItems: "start",
};

const formCardStyle: CSSProperties = {
  background: "rgba(2, 6, 23, 0.68)",
  border: "1px solid rgba(59, 130, 246, 0.14)",
  borderRadius: "28px",
  padding: "20px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.34)",
  backdropFilter: "blur(16px)",
};

const sideCardStyle: CSSProperties = {
  background: "rgba(2, 6, 23, 0.68)",
  border: "1px solid rgba(59, 130, 246, 0.14)",
  borderRadius: "28px",
  padding: "20px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.34)",
  backdropFilter: "blur(16px)",
};

const formStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "18px",
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  paddingBottom: "14px",
  borderBottom: "1px solid rgba(148, 163, 184, 0.10)",
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

const processingBannerStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "14px",
  padding: "16px 18px",
  borderRadius: "18px",
  background: "rgba(37, 99, 235, 0.12)",
  border: "1px solid rgba(59, 130, 246, 0.24)",
};

const processingDotStyle: CSSProperties = {
  width: "12px",
  height: "12px",
  borderRadius: "999px",
  backgroundColor: "#60a5fa",
  marginTop: "5px",
  boxShadow: "0 0 0 6px rgba(37, 99, 235, 0.12)",
  flexShrink: 0,
};

const processingTitleStyle: CSSProperties = {
  display: "block",
  color: "#dbeafe",
  fontSize: "14px",
  marginBottom: "4px",
};

const processingTextStyle: CSSProperties = {
  margin: 0,
  color: "#cbd5e1",
  fontSize: "14px",
  lineHeight: 1.5,
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

const passwordWrapStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "10px",
};

const passwordInputStyle: CSSProperties = {
  ...inputStyle,
};

const togglePasswordButtonStyle: CSSProperties = {
  padding: "0 14px",
  borderRadius: "14px",
  background: "rgba(37, 99, 235, 0.18)",
  color: "#dbeafe",
  border: "1px solid rgba(59, 130, 246, 0.35)",
  fontWeight: 700,
  cursor: "pointer",
};

const helperTextStyle: CSSProperties = {
  fontSize: "12px",
  color: "#94a3b8",
  lineHeight: 1.5,
};

const togglesRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "14px",
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

const toggleButtonActiveGreenStyle: CSSProperties = {
  background: "rgba(16, 185, 129, 0.18)",
  color: "#d1fae5",
  border: "1px solid rgba(16, 185, 129, 0.34)",
};

const toggleButtonActiveRedStyle: CSSProperties = {
  background: "rgba(239, 68, 68, 0.16)",
  color: "#fecaca",
  border: "1px solid rgba(239, 68, 68, 0.30)",
};

const disabledToggleStyle: CSSProperties = {
  opacity: 0.7,
  cursor: "not-allowed",
};

const actionsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "4px",
};

const secondaryButtonStyle: CSSProperties = {
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

const sideHeaderStyle: CSSProperties = {
  marginBottom: "16px",
};

const sideTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "22px",
  color: "#ffffff",
  fontWeight: 800,
};

const sideSubtitleStyle: CSSProperties = {
  margin: "8px 0 0",
  color: "#94a3b8",
  fontSize: "14px",
  lineHeight: 1.6,
};

const summaryGridStyleSide: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const summaryItemStyle: CSSProperties = {
  background: "rgba(15, 23, 42, 0.92)",
  border: "1px solid rgba(59, 130, 246, 0.12)",
  borderRadius: "16px",
  padding: "14px",
};

const summaryLabelStyleSide: CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#93c5fd",
  marginBottom: "6px",
  fontWeight: 700,
};

const summaryValueStyleSide: CSSProperties = {
  margin: 0,
  color: "#ffffff",
  fontWeight: 700,
  lineHeight: 1.5,
  wordBreak: "break-word",
};

const securityBoxStyle: CSSProperties = {
  marginTop: "16px",
  background: "rgba(245, 158, 11, 0.10)",
  border: "1px solid rgba(245, 158, 11, 0.20)",
  borderRadius: "18px",
  padding: "14px 16px",
};

const securityTitleStyle: CSSProperties = {
  display: "block",
  color: "#fde68a",
  fontSize: "14px",
  marginBottom: "6px",
};

const securityTextStyle: CSSProperties = {
  margin: 0,
  color: "#fef3c7",
  fontSize: "14px",
  lineHeight: 1.6,
};

const quickActionsStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
  marginTop: "16px",
};

const quickActionPrimaryStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "13px 16px",
  borderRadius: "14px",
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: "#ffffff",
  fontWeight: 800,
};

const quickActionSecondaryStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "13px 16px",
  borderRadius: "14px",
  background: "rgba(15, 23, 42, 0.9)",
  color: "#ffffff",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  fontWeight: 700,
};