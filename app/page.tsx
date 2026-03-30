"use client";

import Link from "next/link";

export default function HomePage() {
  const whatsappLink =
    "https://wa.me/5511982966310?text=Olá!%20Quero%20conhecer%20o%20sistema%20de%20emissão%20automática%20de%20notas.";

  return (
    <main style={pageStyle}>
      <div style={glowTopStyle} />
      <div style={glowMiddleStyle} />
      <div style={glowBottomStyle} />

      <div style={containerStyle}>
        <header style={headerStyle}>
          <div style={brandRowStyle}>
            <div style={brandBadgeStyle}>MVP_ Automação Fiscal</div>
          </div>

          <nav style={navStyle}>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              style={navWhatsappStyle}
            >
              Falar no WhatsApp
            </a>

            <Link href="/login" style={navLinkStyle}>
              Entrar
            </Link>

            <Link href="/cadastro-cliente" style={navPrimaryStyle}>
              Criar conta
            </Link>
          </nav>
        </header>

        <section style={heroSectionStyle}>
          <div style={heroContentStyle}>
            <div style={heroPillStyle}>Plataforma fiscal moderna</div>

            <h1 style={heroTitleStyle}>
              Emita notas fiscais
              <br />
              com mais rapidez, escala e organização
            </h1>

            <p style={heroSubtitleStyle}>
              Automatize a emissão de NFS-e, centralize clientes, acompanhe o
              histórico e mantenha PDF e XML organizados em um ambiente
              profissional pensado para MEIs e empresas parceiras.
            </p>

            <div style={heroActionsStyle}>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                style={heroWhatsappButtonStyle}
              >
                Falar no WhatsApp
              </a>

              <Link href="/login" style={heroPrimaryButtonStyle}>
                Entrar na plataforma
              </Link>

              <Link href="/cadastro-cliente" style={heroSecondaryButtonStyle}>
                Criar conta
              </Link>
            </div>

            <div style={heroStatsGridStyle}>
              <div style={heroStatCardStyle}>
                <span style={heroStatLabelStyle}>Emissão</span>
                <strong style={heroStatValueStyle}>NFS-e automatizada</strong>
              </div>

              <div style={heroStatCardStyle}>
                <span style={heroStatLabelStyle}>Gestão</span>
                <strong style={heroStatValueStyle}>Clientes e histórico</strong>
              </div>

              <div style={heroStatCardStyle}>
                <span style={heroStatLabelStyle}>Arquivos</span>
                <strong style={heroStatValueStyle}>PDF e XML centralizados</strong>
              </div>
            </div>
          </div>

          <div style={heroPanelWrapperStyle}>
            <div style={heroPanelStyle}>
              <div style={panelTopStyle}>
                <span style={panelMiniStyle}>Visão da plataforma</span>
                <span style={panelStatusStyle}>Online</span>
              </div>

              <div style={panelCardGridStyle}>
                <div style={panelCardStyle}>
                  <span style={panelCardLabelStyle}>Clientes</span>
                  <strong style={panelCardValueStyle}>Cadastro e gestão</strong>
                </div>

                <div style={panelCardStyle}>
                  <span style={panelCardLabelStyle}>Notas</span>
                  <strong style={panelCardValueStyle}>Emissão e histórico</strong>
                </div>

                <div style={panelCardStyle}>
                  <span style={panelCardLabelStyle}>Operação</span>
                  <strong style={panelCardValueStyle}>Fluxo centralizado</strong>
                </div>

                <div style={panelCardStyle}>
                  <span style={panelCardLabelStyle}>Escala</span>
                  <strong style={panelCardValueStyle}>Modelo SaaS</strong>
                </div>
              </div>

              <div style={panelFooterStyle}>
                Uma estrutura pronta para crescer com clientes diretos e empresas
                parceiras, com foco em emissão fiscal automática e operação
                organizada.
              </div>
            </div>
          </div>
        </section>

        <section style={featuresSectionStyle}>
          <div style={sectionIntroStyle}>
            <div style={sectionBadgeStyle}>Recursos principais</div>
            <h2 style={sectionTitleStyle}>Tudo em um só lugar</h2>
          </div>

          <div style={featuresGridStyle}>
            <article style={featureCardStyle}>
              <span style={featureTagStyle}>Notas fiscais</span>
              <h3 style={featureTitleStyle}>Emissão com mais agilidade</h3>
              <p style={featureTextStyle}>
                Organize a operação fiscal em um fluxo mais rápido, com emissão,
                histórico e arquivos em um único ambiente.
              </p>
            </article>

            <article style={featureCardStyle}>
              <span style={featureTagStyle}>Clientes</span>
              <h3 style={featureTitleStyle}>Base centralizada</h3>
              <p style={featureTextStyle}>
                Cadastre, acompanhe e visualize os dados dos clientes com mais
                clareza e controle operacional.
              </p>
            </article>

            <article style={featureCardStyle}>
              <span style={featureTagStyle}>Escalabilidade</span>
              <h3 style={featureTitleStyle}>Pronto para crescer</h3>
              <p style={featureTextStyle}>
                A MVP já nasce com estrutura para operar no modelo SaaS, tanto
                para clientes diretos quanto para empresas parceiras.
              </p>
            </article>
          </div>
        </section>

        <section style={plansSectionStyle}>
          <div style={sectionIntroStyle}>
            <div style={sectionBadgeStyle}>Planos</div>
            <h2 style={sectionTitleStyle}>Escolha o plano ideal para sua operação</h2>
            <p style={plansSubtitleStyle}>
              Estrutura simples para começar agora, validar rápido e escalar
              conforme o uso do sistema.
            </p>
          </div>

          <div style={plansGridStyle}>
            <article style={planCardStyle}>
              <div style={planHeaderStyle}>
                <span style={planTagStyle}>MEI</span>
                <h3 style={planTitleStyle}>Essencial</h3>
                <div style={planPriceStyle}>R$ 29,90</div>
                <p style={planDescriptionStyle}>Entrada com excelente custo-benefício.</p>
              </div>

              <div style={planListStyle}>
                <div style={planItemStyle}>✔ Até 30 notas por mês</div>
                <div style={planItemStyle}>✔ Emissão automática</div>
                <div style={planItemStyle}>✔ PDFs e XMLs organizados</div>
                <div style={planItemStyle}>✔ Acesso individual</div>
              </div>

              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                style={planButtonStyle}
              >
                Contratar pelo WhatsApp
              </a>
            </article>

            <article style={planHighlightCardStyle}>
              <div style={planHeaderStyle}>
                <span style={planHighlightTagStyle}>MEI</span>
                <h3 style={planTitleStyle}>Full</h3>
                <div style={planPriceStyle}>R$ 59,90</div>
                <p style={planDescriptionStyle}>
                  Para quem quer operar com mais liberdade e escala.
                </p>
              </div>

              <div style={planListStyle}>
                <div style={planItemStyle}>✔ Notas ilimitadas</div>
                <div style={planItemStyle}>✔ Emissão automática completa</div>
                <div style={planItemStyle}>✔ PDFs e XMLs organizados</div>
                <div style={planItemStyle}>✔ Mais liberdade operacional</div>
              </div>

              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                style={planHighlightButtonStyle}
              >
                Contratar pelo WhatsApp
              </a>
            </article>

            <article style={planCardStyle}>
              <div style={planHeaderStyle}>
                <span style={planTagStyle}>Empresas</span>
                <h3 style={planTitleStyle}>Contábil</h3>
                <div style={planPriceSmallStyle}>R$ 30 fixo + R$ 7 por cliente</div>
                <p style={planDescriptionStyle}>
                  Ideal para empresas parceiras e escritórios contábeis.
                </p>
              </div>

              <div style={planListStyle}>
                <div style={planItemStyle}>✔ Múltiplos clientes</div>
                <div style={planItemStyle}>✔ Emissão em massa</div>
                <div style={planItemStyle}>✔ Dashboard operacional</div>
                <div style={planItemStyle}>✔ Modelo escalável SaaS</div>
              </div>

              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                style={planButtonStyle}
              >
                Falar sobre plano contábil
              </a>
            </article>
          </div>
        </section>

        <section style={salesSectionStyle}>
          <div style={salesCardStyle}>
            <div style={salesTextWrapStyle}>
              <span style={salesMiniStyle}>Por que escolher a plataforma?</span>
              <h2 style={salesTitleStyle}>
                Menos operação manual, mais produtividade e mais controle
              </h2>
              <p style={salesTextStyle}>
                A plataforma foi criada para reduzir esforço operacional,
                acelerar a emissão fiscal e dar uma experiência mais profissional
                para MEIs e empresas parceiras.
              </p>
            </div>

            <div style={salesGridStyle}>
              <div style={salesItemStyle}>
                <strong style={salesItemTitleStyle}>Mais rapidez</strong>
                <p style={salesItemTextStyle}>
                  Reduza o tempo gasto na emissão manual e concentre energia no
                  que realmente importa.
                </p>
              </div>

              <div style={salesItemStyle}>
                <strong style={salesItemTitleStyle}>Mais organização</strong>
                <p style={salesItemTextStyle}>
                  Tenha clientes, notas, PDF e XML em um único ambiente.
                </p>
              </div>

              <div style={salesItemStyle}>
                <strong style={salesItemTitleStyle}>Mais escala</strong>
                <p style={salesItemTextStyle}>
                  Estrutura pronta para atender desde MEIs até empresas com
                  diversos clientes.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section style={ctaSectionStyle}>
          <div style={ctaCardStyle}>
            <div>
              <span style={ctaMiniStyle}>Comece agora</span>
              <h2 style={ctaTitleStyle}>Fale comigo no WhatsApp e veja o sistema funcionando</h2>
              <p style={ctaTextStyle}>
                Se você quer automatizar a emissão de notas e operar com mais
                presença de produto, esse é o momento de começar.
              </p>
            </div>

            <div style={ctaButtonsStyle}>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                style={ctaWhatsappButtonStyle}
              >
                Falar no WhatsApp
              </a>

              <Link href="/login" style={ctaPrimaryButtonStyle}>
                Entrar
              </Link>

              <Link href="/cadastro-cliente" style={ctaSecondaryButtonStyle}>
                Criar conta
              </Link>
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

const navWhatsappStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "12px 16px",
  borderRadius: "14px",
  background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
  color: "#ffffff",
  fontWeight: 700,
  boxShadow: "0 12px 28px rgba(34,197,94,0.24)",
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

const heroSecondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "15px 18px",
  borderRadius: "16px",
  background: "rgba(15,23,42,0.88)",
  border: "1px solid rgba(148,163,184,0.18)",
  color: "#ffffff",
  fontWeight: 700,
};

const heroWhatsappButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "15px 18px",
  borderRadius: "16px",
  background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
  color: "#ffffff",
  fontWeight: 800,
  boxShadow: "0 14px 30px rgba(34,197,94,0.24)",
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

const panelCardGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
};

