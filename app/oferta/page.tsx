"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function OfertaPage() {
  const [viewportWidth, setViewportWidth] = useState(1200);

  useEffect(() => {
    const atualizarTela = () => {
      setViewportWidth(window.innerWidth);
    };

    atualizarTela();
    window.addEventListener("resize", atualizarTela);

    return () => window.removeEventListener("resize", atualizarTela);
  }, []);

  const isMobile = viewportWidth <= 768;

  const whatsappLink =
    "https://wa.me/5511982966310?text=Olá!%20Quero%20entender%20melhor%20como%20funciona%20a%20MVP%20Automação%20Fiscal.";

  return (
    <main style={pageStyle}>
      <div style={glowTopStyle} />
      <div style={glowMiddleStyle} />
      <div style={glowBottomStyle} />

      <div
        style={{
          ...containerStyle,
          padding: isMobile ? "18px 14px 42px" : "24px 20px 56px",
        }}
      >
        <header
          style={{
            ...headerStyle,
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : "center",
            gap: isMobile ? "12px" : "16px",
            marginBottom: isMobile ? "22px" : "28px",
          }}
        >
          <div style={brandRowStyle}>
            <div style={brandBadgeStyle}>MVP_ Automação Fiscal</div>
          </div>

          <nav
            style={{
              ...navStyle,
              width: isMobile ? "100%" : "auto",
              flexDirection: isMobile ? "column" : "row",
            }}
          >
            <Link
              href="/login"
              style={{
                ...navLinkStyle,
                width: isMobile ? "100%" : "auto",
              }}
            >
              Entrar
            </Link>

            <Link
              href="/cadastro-cliente"
              style={{
                ...navPrimaryStyle,
                width: isMobile ? "100%" : "auto",
              }}
            >
              Criar conta
            </Link>
          </nav>
        </header>

        <section
          style={{
            ...heroSectionStyle,
            gridTemplateColumns: isMobile ? "1fr" : "1.15fr 0.85fr",
            gap: isMobile ? "14px" : "18px",
            marginBottom: isMobile ? "22px" : "26px",
          }}
        >
          <div
            style={{
              ...heroContentStyle,
              padding: isMobile ? "24px 18px" : "34px 30px",
              borderRadius: isMobile ? "24px" : "30px",
            }}
          >
            <div style={heroPillStyle}>Solução para MEIs</div>

            <h1
              style={{
                ...heroTitleStyle,
                fontSize: isMobile ? "34px" : "52px",
                lineHeight: isMobile ? 1.08 : 1.02,
              }}
            >
              Emita suas NFS-e
              <br />
              com mais rapidez
              <br />e menos retrabalho
            </h1>

            <p
              style={{
                ...heroSubtitleStyle,
                marginTop: isMobile ? "14px" : "18px",
                fontSize: isMobile ? "15px" : "17px",
                lineHeight: isMobile ? 1.7 : 1.8,
              }}
            >
              Organize sua operação fiscal em um só lugar, acompanhe suas notas
              emitidas, mantenha PDF e XML centralizados e reduza o tempo gasto
              com processos manuais no dia a dia.
            </p>

            <div
              style={{
                ...heroActionsStyle,
                flexDirection: isMobile ? "column" : "row",
                gap: isMobile ? "10px" : "12px",
              }}
            >
              <Link
                href="/cadastro-cliente"
                style={{
                  ...heroPrimaryButtonStyle,
                  width: isMobile ? "100%" : "auto",
                }}
              >
                Criar conta e começar
              </Link>

              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...heroGhostButtonStyle,
                  width: isMobile ? "100%" : "auto",
                }}
              >
                Falar no WhatsApp
              </a>
            </div>

            <div
              style={{
                ...heroStatsGridStyle,
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: isMobile ? "10px" : "12px",
                marginTop: isMobile ? "18px" : "24px",
              }}
            >
              <div style={heroStatCardStyle}>
                <span style={heroStatLabelStyle}>Emissão</span>
                <strong style={heroStatValueStyle}>NFS-e mais rápida</strong>
              </div>

              <div style={heroStatCardStyle}>
                <span style={heroStatLabelStyle}>Arquivos</span>
                <strong style={heroStatValueStyle}>PDF e XML organizados</strong>
              </div>

              <div style={heroStatCardStyle}>
                <span style={heroStatLabelStyle}>Rotina</span>
                <strong style={heroStatValueStyle}>Menos trabalho manual</strong>
              </div>
            </div>
          </div>

          <div style={heroPanelWrapperStyle}>
            <div
              style={{
                ...heroPanelStyle,
                padding: isMobile ? "20px 18px" : "24px",
                borderRadius: isMobile ? "24px" : "30px",
              }}
            >
              <div style={panelTopStyle}>
                <span style={panelMiniStyle}>Como funciona</span>
                <span style={panelStatusStyle}>Fluxo simples</span>
              </div>

              <div
                style={{
                  ...stepsGridStyle,
                  gridTemplateColumns: "1fr",
                }}
              >
                <div style={stepCardStyle}>
                  <span style={stepNumberStyle}>1</span>
                  <div>
                    <span style={stepLabelStyle}>Crie sua conta</span>
                    <strong style={stepValueStyle}>
                      Faça seu cadastro na plataforma
                    </strong>
                  </div>
                </div>

                <div style={stepCardStyle}>
                  <span style={stepNumberStyle}>2</span>
                  <div>
                    <span style={stepLabelStyle}>Escolha o plano</span>
                    <strong style={stepValueStyle}>
                      Selecione a opção ideal para sua rotina
                    </strong>
                  </div>
                </div>

                <div style={stepCardStyle}>
                  <span style={stepNumberStyle}>3</span>
                  <div>
                    <span style={stepLabelStyle}>Comece a usar</span>
                    <strong style={stepValueStyle}>
                      Emita notas e acompanhe tudo em um só lugar
                    </strong>
                  </div>
                </div>
              </div>

              <div style={panelFooterStyle}>
                Dependendo do plano, a operação pode contar com suporte
                especializado e até opção com contador.
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            ...featuresSectionStyle,
            marginBottom: isMobile ? "22px" : "26px",
          }}
        >
          <div style={sectionIntroStyle}>
            <div style={sectionBadgeStyle}>Por que usar</div>
            <h2
              style={{
                ...sectionTitleStyle,
                fontSize: isMobile ? "28px" : "34px",
                lineHeight: isMobile ? 1.15 : 1.2,
              }}
            >
              Mais controle para a rotina fiscal
            </h2>
            <p
              style={{
                ...sectionTextStyle,
                fontSize: isMobile ? "14px" : "15px",
                lineHeight: isMobile ? 1.7 : 1.8,
              }}
            >
              A proposta é simples: facilitar sua operação, dar mais organização
              e deixar sua emissão fiscal em um ambiente mais profissional.
            </p>
          </div>

          <div
            style={{
              ...featuresGridStyle,
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(3, minmax(0, 1fr))",
              gap: isMobile ? "12px" : "16px",
            }}
          >
            <article
              style={{
                ...featureCardStyle,
                padding: isMobile ? "18px" : "22px",
              }}
            >
              <span style={featureTagStyle}>Emissão</span>
              <h3
                style={{
                  ...featureTitleStyle,
                  fontSize: isMobile ? "20px" : "22px",
                }}
              >
                NFS-e com mais agilidade
              </h3>
              <p style={featureTextStyle}>
                Reduza o esforço operacional e tenha uma rotina mais direta para
                emissão das suas notas fiscais.
              </p>
            </article>

            <article
              style={{
                ...featureCardStyle,
                padding: isMobile ? "18px" : "22px",
              }}
            >
              <span style={featureTagStyle}>Organização</span>
              <h3
                style={{
                  ...featureTitleStyle,
                  fontSize: isMobile ? "20px" : "22px",
                }}
              >
                PDF e XML centralizados
              </h3>
              <p style={featureTextStyle}>
                Mantenha seus arquivos organizados e encontre suas notas com
                mais facilidade dentro da plataforma.
              </p>
            </article>

            <article
              style={{
                ...featureCardStyle,
                padding: isMobile ? "18px" : "22px",
              }}
            >
              <span style={featureTagStyle}>Controle</span>
              <h3
                style={{
                  ...featureTitleStyle,
                  fontSize: isMobile ? "20px" : "22px",
                }}
              >
                Tudo em um só lugar
              </h3>
              <p style={featureTextStyle}>
                Visualize histórico, acompanhe sua operação e trabalhe com mais
                clareza no dia a dia fiscal.
              </p>
            </article>
          </div>
        </section>

        <section
          style={{
            ...salesSectionStyle,
            marginBottom: isMobile ? "22px" : "26px",
          }}
        >
          <div
            style={{
              ...salesCardStyle,
              padding: isMobile ? "20px 18px" : "26px",
            }}
          >
            <div style={salesTextWrapStyle}>
              <span style={salesMiniStyle}>Para quem faz sentido</span>
              <h2
                style={{
                  ...salesTitleStyle,
                  fontSize: isMobile ? "28px" : "32px",
                  lineHeight: isMobile ? 1.15 : 1.2,
                }}
              >
                Pensado para quem quer mais praticidade na emissão fiscal
              </h2>
              <p style={salesTextStyle}>
                A página é focada em MEIs, mas a estrutura da plataforma também
                atende operações que precisam de mais suporte, acompanhamento e
                organização conforme o plano escolhido.
              </p>
            </div>

            <div
              style={{
                ...salesGridStyle,
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: isMobile ? "12px" : "14px",
              }}
            >
              <div style={salesItemStyle}>
                <strong style={salesItemTitleStyle}>Mais rapidez</strong>
                <p style={salesItemTextStyle}>
                  Menos tempo em tarefas repetitivas e mais agilidade no
                  acompanhamento das suas notas.
                </p>
              </div>

              <div style={salesItemStyle}>
                <strong style={salesItemTitleStyle}>Mais organização</strong>
                <p style={salesItemTextStyle}>
                  Histórico, PDF e XML reunidos em um ambiente centralizado e
                  fácil de acompanhar.
                </p>
              </div>

              <div style={salesItemStyle}>
                <strong style={salesItemTitleStyle}>Mais apoio</strong>
                <p style={salesItemTextStyle}>
                  Dependendo do plano, a operação pode contar com suporte
                  especializado e até opção com contador.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section style={ctaSectionStyle}>
          <div
            style={{
              ...ctaCardStyle,
              flexDirection: isMobile ? "column" : "row",
              alignItems: isMobile ? "stretch" : "center",
              padding: isMobile ? "20px 18px" : "26px",
            }}
          >
            <div>
              <span style={ctaMiniStyle}>Comece agora</span>
              <h2
                style={{
                  ...ctaTitleStyle,
                  fontSize: isMobile ? "28px" : "32px",
                  lineHeight: isMobile ? 1.15 : 1.2,
                }}
              >
                Crie sua conta e avance para a escolha do plano
              </h2>
              <p style={ctaTextStyle}>
                O próximo passo é simples: faça seu cadastro, entre na
                plataforma e siga para a etapa de escolha do plano ideal para
                sua operação.
              </p>
            </div>

            <div
              style={{
                ...ctaButtonsStyle,
                width: isMobile ? "100%" : "auto",
                flexDirection: isMobile ? "column" : "row",
              }}
            >
              <Link
                href="/cadastro-cliente"
                style={{
                  ...ctaPrimaryButtonStyle,
                  width: isMobile ? "100%" : "auto",
                }}
              >
                Criar conta e começar
              </Link>

              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...ctaGhostBlueButtonStyle,
                  width: isMobile ? "100%" : "auto",
                }}
              >
                Falar no WhatsApp
              </a>
            </div>
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
  color: "#ffffff",
  fontFamily: "Arial, sans-serif",
};

