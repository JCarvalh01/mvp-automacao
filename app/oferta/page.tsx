"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";

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
            gridTemplateColumns: isMobile ? "1fr" : "1.12fr 0.88fr",
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
            <div style={heroPillStyle}>Solução para MEIs e microempreendedores</div>

            <h1
              style={{
                ...heroTitleStyle,
                fontSize: isMobile ? "34px" : "52px",
                lineHeight: isMobile ? 1.08 : 1.02,
              }}
            >
              Pare de emitir nota manual
              <br />
              e tenha mais controle
              <br />
              do seu faturamento
            </h1>

            <p
              style={{
                ...heroSubtitleStyle,
                marginTop: isMobile ? "14px" : "18px",
                fontSize: isMobile ? "15px" : "17px",
                lineHeight: isMobile ? 1.7 : 1.8,
              }}
            >
              A MVP automatiza suas notas, organiza tudo em um só lugar e ajuda
              você a acompanhar seu faturamento mensal, trimestral e anual. No
              plano completo, sua operação ainda pode contar com suporte mais
              completo e opção com contador.
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
                Começar agora
              </Link>

              <a
                href="#planos"
                style={{
                  ...heroGhostButtonStyle,
                  width: isMobile ? "100%" : "auto",
                }}
              >
                Escolher meu plano
              </a>
            </div>

            <div style={heroMicroTextStyle}>
              sem compromisso • configuração rápida • acesso imediato
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
                <strong style={heroStatValueStyle}>NFS-e com mais rapidez</strong>
              </div>

              <div style={heroStatCardStyle}>
                <span style={heroStatLabelStyle}>Arquivos</span>
                <strong style={heroStatValueStyle}>PDF e XML organizados</strong>
              </div>

              <div style={heroStatCardStyle}>
                <span style={heroStatLabelStyle}>Faturamento</span>
                <strong style={heroStatValueStyle}>Visão mensal, trimestral e anual</strong>
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

              <div style={stepsGridStyle}>
                <div style={stepCardStyle}>
                  <span style={stepNumberStyle}>1</span>
                  <div>
                    <span style={stepLabelStyle}>Crie sua conta</span>
                    <strong style={stepValueStyle}>
                      Faça seu cadastro e acesse a plataforma
                    </strong>
                  </div>
                </div>

                <div style={stepCardStyle}>
                  <span style={stepNumberStyle}>2</span>
                  <div>
                    <span style={stepLabelStyle}>Escolha seu plano</span>
                    <strong style={stepValueStyle}>
                      Selecione a opção ideal para sua rotina fiscal
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
                Você centraliza emissão, histórico, PDF, XML e faturamento em um
                ambiente mais organizado, com possibilidade de mais apoio
                conforme o plano escolhido.
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            ...problemSectionStyle,
            marginBottom: isMobile ? "22px" : "26px",
          }}
        >
          <div
            style={{
              ...problemCardStyle,
              padding: isMobile ? "20px 18px" : "24px",
            }}
          >
            <span style={problemMiniStyle}>Hoje muitos MEIs ainda fazem assim</span>
            <h2
              style={{
                ...problemTitleStyle,
                fontSize: isMobile ? "28px" : "34px",
                lineHeight: isMobile ? 1.15 : 1.2,
              }}
            >
              O problema não é só emitir a nota. É ter que repetir isso todo mês.
            </h2>

            <div
              style={{
                ...problemGridStyle,
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: isMobile ? "12px" : "14px",
              }}
            >
              <div style={problemItemStyle}>
                <strong style={problemItemTitleStyle}>Tempo perdido</strong>
                <p style={problemItemTextStyle}>
                  Entrar no portal, preencher tudo manualmente e repetir o mesmo
                  processo consome tempo demais.
                </p>
              </div>

              <div style={problemItemStyle}>
                <strong style={problemItemTitleStyle}>Pouca organização</strong>
                <p style={problemItemTextStyle}>
                  Sem centralização, PDF, XML, histórico e faturamento ficam
                  espalhados e difíceis de acompanhar.
                </p>
              </div>

              <div style={problemItemStyle}>
                <strong style={problemItemTitleStyle}>Mais risco operacional</strong>
                <p style={problemItemTextStyle}>
                  Quando tudo é manual, o risco de erro e retrabalho na rotina
                  fiscal fica muito maior.
                </p>
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
            <div style={sectionBadgeStyle}>O que você ganha</div>
            <h2
              style={{
                ...sectionTitleStyle,
                fontSize: isMobile ? "28px" : "34px",
                lineHeight: isMobile ? 1.15 : 1.2,
              }}
            >
              Mais controle para sua rotina fiscal
            </h2>
            <p
              style={{
                ...sectionTextStyle,
                fontSize: isMobile ? "14px" : "15px",
                lineHeight: isMobile ? 1.7 : 1.8,
              }}
            >
              A proposta da MVP é simples: tirar sua operação do manual e
              colocar tudo em um ambiente mais rápido, claro e profissional.
            </p>
          </div>

          <div
            style={{
              ...featuresGridStyle,
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
                Emita suas notas com muito mais rapidez e reduza o esforço em
                tarefas repetitivas do dia a dia.
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
                Mantenha suas notas emitidas e os arquivos fiscais organizados
                em um único lugar, de forma muito mais simples.
              </p>
            </article>

            <article
              style={{
                ...featureCardStyle,
                padding: isMobile ? "18px" : "22px",
              }}
            >
              <span style={featureTagStyle}>Faturamento</span>
              <h3
                style={{
                  ...featureTitleStyle,
                  fontSize: isMobile ? "20px" : "22px",
                }}
              >
                Visão do seu negócio
              </h3>
              <p style={featureTextStyle}>
                Acompanhe faturamento mensal, trimestral e anual com dashboard
                personalizado e visão mais clara da sua operação.
              </p>
            </article>
          </div>
        </section>

        <section
          id="planos"
          style={{
            ...plansSectionStyle,
            marginBottom: isMobile ? "22px" : "26px",
          }}
        >
          <div style={sectionIntroStyle}>
            <div style={sectionBadgeStyle}>Planos</div>
            <h2
              style={{
                ...sectionTitleStyle,
                fontSize: isMobile ? "28px" : "34px",
                lineHeight: isMobile ? 1.15 : 1.2,
              }}
            >
              Escolha o plano ideal para sua operação
            </h2>
            <p
              style={{
                ...sectionTextStyle,
                fontSize: isMobile ? "14px" : "15px",
                lineHeight: isMobile ? 1.7 : 1.8,
              }}
            >
              Se você quer começar com mais organização, o Essencial já resolve.
              Se quer liberdade, automação completa e um ambiente mais forte de
              controle, o Full é o mais indicado.
            </p>
          </div>

          <div
            style={{
              ...plansGridStyle,
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(2, minmax(0, 1fr))",
              gap: isMobile ? "14px" : "18px",
            }}
          >
            <div style={planCardStyle}>
              <span style={planMiniStyle}>Para começar</span>
              <h3 style={planTitleStyle}>Essencial</h3>
              <div style={planPriceStyle}>R$ 29,90</div>
              <p style={planTextStyle}>
                Ideal para quem quer sair do manual e começar com mais
                organização no dia a dia fiscal.
              </p>

              <div style={planListStyle}>
                <div style={planItemStyle}>✔ Até 10 notas por mês</div>
                <div style={planItemStyle}>✔ Emissão rápida e simplificada</div>
                <div style={planItemStyle}>✔ Histórico de notas emitidas</div>
                <div style={planItemStyle}>✔ PDF e XML organizados</div>
                <div style={planItemStyle}>✔ Controle básico de faturamento</div>
                <div style={planItemStyle}>✔ Suporte da plataforma</div>
              </div>

              <div style={planObsStyle}>
                Esse plano conta com suporte, mas não inclui acompanhamento com contador.
              </div>

              <Link href="/cadastro-cliente" style={planPrimaryButtonStyle}>
                Assinar Essencial
              </Link>
            </div>

            <div style={planFeaturedCardStyle}>
              <span style={planFeaturedMiniStyle}>Mais completo</span>
              <h3 style={planTitleStyle}>Full</h3>
              <div style={planPriceStyle}>R$ 59,90</div>
              <p style={planTextStyle}>
                Para quem quer resolver a operação fiscal de vez, com mais
                controle, liberdade e visão completa do negócio.
              </p>

              <div style={planListStyle}>
                <div style={planItemStyle}>✔ Notas fiscais ilimitadas</div>
                <div style={planItemStyle}>✔ Emissão automática completa</div>
                <div style={planItemStyle}>✔ Dashboard completo e personalizado</div>
                <div style={planItemStyle}>✔ Histórico de notas emitidas</div>
                <div style={planItemStyle}>✔ Controle operacional</div>
                <div style={planItemStyle}>
                  ✔ Faturamento mensal, trimestral e anual
                </div>
                <div style={planItemStyle}>✔ PDF e XML organizados</div>
                <div style={planItemStyle}>✔ Suporte mais completo</div>
                <div style={planItemStyle}>✔ Opção com contador</div>
              </div>

              <div style={planObsHighlightStyle}>
                É o plano mais indicado para quem quer mais tranquilidade e menos
                dependência da emissão manual.
              </div>

              <Link href="/cadastro-cliente" style={planFeaturedButtonStyle}>
                Assinar Full
              </Link>
            </div>
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
              <span style={salesMiniStyle}>Por que isso faz sentido</span>
              <h2
                style={{
                  ...salesTitleStyle,
                  fontSize: isMobile ? "28px" : "32px",
                  lineHeight: isMobile ? 1.15 : 1.2,
                }}
              >
                Menos retrabalho, mais clareza e mais apoio
              </h2>
              <p style={salesTextStyle}>
                A MVP foi pensada para quem quer ganhar tempo, organizar melhor a
                rotina fiscal e acompanhar a operação de forma mais profissional.
              </p>
            </div>

            <div
              style={{
                ...salesGridStyle,
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: isMobile ? "12px" : "14px",
              }}
            >
              <div style={salesItemStyle}>
                <strong style={salesItemTitleStyle}>Mais rapidez</strong>
                <p style={salesItemTextStyle}>
                  Menos tempo em tarefas repetitivas e mais agilidade para emitir
                  e acompanhar suas notas.
                </p>
              </div>

              <div style={salesItemStyle}>
                <strong style={salesItemTitleStyle}>Mais organização</strong>
                <p style={salesItemTextStyle}>
                  Histórico, PDF, XML e faturamento reunidos em um ambiente
                  centralizado e fácil de acompanhar.
                </p>
              </div>

              <div style={salesItemStyle}>
                <strong style={salesItemTitleStyle}>Mais apoio</strong>
                <p style={salesItemTextStyle}>
                  No plano mais completo, sua operação ainda pode contar com
                  opção de apoio com contador.
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
                Pare de emitir manualmente e comece com mais controle
              </h2>
              <p style={ctaTextStyle}>
                Faça seu cadastro, escolha o plano ideal e tenha sua rotina
                fiscal em um ambiente mais rápido, organizado e profissional.
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
                Quero começar agora
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
                Tirar dúvida rápida no WhatsApp
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  position: "relative",
  overflow: "hidden",
  background:
    "radial-gradient(circle at top, rgba(37,99,235,0.20) 0%, rgba(2,6,23,1) 30%, rgba(2,6,23,1) 100%)",
  color: "#ffffff",
  fontFamily: "Arial, sans-serif",
};

const glowTopStyle: CSSProperties = {
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

const glowMiddleStyle: CSSProperties = {
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

const glowBottomStyle: CSSProperties = {
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

const containerStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  maxWidth: "1180px",
  margin: "0 auto",
  padding: "24px 20px 56px",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "32px",
};

const brandRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const brandBadgeStyle: CSSProperties = {
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

const navStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const navLinkStyle: CSSProperties = {
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

const navPrimaryStyle: CSSProperties = {
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

const heroSectionStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.12fr 0.88fr",
  gap: "18px",
  alignItems: "stretch",
  marginBottom: "26px",
};

const heroContentStyle: CSSProperties = {
  padding: "34px 30px",
  borderRadius: "30px",
  background:
    "linear-gradient(135deg, rgba(2,6,23,0.82) 0%, rgba(8,17,40,0.92) 100%)",
  border: "1px solid rgba(59,130,246,0.16)",
  boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
  backdropFilter: "blur(16px)",
};

const heroPillStyle: CSSProperties = {
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

const heroTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "52px",
  lineHeight: 1.02,
  fontWeight: 800,
  letterSpacing: "-0.03em",
  color: "#ffffff",
};

const heroSubtitleStyle: CSSProperties = {
  margin: "18px 0 0",
  maxWidth: "720px",
  fontSize: "17px",
  lineHeight: 1.8,
  color: "#cbd5e1",
};

const heroActionsStyle: CSSProperties = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "24px",
};

const heroPrimaryButtonStyle: CSSProperties = {
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

const heroGhostButtonStyle: CSSProperties = {
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

const heroMicroTextStyle: CSSProperties = {
  marginTop: "10px",
  fontSize: "13px",
  color: "#94a3b8",
};

const heroStatsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "12px",
  marginTop: "24px",
};

const heroStatCardStyle: CSSProperties = {
  padding: "16px",
  borderRadius: "18px",
  background: "rgba(15,23,42,0.86)",
  border: "1px solid rgba(59,130,246,0.12)",
};

const heroStatLabelStyle: CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#93c5fd",
  marginBottom: "6px",
};

const heroStatValueStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  color: "#ffffff",
};

const heroPanelWrapperStyle: CSSProperties = {
  display: "flex",
};

const heroPanelStyle: CSSProperties = {
  width: "100%",
  padding: "24px",
  borderRadius: "30px",
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.90) 0%, rgba(15,23,42,0.92) 100%)",
  border: "1px solid rgba(59,130,246,0.16)",
  boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
  backdropFilter: "blur(16px)",
};

const panelTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "18px",
};