const panelCardStyle: React.CSSProperties = {
  padding: "16px",
  borderRadius: "18px",
  background: "rgba(15,23,42,0.86)",
  border: "1px solid rgba(59,130,246,0.12)",
};

const panelCardLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#93c5fd",
  marginBottom: "6px",
};

const panelCardValueStyle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  color: "#ffffff",
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

const plansSectionStyle: React.CSSProperties = {
  marginBottom: "26px",
};

const plansSubtitleStyle: React.CSSProperties = {
  margin: "12px 0 0",
  color: "#cbd5e1",
  fontSize: "15px",
  lineHeight: 1.8,
  maxWidth: "760px",
};

const plansGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "16px",
};

const planCardStyle: React.CSSProperties = {
  padding: "24px",
  borderRadius: "26px",
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.90) 0%, rgba(15,23,42,0.92) 100%)",
  border: "1px solid rgba(59,130,246,0.14)",
  boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
};

const planHighlightCardStyle: React.CSSProperties = {
  padding: "24px",
  borderRadius: "26px",
  background:
    "linear-gradient(180deg, rgba(10,25,47,0.94) 0%, rgba(15,23,42,0.98) 100%)",
  border: "1px solid rgba(34,197,94,0.28)",
  boxShadow: "0 20px 48px rgba(0,0,0,0.32)",
};