const glowTopStyle: React.CSSProperties = {
  position: "absolute",
  top: "-140px",
  left: "-120px",
  width: "340px",
  height: "340px",
  borderRadius: "50%",
  background: "rgba(59,130,246,0.18)",
  filter: "blur(95px)",
  pointerEvents: "none",
};

const glowMiddleStyle: React.CSSProperties = {
  position: "absolute",
  top: "25%",
  right: "-120px",
  width: "320px",
  height: "320px",
  borderRadius: "50%",
  background: "rgba(29,78,216,0.16)",
  filter: "blur(95px)",
  pointerEvents: "none",
};

const glowBottomStyle: React.CSSProperties = {
  position: "absolute",
  bottom: "-140px",
  left: "20%",
  width: "340px",
  height: "340px",
  borderRadius: "50%",
  background: "rgba(37,99,235,0.12)",
  filter: "blur(100px)",
  pointerEvents: "none",
};

const containerStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  maxWidth: "1180px",
  margin: "0 auto",
  padding: "24px 20px 56px",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "32px",
};

const brandRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const brandBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 14px",
  borderRadius: "999px",
  background: "rgba(59,130,246,0.14)",
  border: "1px solid rgba(59,130,246,0.20)",
  color: "#bfdbfe",
  fontSize: "12px",
  fontWeight: 700,
};

const navStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const navLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "12px 16px",
  borderRadius: "14px",
  background: "rgba(15,23,42,0.82)",
  border: "1px solid rgba(148,163,184,0.18)",
  color: "#ffffff",
  fontWeight: 700,
};

const navPrimaryStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "12px 16px",
  borderRadius: "14px",
  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  color: "#ffffff",
  fontWeight: 700,
  boxShadow: "0 12px 28px rgba(37,99,235,0.30)",
};

const heroSectionStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.15fr 0.85fr",
  gap: "18px",
  alignItems: "stretch",
  marginBottom: "26px",
};

const heroContentStyle: React.CSSProperties = {
  padding: "34px 30px",
  borderRadius: "30px",
  background:
    "linear-gradient(135deg, rgba(2,6,23,0.82) 0%, rgba(8,17,40,0.92) 100%)",
  border: "1px solid rgba(59,130,246,0.16)",
  boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
  backdropFilter: "blur(16px)",
};

const heroPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 14px",
  borderRadius: "999px",
  background: "rgba(16,185,129,0.12)",
  border: "1px solid rgba(16,185,129,0.20)",
  color: "#a7f3d0",
  fontSize: "12px",
  fontWeight: 700,
  marginBottom: "16px",
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "52px",
  lineHeight: 1.02,
  fontWeight: 800,
  letterSpacing: "-0.03em",
  color: "#ffffff",
};

