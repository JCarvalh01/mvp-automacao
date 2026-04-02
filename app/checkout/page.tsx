"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useSearchParams } from "next/navigation";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";

type Plano = "essencial" | "full";

type ClientSession = {
  id: number;
  name?: string | null;
  email?: string | null;
  partner_company_id?: number | null;
};

type PaymentSubmitData = {
  formData: {
    token?: string;
    issuer_id?: string;
    payment_method_id?: string;
    transaction_amount?: number;
    installments?: number;
    payer?: {
      email?: string;
    };
  };
};

const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY || "";

if (publicKey) {
  initMercadoPago(publicKey, {
    locale: "pt-BR",
  });
}

function resumirCodigoPix(codigo: string | null) {
  const valor = String(codigo || "").trim();

  if (!valor) return "";
  if (valor.length <= 80) return valor;

  return `${valor.slice(0, 80)}...`;
}

function getClientFromLocalStorage(): ClientSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem("client");
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") return null;

    const id = Number(parsed.id);
    if (!id || Number.isNaN(id)) return null;

    return {
      id,
      name: parsed.name || null,
      email: parsed.email || null,
      partner_company_id:
        parsed.partner_company_id === null ||
        parsed.partner_company_id === undefined
          ? null
          : Number(parsed.partner_company_id),
    };
  } catch (error) {
    console.log("Erro ao ler sessão do client no localStorage:", error);
    return null;
  }
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const planoParam = searchParams.get("plano") as Plano;

  const [plano, setPlano] = useState<Plano | null>(null);
  const [loading, setLoading] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [pixQrBase64, setPixQrBase64] = useState<string | null>(null);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [boletoUrl, setBoletoUrl] = useState<string | null>(null);
  const [processandoPagamento, setProcessandoPagamento] = useState(false);
  const [verificandoPagamento, setVerificandoPagamento] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [autoCheckAtivo, setAutoCheckAtivo] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirecionandoRef = useRef(false);

  useEffect(() => {
    if (planoParam === "essencial" || planoParam === "full") {
      setPlano(planoParam);
    } else {
      setPlano(null);
    }
  }, [planoParam]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

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

  function pararAutoVerificacao() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setAutoCheckAtivo(false);
  }

  function redirecionarAreaCliente() {
    if (redirecionandoRef.current) return;
    redirecionandoRef.current = true;
    pararAutoVerificacao();
    window.location.href = "/area-cliente";
  }

  async function consultarStatusClienteSilencioso() {
    const client = getClientFromLocalStorage();
    console.log("👤 Sessão real consultarStatusClienteSilencioso:", client);

    if (!client?.id) {
      return {
        success: false,
        active: false,
        message: "Sessão inválida.",
      };
    }

    const response = await fetch(`/api/client-status?clientId=${client.id}`, {
      method: "GET",
      cache: "no-store",
    });

    const result = await response.json();
    console.log("📦 Resultado client-status automático:", result);

    if (!response.ok) {
      return {
        success: false,
        active: false,
        message: result?.message || "Não foi possível verificar o pagamento.",
      };
    }

    const planType = String(result?.plan_type || "").toLowerCase();
    const subscriptionStatus = String(
      result?.subscription_status || ""
    ).toLowerCase();
    const isBlocked = Boolean(result?.is_blocked);

    const active =
      (planType === "essencial" || planType === "full") &&
      subscriptionStatus === "active" &&
      !isBlocked;

    return {
      success: true,
      active,
      result,
    };
  }

  function iniciarAutoVerificacaoPagamento() {
    if (pollingRef.current || redirecionandoRef.current) return;

    setAutoCheckAtivo(true);

    pollingRef.current = setInterval(async () => {
      try {
        const status = await consultarStatusClienteSilencioso();

        if (status.success && status.active) {
          setErro("");
          setSucesso("Pagamento confirmado automaticamente. Redirecionando...");
          redirecionarAreaCliente();
        }
      } catch (error) {
        console.log("Erro na auto verificação do pagamento:", error);
      }
    }, 5000);

    timeoutRef.current = setTimeout(() => {
      pararAutoVerificacao();
    }, 180000);
  }

  async function iniciarCheckout() {
    try {
      setLoading(true);
      setErro("");
      setSucesso("");
      setPreferenceId(null);
      setPixQrBase64(null);
      setPixCode(null);
      setBoletoUrl(null);
      setCopiado(false);
      pararAutoVerificacao();

      if (!publicKey) {
        setErro("A chave pública do Mercado Pago não está configurada.");
        setLoading(false);
        return;
      }

      const client = getClientFromLocalStorage();
      console.log("Sessão real iniciarCheckout:", client);

      if (!client?.id) {
        alert("Faça login antes de continuar.");
        window.location.href = "/login";
        return;
      }

      if (client.partner_company_id) {
        setErro(
          "Seu acesso é gerenciado por uma empresa parceira. Não é necessário contratar um plano individual."
        );
        setLoading(false);
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

      const result = await response.json();

      console.log("Resultado criar-preferencia:", result);

      if (!response.ok || !result?.success || !result?.preference_id) {
        setErro(result?.message || "Erro ao iniciar pagamento.");
        setLoading(false);
        return;
      }

      setPreferenceId(result.preference_id);
      setLoading(false);
    } catch (error) {
      console.log("Erro ao iniciar checkout:", error);
      setErro("Erro inesperado ao iniciar pagamento.");
      setLoading(false);
    }
  }

  async function processarPagamento(data: PaymentSubmitData) {
    try {
      setProcessandoPagamento(true);
      setErro("");
      setSucesso("");
      setPixQrBase64(null);
      setPixCode(null);
      setBoletoUrl(null);
      setCopiado(false);
      pararAutoVerificacao();

      const client = getClientFromLocalStorage();
      console.log("Sessão real processarPagamento:", client);

      if (!client?.id) {
        setErro("Faça login antes de continuar.");
        setProcessandoPagamento(false);
        return;
      }

      if (client.partner_company_id) {
        setErro(
          "Seu acesso é gerenciado por uma empresa parceira. Não é necessário contratar um plano individual."
        );
        setProcessandoPagamento(false);
        return;
      }

      if (!plano || !info) {
        setErro("Plano inválido.");
        setProcessandoPagamento(false);
        return;
      }

      const response = await fetch("/api/mercadopago/processar-pagamento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data.formData,
          clientId: client.id,
          plano,
          transaction_amount: info.precoNumero,
        }),
      });

      const result = await response.json();

      console.log("Resultado processar-pagamento:", result);

      if (!response.ok || !result?.success) {
        setErro(result?.message || "Não foi possível processar o pagamento.");
        setProcessandoPagamento(false);
        return;
      }

      const status = String(result?.status || "").toLowerCase();

      if (status === "approved") {
        setSucesso("Pagamento aprovado com sucesso. Seu plano já foi liberado.");

        setTimeout(() => {
          redirecionarAreaCliente();
        }, 1800);
      } else if (status === "pending") {
        if (result?.qr_code_base64 || result?.qr_code) {
          setSucesso(
            "Pix gerado com sucesso. Estamos aguardando a confirmação automática do pagamento."
          );
          setPixQrBase64(result.qr_code_base64 || null);
          setPixCode(result.qr_code || null);
          iniciarAutoVerificacaoPagamento();
        } else if (result?.ticket_url) {
          setSucesso(
            "Boleto gerado com sucesso. Estamos aguardando a confirmação automática do pagamento."
          );
          setBoletoUrl(result.ticket_url);
          iniciarAutoVerificacaoPagamento();
        } else {
          setSucesso(
            "Pagamento pendente. Assim que for confirmado, seu plano será liberado automaticamente."
          );
          iniciarAutoVerificacaoPagamento();
        }
      } else {
        setErro(
          result?.status_detail ||
            "Pagamento não aprovado. Tente novamente ou use outro método."
        );
      }

      setProcessandoPagamento(false);
    } catch (error) {
      console.log("Erro ao processar pagamento:", error);
      setErro("Erro inesperado ao processar o pagamento.");
      setProcessandoPagamento(false);
    }
  }

  async function copiarCodigoPix() {
    try {
      if (!pixCode) return;
      await navigator.clipboard.writeText(pixCode);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch (error) {
      console.log("Erro ao copiar código Pix:", error);
      setErro("Não foi possível copiar o código Pix.");
    }
  }

  async function verificarPagamento() {
    try {
      console.log("🔍 Verificando pagamento...");

      setVerificandoPagamento(true);
      setErro("");
      setSucesso("");

      const client = getClientFromLocalStorage();
      console.log("👤 Sessão real verificarPagamento:", client);

      if (!client?.id) {
        setErro("Sessão inválida. Faça login novamente.");
        setVerificandoPagamento(false);
        setTimeout(() => {
          window.location.href = "/login";
        }, 1200);
        return;
      }

      const status = await consultarStatusClienteSilencioso();

      if (!status.success) {
        setErro(status.message || "Não foi possível verificar o pagamento.");
        setVerificandoPagamento(false);
        return;
      }

      if (status.active) {
        setSucesso("Pagamento confirmado. Redirecionando...");

        setTimeout(() => {
          redirecionarAreaCliente();
        }, 1200);

        return;
      }

      setErro(
        "Pagamento ainda não confirmado. Aguarde mais um pouco e tente novamente."
      );
      setVerificandoPagamento(false);
    } catch (error) {
      console.log("❌ Erro ao verificar pagamento:", error);
      setErro("Erro ao verificar pagamento.");
      setVerificandoPagamento(false);
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
      <div className="checkout-wrap-responsive" style={wrapStyle}>
        <section className="checkout-left-responsive" style={leftCardStyle}>
          <button
            onClick={() => window.history.back()}
            style={backButtonStyle}
          >
            ← Voltar
          </button>

          <h1 className="checkout-title-responsive" style={titleStyle}>
            Confirmar assinatura
          </h1>

          <p className="checkout-subtitle-responsive" style={subtitleStyle}>
            Finalize sua assinatura sem sair da MVP_ Automação Fiscal.
          </p>

          <div className="checkout-planbox-responsive" style={planBoxStyle}>
            <div>
              <h2 style={planTitleStyle}>{info.nome}</h2>
              <p style={planDescStyle}>{info.descricao}</p>
            </div>
            <strong className="checkout-price-responsive" style={priceStyle}>
              {info.precoTexto}
            </strong>
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

          {processandoPagamento && (
            <div style={warningBoxStyle}>Processando pagamento...</div>
          )}

          {verificandoPagamento && (
            <div style={warningBoxStyle}>
              Verificando confirmação do pagamento...
            </div>
          )}

          {autoCheckAtivo && !verificandoPagamento && (
            <div style={warningBoxStyle}>
              Aguardando confirmação automática do pagamento...
            </div>
          )}

          {erro && <div style={errorBoxStyle}>{erro}</div>}

          {sucesso && <div style={successBoxStyle}>{sucesso}</div>}

          {pixQrBase64 && (
            <div style={pixBoxStyle}>
              <strong style={pixTitleStyle}>QR Code Pix</strong>
              <img
                src={`data:image/png;base64,${pixQrBase64}`}
                alt="QR Code Pix"
                style={pixImageStyle}
              />
            </div>
          )}

          {pixCode && (
            <div style={copyBoxStyle}>
              <strong style={copyTitleStyle}>Código Pix</strong>

              <div style={pixPreviewStyle}>{resumirCodigoPix(pixCode)}</div>

              <button onClick={copiarCodigoPix} style={copyButtonStyle}>
                {copiado ? "Código copiado!" : "Copiar código Pix"}
              </button>

              <button
                onClick={verificarPagamento}
                disabled={verificandoPagamento}
                style={
                  verificandoPagamento
                    ? verifyButtonDisabledStyle
                    : verifyButtonStyle
                }
              >
                {verificandoPagamento ? "Verificando..." : "Já paguei"}
              </button>
            </div>
          )}

          {boletoUrl && (
            <div style={copyBoxStyle}>
              <strong style={copyTitleStyle}>Boleto gerado</strong>

              <a
                href={boletoUrl}
                target="_blank"
                rel="noreferrer"
                style={boletoButtonStyle}
              >
                Abrir boleto
              </a>

              <button
                onClick={verificarPagamento}
                disabled={verificandoPagamento}
                style={
                  verificandoPagamento
                    ? verifyButtonDisabledStyle
                    : verifyButtonStyle
                }
              >
                {verificandoPagamento ? "Verificando..." : "Já paguei"}
              </button>
            </div>
          )}

          <div style={infoBoxStyle}>
            O pagamento será processado de forma segura pelo Mercado Pago dentro
            do seu checkout.
          </div>
        </section>

        <section className="checkout-right-responsive" style={rightCardStyle}>
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

          {preferenceId ? (
            <div style={brickContainerStyle}>
              <Payment
                initialization={{
                  amount: info.precoNumero,
                  preferenceId,
                }}
                customization={{
                  paymentMethods: {
                    creditCard: "all",
                    ticket: "all",
                    bankTransfer: "all",
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
                onSubmit={async (data: PaymentSubmitData) => {
                  await processarPagamento(data);
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

      <style jsx>{`
        @media (max-width: 980px) {
          .checkout-wrap-responsive {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 768px) {
          .checkout-left-responsive,
          .checkout-right-responsive {
            padding: 18px !important;
            border-radius: 22px !important;
          }

          .checkout-title-responsive {
            font-size: 34px !important;
            line-height: 1.05 !important;
          }

          .checkout-subtitle-responsive {
            font-size: 15px !important;
            line-height: 1.6 !important;
          }

          .checkout-planbox-responsive {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .checkout-price-responsive {
            white-space: normal !important;
          }
        }
      `}</style>
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
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
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

const backButtonStyle: CSSProperties = {
  marginBottom: "16px",
  background: "transparent",
  border: "1px solid rgba(148,163,184,0.3)",
  padding: "8px 12px",
  borderRadius: "10px",
  color: "#cbd5e1",
  cursor: "pointer",
  fontWeight: 700,
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

const successBoxStyle: CSSProperties = {
  marginTop: "14px",
  padding: "12px 14px",
  borderRadius: "14px",
  background: "rgba(16,185,129,0.18)",
  border: "1px solid rgba(16,185,129,0.32)",
  color: "#d1fae5",
  fontSize: "14px",
  fontWeight: 700,
};

const warningBoxStyle: CSSProperties = {
  marginTop: "14px",
  padding: "12px 14px",
  borderRadius: "14px",
  background: "rgba(245,158,11,0.16)",
  border: "1px solid rgba(245,158,11,0.28)",
  color: "#fde68a",
  fontSize: "14px",
  fontWeight: 700,
};

const pixBoxStyle: CSSProperties = {
  marginTop: "16px",
  padding: "16px",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.98)",
  color: "#0f172a",
};

const pixTitleStyle: CSSProperties = {
  display: "block",
  marginBottom: "12px",
  fontSize: "15px",
};

const pixImageStyle: CSSProperties = {
  width: "100%",
  maxWidth: "260px",
  display: "block",
  margin: "0 auto",
};

const copyBoxStyle: CSSProperties = {
  marginTop: "16px",
  padding: "16px",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.98)",
  color: "#0f172a",
};

const copyTitleStyle: CSSProperties = {
  display: "block",
  marginBottom: "10px",
  fontSize: "15px",
};

const pixPreviewStyle: CSSProperties = {
  width: "100%",
  borderRadius: "14px",
  border: "2px solid #f59e0b",
  padding: "14px",
  fontSize: "15px",
  lineHeight: 1.5,
  background: "#fffdf8",
  color: "#111827",
  wordBreak: "break-word",
  marginBottom: "12px",
};

const copyButtonStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "none",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: "14px",
  marginTop: "4px",
};

const verifyButtonStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "none",
  background: "#22c55e",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: "14px",
  marginTop: "10px",
};

const verifyButtonDisabledStyle: CSSProperties = {
  ...verifyButtonStyle,
  opacity: 0.72,
  cursor: "not-allowed",
};

const boletoButtonStyle: CSSProperties = {
  display: "block",
  marginTop: "12px",
  padding: "14px 16px",
  borderRadius: "14px",
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: 800,
  textAlign: "center",
  textDecoration: "none",
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