const planHeaderStyle: React.CSSProperties = {
  marginBottom: "18px",
};

const planTagStyle: React.CSSProperties = {
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

const planHighlightTagStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "7px 12px",
  borderRadius: "999px",
  background: "rgba(34,197,94,0.12)",
  border: "1px solid rgba(34,197,94,0.18)",
  color: "#bbf7d0",
  fontSize: "12px",
  fontWeight: 700,
  marginBottom: "14px",
};

const planTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 800,
  color: "#ffffff",
};

const planPriceStyle: React.CSSProperties = {
  marginTop: "12px",
  fontSize: "38px",
  lineHeight: 1,
  fontWeight: 800,
  color: "#ffffff",
};

const planPriceSmallStyle: React.CSSProperties = {
  marginTop: "12px",
  fontSize: "28px",
  lineHeight: 1.2,
  fontWeight: 800,
  color: "#ffffff",
};

const planDescriptionStyle: React.CSSProperties = {
  margin: "12px 0 0",
  fontSize: "14px",
  lineHeight: 1.7,
  color: "#cbd5e1",
};

const planListStyle: React.CSSProperties = {
  display: "grid",
  gap: "10px",
  marginBottom: "20px",
};

const planItemStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: "16px",
  background: "rgba(15,23,42,0.86)",
  border: "1px solid rgba(59,130,246,0.12)",
  color: "#e2e8f0",
  fontSize: "14px",
  fontWeight: 600,
};

const planButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  textDecoration: "none",
  padding: "14px 18px",
  borderRadius: "16px",
  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  color: "#ffffff",
  fontWeight: 800,
  boxShadow: "0 14px 30px rgba(37,99,235,0.30)",
};

const planHighlightButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  textDecoration: "none",
  padding: "14px 18px",
  borderRadius: "16px",
  background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
  color: "#ffffff",
  fontWeight: 800,
  boxShadow: "0 14px 30px rgba(34,197,94,0.24)",
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

const ctaWhatsappButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "14px 18px",
  borderRadius: "16px",
  background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
  color: "#ffffff",
  fontWeight: 800,
  boxShadow: "0 14px 30px rgba(34,197,94,0.24)",
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

const ctaSecondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  padding: "14px 18px",
  borderRadius: "16px",
  background: "rgba(15,23,42,0.88)",
  border: "1px solid rgba(148,163,184,0.18)",
  color: "#ffffff",
  fontWeight: 700,
};
