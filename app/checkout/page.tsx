"use client";

import { Suspense, useEffect, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { getClientSession } from "@/lib/session";

function CheckoutContent() {
  const searchParams = useSearchParams();

  const planoParam = searchParams.get("plano") as "essencial" | "full";

  const [plano, setPlano] = useState<"essencial" | "full" | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (planoParam === "essencial" || planoParam === "full") {
      setPlano(planoParam);
    }
  }, [planoParam]);

  function getPlanoInfo() {
    if (plano === "essencial") {
      return {
        nome: "Plano Essencial",
        preco: "R$ 29,90",
        descricao: "Até 10 notas por mês",
      };
    }

    if (plano === "full") {
      return {
        nome: "Plano Full",
        preco: "R$ 59,90",
        descricao: "Notas ilimitadas",
      };
    }

    return null;
  }

  async function continuarPagamento() {
    try {
      setLoading(true);

      const client = getClientSession();

      if (!client?.id) {
        alert("Faça login antes de continuar.");
        window.location.href = "/login";
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

      if (!result?.init_point) {
        alert("Erro ao iniciar pagamento.");
        setLoading(false);
        return;
      }

      window.location.href = result.init_point;
    } catch (error) {
      console.log(error);
      alert("Erro inesperado.");
      setLoading(false);
    }
  }

  const info = getPlanoInfo();

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Confirmar assinatura</h1>

        {!info ? (
          <p>Plano inválido.</p>
        ) : (
          <>
            <div style={planoBoxStyle}>
              <h2>{info.nome}</h2>
              <p style={priceStyle}>{info.preco}</p>
              <p>{info.descricao}</p>
            </div>

            <button
              onClick={continuarPagamento}
              disabled={loading}
              style={buttonStyle}
            >
              {loading ? "Redirecionando..." : "Ir para pagamento"}
            </button>
          </>
        )}
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
  background:
    "linear-gradient(135deg, #020617 0%, #081224 35%, #0f172a 65%, #071b34 100%)",
};

const cardStyle: CSSProperties = {
  background: "rgba(2,6,23,0.8)",
  padding: "30px",
  borderRadius: "20px",
  width: "100%",
  maxWidth: "400px",
  color: "#fff",
};

const titleStyle: CSSProperties = {
  fontSize: "24px",
  marginBottom: "20px",
};

const planoBoxStyle: CSSProperties = {
  marginBottom: "20px",
};

const priceStyle: CSSProperties = {
  fontSize: "22px",
  fontWeight: "bold",
};

const buttonStyle: CSSProperties = {
  width: "100%",
  padding: "14px",
  borderRadius: "12px",
  background: "#22c55e",
  border: "none",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
};