const heroSubtitleStyle: React.CSSProperties = {
  margin: "18px 0 0",
  maxWidth: "720px",
  fontSize: "17px",
  lineHeight: 1.8,
  color: "#cbd5e1",
};

const heroActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "24px",
};

const heroPrimaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "15px 18px",
  borderRadius: "16px",
  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  color: "#ffffff",
  fontWeight: 800,
  boxShadow: "0 14px 30px rgba(37,99,235,0.30)",
};

const heroGhostButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "15px 18px",
  borderRadius: "16px",
  background: "rgba(59,130,246,0.08)",
  border: "1px solid rgba(59,130,246,0.18)",
  color: "#dbeafe",
  fontWeight: 700,
};

const heroStatsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "12px",
  marginTop: "24px",
};

const heroStatCardStyle: React.CSSProperties = {
  padding: "16px",
  borderRadius: "18px",
  background: "rgba(15,23,42,0.86)",
  border: "1px solid rgba(59,130,246,0.12)",
};

const heroStatLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#93c5fd",
  marginBottom: "6px",
};

const heroStatValueStyle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  color: "#ffffff",
};

const heroPanelWrapperStyle: React.CSSProperties = {
  display: "flex",
};

const heroPanelStyle: React.CSSProperties = {
  width: "100%",
  padding: "24px",
  borderRadius: "30px",
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.90) 0%, rgba(15,23,42,0.92) 100%)",
  border: "1px solid rgba(59,130,246,0.16)",
  boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
  backdropFilter: "blur(16px)",
};

const panelTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "18px",
};

const panelMiniStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#93c5fd",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 700,
};

const panelStatusStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 12px",
  borderRadius: "999px",
  background: "rgba(16,185,129,0.12)",
  border: "1px solid rgba(16,185,129,0.20)",
  color: "#a7f3d0",
  fontSize: "12px",
  fontWeight: 700,
};

const stepsGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
};

const stepCardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  padding: "16px",
  borderRadius: "18px",
  background: "rgba(15,23,42,0.86)",
  border: "1px solid rgba(59,130,246,0.12)",
};

const stepNumberStyle: React.CSSProperties = {
  minWidth: "34px",
  height: "34px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  background: "rgba(59,130,246,0.16)",
  border: "1px solid rgba(59,130,246,0.20)",
  color: "#dbeafe",
  fontSize: "14px",
  fontWeight: 800,
};

const stepLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#93c5fd",
  marginBottom: "6px",
};

const stepValueStyle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  color: "#ffffff",
  lineHeight: 1.5,
};

