"use client";

import { useEffect } from "react";

export default function DashboardClientePage() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.replace("/area-cliente");
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  return (
    <main style={pageStyle}>
      <div style={glowTopStyle} />
      <div style={glowBottomStyle} />

      <div style={containerStyle}>
        <section style={heroCardStyle}>
          <div style={badgeStyle}>MVP_ Automação Fiscal</div>

          <h1 style={heroTitleStyle}>Área do cliente</h1>

          <p style={heroDescriptionStyle}>
            Estamos direcionando você para o ambiente atualizado da plataforma.
          </p>

          <div style={heroInfoRowStyle}>
            <div style={heroInfoCardStyle}>
              <span style={heroInfoLabelStyle}>Destino</span>
              <strong style={heroInfoValueStyle}>/area-cliente</strong>
            </div>

            <div style={heroInfoCardStyle}>
              <span style={heroInfoLabelStyle}>Ambiente</span>
              <strong style={heroInfoValueStyle}>Padrão MVP</strong>
            </div>
          </div>
        </section>

        <section style={redirectCardStyle}>
          <div style={cardTopStyle}>
            <div>
              <p style={cardMiniTitleStyle}>Redirecionamento</p>
              <h2 style={cardTitleStyle}>Abrindo sua área</h2>
            </div>

            <div style={sidePillStyle}>Online</div>
          </div>

          <div style={statusBoxStyle}>
            <div style={statusDotStyle} />
            <span style={statusTextStyle}>
              Redirecionando para a versão atual da área do cliente...
            </span>
          </div>

          <div style={progressTrackStyle}>
            <div style={progressBarStyle} />
          </div>

          <div style={helperRowStyle}>
            <button
              type="button"
              onClick={() => window.location.replace("/area-cliente")}
              style={primaryButtonStyle}
            >
              Ir agora para a área do cliente
            </button>
          </div>
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

const heroDescriptionStyle: React.CSSProperties = {
  margin: "10px 0 0 0",
  fontSize: "14px",
  color: "#cbd5e1",
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

const redirectCardStyle: React.CSSProperties = {
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

const statusBoxStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "14px 16px",
  borderRadius: "16px",
  background: "rgba(15,23,42,0.86)",
  border: "1px solid rgba(59,130,246,0.16)",
  marginBottom: "16px",
};

const statusDotStyle: React.CSSProperties = {
  width: "10px",
  height: "10px",
  borderRadius: "999px",
  background: "#22c55e",
  boxShadow: "0 0 14px rgba(34,197,94,0.65)",
  flexShrink: 0,
};

const statusTextStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#dbeafe",
  fontWeight: 600,
};

const progressTrackStyle: React.CSSProperties = {
  width: "100%",
  height: "10px",
  borderRadius: "999px",
  overflow: "hidden",
  background: "rgba(30,41,59,0.95)",
  border: "1px solid rgba(59,130,246,0.12)",
};

const progressBarStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: "999px",
  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
};

const helperRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "18px",
};

const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "15px 18px",
  borderRadius: "16px",
  border: "none",
  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  color: "#ffffff",
  fontWeight: 800,
  fontSize: "15px",
  boxShadow: "0 14px 30px rgba(37,99,235,0.30)",
  cursor: "pointer",
};