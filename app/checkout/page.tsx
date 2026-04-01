"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { useSearchParams } from "next/navigation";
import { getClientSession } from "@/lib/session";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";

type Plano = "essencial" | "full";

type PreferenceResponse = {
  success: boolean;
  message?: string;
  preference_id?: string;
};

const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY || "";

if (publicKey) {
  initMercadoPago(publicKey, {
    locale: "pt-BR",
  });
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const planoParam = searchParams.get("plano") as Plano;

  const [plano, setPlano] = useState<Plano | null>(null);
  const [loading, setLoading] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [brickReady, setBrickReady] = useState(false);

  useEffect(() => {
    if (planoParam === "essencial" || planoParam === "full") {
      setPlano(planoParam);
    } else {
      setPlano(null);
    }
  }, [planoParam]);

  const info = useMemo(() => {
    if (plano === "essencial") {
      return {
        nome: "Plano Essencial",
        precoNumero: 29.9,
        precoTexto: "R$ 29,90",
        descricao: "Até 10 notas por mês",
      };
    }

    if (plano === "full") {
      return {
        nome: "Plano Full",
        precoNumero: 59.9,
        precoTexto: "R$ 59,90",
        descricao: "Notas ilimitadas",
      };
    }

    return null;
  }, [plano]);

  async function iniciarCheckout() {
    try {
      setLoading(true);
      setErro("");
      setPreferenceId(null);
      setBrickReady(false);

      if (!publicKey) {
        setErro("A chave pública do Mercado Pago não está configurada.");
        setLoading(false);
        return;
      }

      const client = getClientSession();

      if (!client?.id) {
        alert("Faça login antes de continuar.");
        window.location.href = "/login";
        return;
      }

      if (!plano) {
        setErro("Plano inválido.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/mercadopago/criar-preferencia", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: client.id,
          plano,
        }),
      });

      const result: PreferenceResponse = await response.json();

      if (!response.ok || !result?.success || !result?.preference_id) {
        setErro(result?.message || "Erro ao iniciar pagamento.");
        setLoading(false);
        return;
      }

      setPreferenceId(result.preference_id);
      setBrickReady(true);
      setLoading(false);
    } catch (error) {
      console.log(error);
      setErro("Erro inesperado ao iniciar pagamento.");
      setLoading(false);
    }
  }

  if (!info) {
    return (
      <main style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>Confirmar assinatura</h1>
          <p style={errorTextStyle}>Plano inválido.</p>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={wrapStyle}>
        <section style={leftCardStyle}>
          <span style={tagStyle}>Checkout seguro</span>
          <h1 style={titleStyle}>Confirmar assinatura</h1>
          <p style={subtitleStyle}>
            Finalize sua assinatura sem sair da MVP_ Automação Fiscal.
          </p>

          <div style={planBoxStyle}>
            <div>
              <h2 style={planTitleStyle}>{info.nome}</h2>
              <p style={planDescStyle}>{info.descricao}</p>
            </div>
            <strong style={priceStyle}>{info.precoTexto}</strong>
          </div>

          {!preferenceId && (
            <button
              onClick={iniciarCheckout}
              disabled={loading}
              style={loading ? buttonDisabledStyle : buttonStyle}
            >
              {loading ? "Carregando pagamento..." : "Continuar para pagamento"}
            </button>
          )}

          {erro && <div style={errorBoxStyle}>{erro}</div>}

          <div style={infoBoxStyle}>
            O pagamento será processado de forma segura pelo Mercado Pago dentro
            do seu checkout.
          </div>
        </section>

        <section style={rightCardStyle}>
          <div style={summaryHeaderStyle}>
            <h3 style={summaryTitleStyle}>Resumo</h3>
            <p style={summaryTextStyle}>Revise seu plano antes de pagar.</p>
          </div>

          <div style={summaryItemStyle}>
            <span style={summaryLabelStyle}>Plano</span>
            <p style={summaryValueStyle}>{info.nome}</p>
          </div>

          <div style={summaryItemStyle}>
            <span style={summaryLabelStyle}>Valor</span>
            <p style={summaryValueStyle}>{info.precoTexto}</p>
          </div>

          <div style={summaryItemStyle}>
            <span style={summaryLabelStyle}>Descrição</span>
            <p style={summaryValueStyle}>{info.descricao}</p>
          </div>

          {brickReady && preferenceId ? (
            <div style={brickContainerStyle}>
              <Payment
                initialization={{
                  amount: info.precoNumero,
                  preferenceId,
                }}
                customization={{
                  paymentMethods: {
                    creditCard: "all",
                    debitCard: "all",
                    ticket: "all",
                    bankTransfer: "all",
                    atm: "all",
                    mercadoPago: "all",
                  },
                  visual: {
                    style: {
                      theme: "default",
                    },
                  },
                }}
                onReady={() => {
                  console.log("Payment Brick pronto.");
                }}
                onSubmit={async () => {
                  console.log("Pagamento enviado pelo Brick.");
                }}
                onError={(error) => {
                  console.log("Erro no Payment Brick:", error);
                  setErro("Não foi possível carregar o checkout do pagamento.");
                }}
              />
            </div>
          ) : (
            <div style={placeholderBoxStyle}>
              Clique em <strong>Continuar para pagamento</strong> para carregar
              o checkout transparente.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main style={pageStyle}>
          <div style={cardStyle}>Carregando checkout...</div>
        </main>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px 16px",
  background:
    "linear-gradient(135deg, #020617 0%, #081224 35%, #0f172a 65%, #071b34 100%)",
};

const wrapStyle: CSSProperties = {
  width: "100%",
  maxWidth: "1180px",
  display: "grid",
  gridTemplateColumns: "minmax(0, 0.95fr) minmax(0, 1.2fr)",
  gap: "22px",
};

const cardStyle: CSSProperties = {
  background: "rgba(2,6,23,0.84)",
  padding: "30px",
  borderRadius: "24px",
  width: "100%",
  maxWidth: "420px",
  color: "#fff",
};

const leftCardStyle: CSSProperties = {
  background: "rgba(2,6,23,0.84)",
  border: "1px solid rgba(148,163,184,0.16)",
  padding: "30px",
  borderRadius: "24px",
  color: "#fff",
  boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
};

const rightCardStyle: CSSProperties = {
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
  border: "1px solid #dbe7f5",
  padding: "26px",
  borderRadius: "24px",
  color: "#0f172a",
  boxShadow: "0 20px 50px rgba(0,0,0,0.16)",
};

const tagStyle: CSSProperties = {
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: "999px",
  background: "rgba(34,197,94,0.16)",
  border: "1px solid rgba(34,197,94,0.28)",
  color: "#86efac",
  fontSize: "12px",
  fontWeight: 800,
  marginBottom: "16px",
};

const titleStyle: CSSProperties = {
  fontSize: "30px",
  margin: 0,
  fontWeight: 900,
  lineHeight: 1.15,
};

const subtitleStyle: CSSProperties = {
  marginTop: "12px",
  marginBottom: "20px",
  color: "#cbd5e1",
  lineHeight: 1.7,
  fontSize: "14px",
};

const planBoxStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  alignItems: "center",
  padding: "18px",
  borderRadius: "18px",
  background: "rgba(15,23,42,0.5)",
  border: "1px solid rgba(148,163,184,0.16)",
  marginBottom: "18px",
};

const planTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "20px",
  fontWeight: 800,
};

const planDescStyle: CSSProperties = {
  marginTop: "6px",
  marginBottom: 0,
  color: "#cbd5e1",
  fontSize: "14px",
};

const priceStyle: CSSProperties = {
  fontSize: "24px",
  fontWeight: "bold",
  whiteSpace: "nowrap",
};

const buttonStyle: CSSProperties = {
  width: "100%",
  padding: "14px",
  borderRadius: "14px",
  background: "#22c55e",
  border: "none",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: "15px",
  boxShadow: "0 14px 24px rgba(34,197,94,0.25)",
};

const buttonDisabledStyle: CSSProperties = {
  ...buttonStyle,
  opacity: 0.7,
  cursor: "not-allowed",
};

const infoBoxStyle: CSSProperties = {
  marginTop: "16px",
  padding: "14px 16px",
  borderRadius: "16px",
  background: "rgba(37,99,235,0.12)",
  border: "1px solid rgba(96,165,250,0.25)",
  color: "#dbeafe",
  fontSize: "14px",
  lineHeight: 1.6,
};

const errorBoxStyle: CSSProperties = {
  marginTop: "14px",
  padding: "12px 14px",
  borderRadius: "14px",
  background: "rgba(127,29,29,0.28)",
  border: "1px solid rgba(252,165,165,0.24)",
  color: "#fee2e2",
  fontSize: "14px",
  fontWeight: 700,
};

const errorTextStyle: CSSProperties = {
  color: "#fecaca",
};

const summaryHeaderStyle: CSSProperties = {
  marginBottom: "18px",
};

const summaryTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 900,
  color: "#0f172a",
};

const summaryTextStyle: CSSProperties = {
  marginTop: "8px",
  marginBottom: 0,
  fontSize: "14px",
  color: "#64748b",
};

const summaryItemStyle: CSSProperties = {
  padding: "14px",
  borderRadius: "16px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  marginBottom: "12px",
};

const summaryLabelStyle: CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: "6px",
  fontWeight: 700,
};

const summaryValueStyle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontWeight: 800,
  lineHeight: 1.6,
};

const brickContainerStyle: CSSProperties = {
  marginTop: "18px",
  padding: "16px",
  borderRadius: "18px",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
};

const placeholderBoxStyle: CSSProperties = {
  marginTop: "18px",
  padding: "18px",
  borderRadius: "18px",
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1d4ed8",
  lineHeight: 1.7,
};