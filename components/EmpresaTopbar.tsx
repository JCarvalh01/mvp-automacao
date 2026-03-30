"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { getPartnerCompanySession, clearAllSessions } from "@/lib/session";

export default function EmpresaTopbar() {
  const router = useRouter();
  const pathname = usePathname();

  const session = getPartnerCompanySession();
  const empresaNome = session?.partnerCompany?.name || "Empresa Parceira";

  async function sair() {
    clearAllSessions();
    router.push("/login");
  }

  const navItems = [
    { href: "/dashboard-empresa", label: "Dashboard" },
    { href: "/clientes", label: "Clientes" },
    { href: "/emitir", label: "Emitir Nota" },
    { href: "/notas", label: "Notas" },
  ];

  return (
    <header style={headerStyle}>
      <div style={headerGlowStyle} />

      <div style={contentStyle}>
        <div style={brandAreaStyle}>
          <div style={logoStyle}>MVP</div>

          <div>
            <p style={miniTextStyle}>MVP_ AUTOMAÇÃO FISCAL</p>
            <h1 style={titleStyle}>Área da Empresa</h1>
            <p style={subtitleStyle}>{empresaNome}</p>
          </div>
        </div>

        <nav style={navStyle}>
          {navItems.map((item) => {
            const ativo =
              pathname === item.href ||
              (item.href !== "/dashboard-empresa" && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  ...navLinkStyle,
                  ...(ativo ? navLinkActiveStyle : {}),
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button onClick={sair} style={logoutButtonStyle}>
          Sair
        </button>
      </div>
    </header>
  );
}

const headerStyle: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
  background: "rgba(2, 6, 23, 0.72)",
  border: "1px solid rgba(59, 130, 246, 0.16)",
  borderRadius: "26px",
  padding: "20px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.34)",
  backdropFilter: "blur(16px)",
  marginBottom: "20px",
};

const headerGlowStyle: React.CSSProperties = {
  position: "absolute",
  top: "-80px",
  right: "-60px",
  width: "220px",
  height: "220px",
  borderRadius: "50%",
  background: "rgba(37, 99, 235, 0.12)",
  filter: "blur(70px)",
  pointerEvents: "none",
};

const contentStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "18px",
  flexWrap: "wrap",
};

const brandAreaStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
};

const logoStyle: React.CSSProperties = {
  width: "52px",
  height: "52px",
  borderRadius: "16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: "#fff",
  fontWeight: 800,
  fontSize: "16px",
  boxShadow: "0 14px 30px rgba(37,99,235,0.30)",
};

const miniTextStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "12px",
  letterSpacing: "0.18em",
  color: "#93c5fd",
  fontWeight: 700,
};

const titleStyle: React.CSSProperties = {
  margin: "4px 0 2px",
  fontSize: "24px",
  fontWeight: 800,
  color: "#ffffff",
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "14px",
  color: "#cbd5e1",
};

const navStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const navLinkStyle: React.CSSProperties = {
  textDecoration: "none",
  padding: "11px 14px",
  borderRadius: "12px",
  color: "#cbd5e1",
  background: "rgba(15, 23, 42, 0.82)",
  border: "1px solid rgba(148, 163, 184, 0.14)",
  fontWeight: 700,
  fontSize: "14px",
};

const navLinkActiveStyle: React.CSSProperties = {
  color: "#ffffff",
  background: "linear-gradient(135deg, rgba(37,99,235,0.22) 0%, rgba(59,130,246,0.18) 100%)",
  border: "1px solid rgba(59, 130, 246, 0.30)",
  boxShadow: "0 10px 24px rgba(37,99,235,0.18)",
};

const logoutButtonStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: "12px",
  border: "1px solid rgba(239, 68, 68, 0.26)",
  background: "rgba(127, 29, 29, 0.20)",
  color: "#fecaca",
  fontWeight: 700,
  cursor: "pointer",
};