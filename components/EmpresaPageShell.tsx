"use client";

import EmpresaTopbar from "@/components/EmpresaTopbar";

type EmpresaPageShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export default function EmpresaPageShell({
  title,
  subtitle,
  children,
}: EmpresaPageShellProps) {
  return (
    <main style={pageStyle}>
      <div style={bgGlowOne} />
      <div style={bgGlowTwo} />

      <div style={containerStyle}>
        <EmpresaTopbar />

        <section style={heroCardStyle}>
          <p style={heroMiniStyle}>MVP_ AUTOMAÇÃO FISCAL</p>
          <h2 style={heroTitleStyle}>{title}</h2>
          <p style={heroSubtitleStyle}>{subtitle}</p>
        </section>

        <section>{children}</section>
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
  padding: "28px 20px 48px",
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
  background: "rgba(37, 99, 235, 0.16)",
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
  background: "rgba(59, 130, 246, 0.12)",
  filter: "blur(90px)",
  pointerEvents: "none",
};

const containerStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  maxWidth: "1200px",
  margin: "0 auto",
};

const heroCardStyle: React.CSSProperties = {
  background: "rgba(2, 6, 23, 0.68)",
  border: "1px solid rgba(59, 130, 246, 0.14)",
  borderRadius: "26px",
  padding: "24px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.32)",
  backdropFilter: "blur(16px)",
  marginBottom: "18px",
};

const heroMiniStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "12px",
  letterSpacing: "0.18em",
  color: "#93c5fd",
  fontWeight: 700,
};

const heroTitleStyle: React.CSSProperties = {
  margin: "8px 0 8px",
  fontSize: "30px",
  fontWeight: 800,
  color: "#ffffff",
};

const heroSubtitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#cbd5e1",
  fontSize: "15px",
  lineHeight: 1.7,
  maxWidth: "760px",
};