const panelMiniStyle: CSSProperties = {
  fontSize: "12px",
  color: "#93c5fd",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 700,
};

const panelStatusStyle: CSSProperties = {
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

const stepsGridStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const stepCardStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  padding: "16px",
  borderRadius: "18px",
  background: "rgba(15,23,42,0.86)",
  border: "1px solid rgba(59,130,246,0.12)",
};

const stepNumberStyle: CSSProperties = {
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

const stepLabelStyle: CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#93c5fd",
  marginBottom: "6px",
};

const stepValueStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  color: "#ffffff",
  lineHeight: 1.5,
};

const panelFooterStyle: CSSProperties = {
  marginTop: "16px",
  padding: "14px 16px",
  borderRadius: "18px",
  background: "rgba(59,130,246,0.10)",
  border: "1px solid rgba(59,130,246,0.14)",
  color: "#cbd5e1",
  fontSize: "14px",
  lineHeight: 1.7,
};

const problemSectionStyle: CSSProperties = {
  marginBottom: "26px",
};

const problemCardStyle: CSSProperties = {
  padding: "24px",
  borderRadius: "28px",
  background:
    "linear-gradient(135deg, rgba(2,6,23,0.88) 0%, rgba(8,17,40,0.96) 100%)",
  border: "1px solid rgba(59,130,246,0.16)",
  boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
};