const panelFooterStyle: React.CSSProperties = {
  marginTop: "16px",
  padding: "14px 16px",
  borderRadius: "18px",
  background: "rgba(59,130,246,0.10)",
  border: "1px solid rgba(59,130,246,0.14)",
  color: "#cbd5e1",
  fontSize: "14px",
  lineHeight: 1.7,
};

const featuresSectionStyle: React.CSSProperties = {
  marginTop: "10px",
  marginBottom: "26px",
};

const sectionIntroStyle: React.CSSProperties = {
  marginBottom: "16px",
};

const sectionBadgeStyle: React.CSSProperties = {
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

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "34px",
  fontWeight: 800,
  color: "#ffffff",
};

const sectionTextStyle: React.CSSProperties = {
  margin: "12px 0 0",
  color: "#cbd5e1",
  fontSize: "15px",
  lineHeight: 1.8,
  maxWidth: "760px",
};

const featuresGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "16px",
};

const featureCardStyle: React.CSSProperties = {
  padding: "22px",
  borderRadius: "24px",
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.90) 0%, rgba(15,23,42,0.92) 100%)",
  border: "1px solid rgba(59,130,246,0.14)",
  boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
};

const featureTagStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "7px 12px",
  borderRadius: "999px",
  background: "rgba(59,130,246,0.12)",
  border: "1px solid rgba(59,130,246,0.16)",
  color: "#bfdbfe",
  fontSize: "12px",
  fontWeight: 700,
  marginBottom: "14px",
};

const featureTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "22px",
  fontWeight: 800,
  color: "#ffffff",
  lineHeight: 1.2,
};

const featureTextStyle: React.CSSProperties = {
  margin: "12px 0 0",
  fontSize: "15px",
  lineHeight: 1.8,
  color: "#cbd5e1",
};

const salesSectionStyle: React.CSSProperties = {
  marginBottom: "26px",
};

const salesCardStyle: React.CSSProperties = {
  padding: "26px",
  borderRadius: "28px",
  background:
    "linear-gradient(135deg, rgba(2,6,23,0.86) 0%, rgba(8,17,40,0.94) 100%)",
  border: "1px solid rgba(59,130,246,0.16)",
  boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
};

const salesTextWrapStyle: React.CSSProperties = {
  marginBottom: "18px",
};

const salesMiniStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#93c5fd",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 700,
  marginBottom: "8px",
};

const salesTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "32px",
  fontWeight: 800,
  color: "#ffffff",
};

const salesTextStyle: React.CSSProperties = {
  margin: "12px 0 0",
  fontSize: "15px",
  color: "#cbd5e1",
  lineHeight: 1.8,
  maxWidth: "720px",
};

const salesGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "14px",
};

const salesItemStyle: React.CSSProperties = {
  padding: "18px",
  borderRadius: "20px",
  background: "rgba(15,23,42,0.86)",
  border: "1px solid rgba(59,130,246,0.12)",
};

const salesItemTitleStyle: React.CSSProperties = {
  display: "block",
  fontSize: "18px",
  fontWeight: 800,
  color: "#ffffff",
  marginBottom: "8px",
};

const salesItemTextStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "14px",
  lineHeight: 1.7,
  color: "#cbd5e1",
};

const ctaSectionStyle: React.CSSProperties = {
  marginTop: "8px",
};

const ctaCardStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  padding: "26px",
  borderRadius: "28px",
  background:
    "linear-gradient(135deg, rgba(2,6,23,0.86) 0%, rgba(8,17,40,0.94) 100%)",
  border: "1px solid rgba(59,130,246,0.16)",
  boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
};

const ctaMiniStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#93c5fd",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 700,
  marginBottom: "8px",
};

const ctaTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "32px",
  fontWeight: 800,
  color: "#ffffff",
};

const ctaTextStyle: React.CSSProperties = {
  margin: "12px 0 0",
  fontSize: "15px",
  color: "#cbd5e1",
  lineHeight: 1.8,
  maxWidth: "640px",
};

const ctaButtonsStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const ctaPrimaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "14px 18px",
  borderRadius: "16px",
  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  color: "#ffffff",
  fontWeight: 800,
  boxShadow: "0 14px 30px rgba(37,99,235,0.30)",
};

const ctaGhostBlueButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "14px 18px",
  borderRadius: "16px",
  background: "rgba(59,130,246,0.08)",
  border: "1px solid rgba(59,130,246,0.18)",
  color: "#dbeafe",
  fontWeight: 700,
};