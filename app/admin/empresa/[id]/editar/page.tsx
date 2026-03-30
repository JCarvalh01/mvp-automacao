"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import ProtectedPageLoader from "@/components/ProtectedPageLoader";

type Empresa = {
  id: number;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  user_id?: number | null;
  payment_status?: string | null;
  is_blocked?: boolean | null;
  clients_limit?: number | null;
  price_per_client?: number | null;
  base_price?: number | null;
};

export default function EditarEmpresaPage() {
  const router = useRouter();
  const params = useParams();
  const { loading: loadingAccess, authorized } = useProtectedRoute(["admin"]);

  const empresaId = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [isBlocked, setIsBlocked] = useState(false);
  const [clientsLimit, setClientsLimit] = useState("");
  const [pricePerClient, setPricePerClient] = useState("");
  const [basePrice, setBasePrice] = useState("");

  useEffect(() => {
    if (authorized) {
      carregarEmpresa();
    }
  }, [authorized, empresaId]);

  async function carregarEmpresa() {
    try {
      setLoading(true);
      setMensagem("");

      if (!empresaId || Number.isNaN(empresaId)) {
        setMensagem("Empresa inválida.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("partner_companies")
        .select("*")
        .eq("id", empresaId)
        .single();

      if (error || !data) {
        console.log("Erro ao buscar empresa:", error);
        setMensagem("Empresa não encontrada.");
        setLoading(false);
        return;
      }

      const empresa = data as Empresa;

      setNome(empresa.name || "");
      setCnpj(empresa.cnpj || "");
      setEmail(empresa.email || "");
      setTelefone(empresa.phone || "");
      setEndereco(empresa.address || "");
      setPaymentStatus(
        String(empresa.payment_status || "unpaid").toLowerCase() === "paid"
          ? "paid"
          : "unpaid"
      );
      setIsBlocked(Boolean(empresa.is_blocked));
      setClientsLimit(
        empresa.clients_limit !== null && empresa.clients_limit !== undefined
          ? String(empresa.clients_limit)
          : ""
      );
      setPricePerClient(
        empresa.price_per_client !== null && empresa.price_per_client !== undefined
          ? String(empresa.price_per_client)
          : ""
      );
      setBasePrice(
        empresa.base_price !== null && empresa.base_price !== undefined
          ? String(empresa.base_price)
          : ""
      );

      setLoading(false);
    } catch (error) {
      console.log("Erro inesperado ao carregar empresa:", error);
      setMensagem("Erro inesperado ao carregar empresa.");
      setLoading(false);
    }
  }

  function normalizarNumero(valor: string) {
    if (!valor.trim()) return null;

    const normalizado = valor.replace(/\./g, "").replace(",", ".");
    const numero = Number(normalizado);

    if (Number.isNaN(numero)) return null;
    return numero;
  }

  async function salvarAlteracoes(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSalvando(true);
      setMensagem("");

      if (!nome.trim() || !email.trim()) {
        setMensagem("Preencha pelo menos nome e email.");
        setSalvando(false);
        return;
      }

      const clientsLimitNumero = clientsLimit.trim()
        ? Number(clientsLimit)
        : null;

      if (clientsLimit.trim() && Number.isNaN(clientsLimitNumero)) {
        setMensagem("Limite de clientes inválido.");
        setSalvando(false);
        return;
      }

      const pricePerClientNumero = normalizarNumero(pricePerClient);
      if (pricePerClient.trim() && pricePerClientNumero === null) {
        setMensagem("Valor por cliente inválido.");
        setSalvando(false);
        return;
      }

      const basePriceNumero = normalizarNumero(basePrice);
      if (basePrice.trim() && basePriceNumero === null) {
        setMensagem("Base mensal inválida.");
        setSalvando(false);
        return;
      }

      const payload = {
        name: nome.trim(),
        cnpj: cnpj.trim() || null,
        email: email.trim().toLowerCase(),
        phone: telefone.trim() || null,
        address: endereco.trim() || null,
        payment_status: paymentStatus,
        is_blocked: isBlocked,
        clients_limit: clientsLimitNumero,
        price_per_client: pricePerClientNumero,
        base_price: basePriceNumero,
      };

      const { error } = await supabase
        .from("partner_companies")
        .update(payload)
        .eq("id", empresaId);

      if (error) {
        console.log("Erro ao atualizar empresa:", error);
        setMensagem("Não foi possível salvar as alterações.");
        setSalvando(false);
        return;
      }

      setMensagem("Empresa atualizada com sucesso.");

      setTimeout(() => {
        router.push(`/admin/empresa/${empresaId}`);
      }, 1000);
    } catch (error) {
      console.log("Erro inesperado ao salvar empresa:", error);
      setMensagem("Erro inesperado ao salvar empresa.");
    } finally {
      setSalvando(false);
    }
  }

  function voltar() {
    router.push(`/admin/empresa/${empresaId}`);
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
              <h1 style={heroTitleStyle}>Editar Empresa</h1>
              <p style={heroSubtitleStyle}>
                Atualize os dados da empresa parceira sem quebrar a operação já
                existente do sistema.
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
              <h2 style={sectionTitleStyle}>Dados da empresa</h2>
              <p style={sectionSubtitleStyle}>
                Edite o cadastro e os controles financeiros da empresa.
              </p>
            </div>
          </div>

          <form onSubmit={salvarAlteracoes} style={formStyle}>
            <div style={gridStyle}>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Nome da empresa *</label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Digite o nome da empresa"
                  style={inputStyle}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>CNPJ</label>
                <input
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="Digite o CNPJ"
                  style={inputStyle}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite o email"
                  style={inputStyle}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Telefone</label>
                <input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="Digite o telefone"
                  style={inputStyle}
                />
              </div>

              <div style={{ ...fieldGroupStyle, gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Endereço</label>
                <input
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Digite o endereço"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={dividerStyle} />

            <div style={sectionHeaderMiniStyle}>
              <h3 style={sectionMiniTitleStyle}>Controle financeiro e acesso</h3>
            </div>

            <div style={gridStyle}>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Status de pagamento</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  style={inputStyle}
                >
                  <option value="paid">Pago</option>
                  <option value="unpaid">Não pago</option>
                </select>
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Status da empresa</label>
                <select
                  value={isBlocked ? "true" : "false"}
                  onChange={(e) => setIsBlocked(e.target.value === "true")}
                  style={inputStyle}
                >
                  <option value="false">Liberada</option>
                  <option value="true">Bloqueada</option>
                </select>
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Limite de clientes</label>
                <input
                  type="number"
                  min="0"
                  value={clientsLimit}
                  onChange={(e) => setClientsLimit(e.target.value)}
                  placeholder="Ex: 100"
                  style={inputStyle}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Valor por cliente (R$)</label>
                <input
                  value={pricePerClient}
                  onChange={(e) => setPricePerClient(e.target.value)}
                  placeholder="Ex: 7 ou 7,00"
                  style={inputStyle}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Base mensal (R$)</label>
                <input
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="Ex: 30 ou 30,00"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={infoBoxStyle}>
              <p style={infoTextStyle}>
                Essa tela atualiza diretamente a tabela{" "}
                <strong>partner_companies</strong>, mantendo a lógica atual da MVP,
                inclusive bloqueio por <strong>payment_status</strong> e{" "}
                <strong>is_blocked</strong>.
              </p>
            </div>

            <div style={actionsStyle}>
              <button
                type="submit"
                disabled={salvando}
                style={{
                  ...primaryButtonStyle,
                  opacity: salvando ? 0.75 : 1,
                  cursor: salvando ? "not-allowed" : "pointer",
                }}
              >
                {salvando ? "Salvando..." : "Salvar alterações"}
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
  maxWidth: "900px",
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

const sectionHeaderMiniStyle: React.CSSProperties = {
  marginBottom: "6px",
};

const sectionMiniTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "18px",
  fontWeight: 800,
  color: "#ffffff",
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "18px",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
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

const dividerStyle: React.CSSProperties = {
  height: "1px",
  background: "rgba(148, 163, 184, 0.12)",
  width: "100%",
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