const problemMiniStyle: CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#fca5a5",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 700,
  marginBottom: "8px",
};

const problemTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "34px",
  fontWeight: 800,
  color: "#ffffff",
};

const problemGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "14px",
  marginTop: "18px",
};

const problemItemStyle: CSSProperties = {
  padding: "18px",
  borderRadius: "20px",
  background: "rgba(15,23,42,0.86)",
  border: "1px solid rgba(59,130,246,0.12)",
};

const problemItemTitleStyle: CSSProperties = {
  display: "block",
  fontSize: "18px",
  fontWeight: 800,
  color: "#ffffff",
  marginBottom: "8px",
};

const problemItemTextStyle: CSSProperties = {
  margin: 0,
  fontSize: "14px",
  lineHeight: 1.7,
  color: "#cbd5e1",
};

const featuresSectionStyle: CSSProperties = {
  marginTop: "10px",
  marginBottom: "26px",
};

const sectionIntroStyle: CSSProperties = {
  marginBottom: "16px",
};

const sectionBadgeStyle: CSSProperties = {
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

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "34px",
  fontWeight: 800,
  color: "#ffffff",
};

const sectionTextStyle: CSSProperties = {
  margin: "12px 0 0",
  color: "#cbd5e1",
  fontSize: "15px",
  lineHeight: 1.8,
  maxWidth: "760px",
};

const featuresGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "16px",
};

const featureCardStyle: CSSProperties = {
  padding: "22px",
  borderRadius: "24px",
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.90) 0%, rgba(15,23,42,0.92) 100%)",
  border: "1px solid rgba(59,130,246,0.14)",
  boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
};

const featureTagStyle: CSSProperties = {
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

const featureTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "22px",
  fontWeight: 800,
  color: "#ffffff",
  lineHeight: 1.2,
};

const featureTextStyle: CSSProperties = {
  margin: "12px 0 0",
  fontSize: "15px",
  lineHeight: 1.8,
  color: "#cbd5e1",
};

const plansSectionStyle: CSSProperties = {
  marginBottom: "26px",
};

const plansGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "18px",
};

const planCardStyle: CSSProperties = {
  padding: "24px",
  borderRadius: "28px",
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.90) 0%, rgba(15,23,42,0.92) 100%)",
  border: "1px solid rgba(59,130,246,0.14)",
  boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
};

const planFeaturedCardStyle: CSSProperties = {
  padding: "24px",
  borderRadius: "28px",
  background:
    "linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(5,46,22,0.96) 100%)",
  border: "1px solid rgba(16,185,129,0.24)",
  boxShadow: "0 22px 50px rgba(0,0,0,0.32)",
};

const planMiniStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 14px",
  borderRadius: "999px",
  background: "rgba(59,130,246,0.12)",
  border: "1px solid rgba(59,130,246,0.16)",
  color: "#bfdbfe",
  fontSize: "12px",
  fontWeight: 700,
  marginBottom: "14px",
};

const planFeaturedMiniStyle: CSSProperties = {
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
  marginBottom: "14px",
};

const planTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "30px",
  fontWeight: 800,
  color: "#ffffff",
};

const planPriceStyle: CSSProperties = {
  fontSize: "48px",
  fontWeight: 900,
  color: "#ffffff",
  marginTop: "10px",
  lineHeight: 1,
};

const planTextStyle: CSSProperties = {
  margin: "14px 0 0",
  fontSize: "15px",
  lineHeight: 1.8,
  color: "#cbd5e1",
};

const planListStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
  marginTop: "18px",
};

const planItemStyle: CSSProperties = {
  padding: "14px 16px",
  borderRadius: "16px",
  background: "rgba(15,23,42,0.76)",
  border: "1px solid rgba(59,130,246,0.12)",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 700,
};

const planObsStyle: CSSProperties = {
  marginTop: "16px",
  fontSize: "13px",
  lineHeight: 1.7,
  color: "#94a3b8",
};

const planObsHighlightStyle: CSSProperties = {
  marginTop: "16px",
  fontSize: "13px",
  lineHeight: 1.7,
  color: "#d1fae5",
};

const planPrimaryButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  marginTop: "20px",
  padding: "15px 18px",
  width: "100%",
  borderRadius: "16px",
  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  color: "#ffffff",
  fontWeight: 800,
  boxShadow: "0 14px 30px rgba(37,99,235,0.30)",
  boxSizing: "border-box",
};

const planFeaturedButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  marginTop: "20px",
  padding: "15px 18px",
  width: "100%",
  borderRadius: "16px",
  background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
  color: "#ffffff",
  fontWeight: 800,
  boxShadow: "0 14px 30px rgba(34,197,94,0.30)",
  boxSizing: "border-box",
};

const salesSectionStyle: CSSProperties = {
  marginBottom: "26px",
};

const salesCardStyle: CSSProperties = {
  padding: "26px",
  borderRadius: "28px",
  background:
    "linear-gradient(135deg, rgba(2,6,23,0.86) 0%, rgba(8,17,40,0.94) 100%)",
  border: "1px solid rgba(59,130,246,0.16)",
  boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
};

const salesTextWrapStyle: CSSProperties = {
  marginBottom: "18px",
};

const salesMiniStyle: CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#93c5fd",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 700,
  marginBottom: "8px",
};

const salesTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "32px",
  fontWeight: 800,
  color: "#ffffff",
};

const salesTextStyle: CSSProperties = {
  margin: "12px 0 0",
  fontSize: "15px",
  color: "#cbd5e1",
  lineHeight: 1.8,
  maxWidth: "720px",
};

const salesGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "14px",
};

const salesItemStyle: CSSProperties = {
  padding: "18px",
  borderRadius: "20px",
  background: "rgba(15,23,42,0.86)",
  border: "1px solid rgba(59,130,246,0.12)",
};

const salesItemTitleStyle: CSSProperties = {
  display: "block",
  fontSize: "18px",
  fontWeight: 800,
  color: "#ffffff",
  marginBottom: "8px",
};

const salesItemTextStyle: CSSProperties = {
  margin: 0,
  fontSize: "14px",
  lineHeight: 1.7,
  color: "#cbd5e1",
};

const ctaSectionStyle: CSSProperties = {
  marginTop: "8px",
};

const ctaCardStyle: CSSProperties = {
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

const ctaMiniStyle: CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#93c5fd",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 700,
  marginBottom: "8px",
};

const ctaTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "32px",
  fontWeight: 800,
  color: "#ffffff",
};

const ctaTextStyle: CSSProperties = {
  margin: "12px 0 0",
  fontSize: "15px",
  color: "#cbd5e1",
  lineHeight: 1.8,
  maxWidth: "640px",
};

const ctaButtonsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const ctaPrimaryButtonStyle: CSSProperties = {
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

const ctaGhostBlueButtonStyle: CSSProperties = {
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