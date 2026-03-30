"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginEmpresaRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #020617 0%, #081224 35%, #0f172a 65%, #071b34 100%)",
        color: "#ffffff",
        fontFamily: "Arial, sans-serif",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "rgba(2, 6, 23, 0.72)",
          border: "1px solid rgba(59, 130, 246, 0.18)",
          borderRadius: 28,
          padding: 32,
          textAlign: "center",
          boxShadow: "0 24px 70px rgba(0,0,0,0.36)",
          backdropFilter: "blur(16px)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 12,
            letterSpacing: "0.18em",
            color: "#93c5fd",
            fontWeight: 700,
          }}
        >
          MVP_ AUTOMAÇÃO FISCAL
        </p>

        <h1
          style={{
            margin: "12px 0 10px",
            fontSize: 28,
            fontWeight: 800,
            color: "#ffffff",
          }}
        >
          Redirecionando...
        </h1>

        <p
          style={{
            margin: 0,
            fontSize: 15,
            lineHeight: 1.7,
            color: "#cbd5e1",
          }}
        >
          Você será enviado para a página principal de login.
        </p>
      </div>
    </main>
  );
}