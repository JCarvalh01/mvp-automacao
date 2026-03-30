"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import jsPDF from "jspdf";

type Client = {
  id: number;
  partner_company_id: number | null;
  admin_id: number | null;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  mei_opening_date: string | null;
  created_at: string;
};

type Invoice = {
  id: number;
  client_id: number;
  partner_company_id: number | null;
  competency_date: string;
  service_taker: string;
  tax_code: string;
  service_city: string;
  service_value: number;
  service_description: string;
  created_at: string;
};

type ClientDasn = {
  id: number;
  client_id: number;
  partner_company_id: number | null;
  base_year: number;
  revenue_total: number;
  had_employee: boolean;
  status: string;
  submitted_at: string | null;
  notes: string | null;
  created_at: string;
};

const LIMITE_MEI = 81000;

const nomesMeses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export default function DasnClientePage() {
  const params = useParams();
  const router = useRouter();

  const clientId = Number(params.id);
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState<number>(currentYear);
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dasnRecord, setDasnRecord] = useState<ClientDasn | null>(null);

  const [hadEmployee, setHadEmployee] = useState(false);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("pendente");

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<"sucesso" | "erro" | "">("");

  useEffect(() => {
    if (!clientId) return;
    carregarPagina();
  }, [clientId, year]);

  async function carregarPagina() {
    try {
      setLoading(true);
      setMensagem("");
      setTipoMensagem("");

      await Promise.all([
        carregarCliente(),
        carregarNotas(year),
        carregarDasn(year),
      ]);
    } catch (error) {
      console.log("Erro ao carregar página DASN:", error);
      setMensagem("Erro inesperado ao carregar a página DASN.");
      setTipoMensagem("erro");
    } finally {
      setLoading(false);
    }
  }

  async function carregarCliente() {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (error || !data) {
      console.log("Erro ao buscar cliente:", error);
      setMensagem("Cliente não encontrado.");
      setTipoMensagem("erro");
      return;
    }

    setClient(data);
  }

  async function carregarNotas(selectedYear: number) {
    const startDate = `${selectedYear}-01-01`;
    const endDate = `${selectedYear}-12-31`;

    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("client_id", clientId)
      .gte("competency_date", startDate)
      .lte("competency_date", endDate)
      .order("competency_date", { ascending: true });

    if (error) {
      console.log("Erro ao buscar notas:", error);
      setMensagem("Não foi possível carregar as notas do ano selecionado.");
      setTipoMensagem("erro");
      return;
    }

    setInvoices(data || []);
  }

  async function carregarDasn(selectedYear: number) {
    const { data, error } = await supabase
      .from("client_dasn")
      .select("*")
      .eq("client_id", clientId)
      .eq("base_year", selectedYear)
      .maybeSingle();

    if (error) {
      console.log("Erro ao buscar DASN:", error);
      setMensagem("Não foi possível carregar o rascunho da DASN.");
      setTipoMensagem("erro");
      return;
    }

    setDasnRecord(data || null);

    if (data) {
      setHadEmployee(!!data.had_employee);
      setNotes(data.notes || "");
      setStatus(data.status || "pendente");
    } else {
      setHadEmployee(false);
      setNotes("");
      setStatus("pendente");
    }
  }

  const monthlyRevenue = useMemo(() => {
    const totals = Array(12).fill(0);

    for (const invoice of invoices) {
      if (!invoice.competency_date) continue;

      const date = new Date(invoice.competency_date + "T00:00:00");
      const month = date.getMonth();

      totals[month] += Number(invoice.service_value || 0);
    }

    return totals;
  }, [invoices]);

  const annualRevenue = useMemo(() => {
    return monthlyRevenue.reduce((acc, value) => acc + value, 0);
  }, [monthlyRevenue]);

  const limitPercentage = useMemo(() => {
    return annualRevenue > 0 ? (annualRevenue / LIMITE_MEI) * 100 : 0;
  }, [annualRevenue]);

  const remainingLimit = useMemo(() => {
    return LIMITE_MEI - annualRevenue;
  }, [annualRevenue]);

  function formatarValor(valor: number) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function getStatusLabel(statusValue: string) {
    if (statusValue === "pendente") return "Pendente";
    if (statusValue === "em andamento") return "Em andamento";
    if (statusValue === "entregue") return "Entregue";
    return statusValue;
  }

  function getStatusBadgeStyle(statusValue: string): React.CSSProperties {
    if (statusValue === "entregue") {
      return {
        backgroundColor: "#ecfdf5",
        color: "#065f46",
        border: "1px solid #a7f3d0",
      };
    }

    if (statusValue === "em andamento") {
      return {
        backgroundColor: "#eff6ff",
        color: "#1d4ed8",
        border: "1px solid #bfdbfe",
      };
    }

    return {
      backgroundColor: "#fff7ed",
      color: "#9a3412",
      border: "1px solid #fdba74",
    };
  }

  async function salvarDasn(customStatus?: string) {
    if (!client) return;

    try {
      setSalvando(true);
      setMensagem("");
      setTipoMensagem("");

      const finalStatus = customStatus || status;
      const submittedAt =
        finalStatus === "entregue" ? new Date().toISOString() : null;

      const payload = {
        client_id: client.id,
        partner_company_id: client.partner_company_id,
        base_year: year,
        revenue_total: annualRevenue,
        had_employee: hadEmployee,
        status: finalStatus,
        submitted_at: submittedAt,
        notes: notes,
      };

      let response;

      if (dasnRecord?.id) {
        response = await supabase
          .from("client_dasn")
          .update(payload)
          .eq("id", dasnRecord.id)
          .select()
          .single();
      } else {
        response = await supabase
          .from("client_dasn")
          .insert([payload])
          .select()
          .single();
      }

      if (response.error) {
        console.log("Erro ao salvar DASN:", response.error);
        setMensagem(`Erro ao salvar DASN: ${response.error.message}`);
        setTipoMensagem("erro");
        setSalvando(false);
        return;
      }

      setDasnRecord(response.data);
      setStatus(response.data.status);
      setMensagem("DASN salva com sucesso!");
      setTipoMensagem("sucesso");
      setSalvando(false);
    } catch (error) {
      console.log("Erro inesperado ao salvar DASN:", error);
      setMensagem("Erro inesperado ao salvar a DASN.");
      setTipoMensagem("erro");
      setSalvando(false);
    }
  }

  function baixarPdf() {
    if (!client) return;

    const doc = new jsPDF();

    let y = 18;

    doc.setFontSize(20);
    doc.text("DASN - Declaração Anual do Simples Nacional", 14, y);

    y += 12;
    doc.setFontSize(11);

    doc.text(`Cliente: ${client.name}`, 14, y);
    y += 7;

    doc.text(`CNPJ: ${client.cnpj}`, 14, y);
    y += 7;

    doc.text(`Ano base: ${year}`, 14, y);
    y += 7;

    doc.text(`Faturamento total: ${formatarValor(annualRevenue)}`, 14, y);
    y += 7;

    doc.text(`Percentual do limite MEI: ${limitPercentage.toFixed(2)}%`, 14, y);
    y += 7;

    doc.text(
      `Limite restante: ${formatarValor(Math.max(remainingLimit, 0))}`,
      14,
      y
    );
    y += 7;

    doc.text(`Teve funcionário: ${hadEmployee ? "Sim" : "Não"}`, 14, y);
    y += 7;

    doc.text(`Status: ${getStatusLabel(status)}`, 14, y);
    y += 12;

    doc.setFontSize(13);
    doc.text("Resumo mensal", 14, y);
    y += 8;

    doc.setFontSize(10);

    monthlyRevenue.forEach((value, index) => {
      doc.text(`${nomesMeses[index]}: ${formatarValor(value)}`, 14, y);
      y += 6;

      if (y > 275) {
        doc.addPage();
        y = 15;
      }
    });

    y += 8;
    doc.setFontSize(12);
    doc.text("Observações", 14, y);
    y += 8;

    doc.setFontSize(10);
    const textoObservacoes = doc.splitTextToSize(
      notes || "Sem observações.",
      180
    );
    doc.text(textoObservacoes, 14, y);

    doc.save(`DASN_${client.name.replace(/\s+/g, "_")}_${year}.pdf`);
  }

  function totalizarQuantidadeNotasMes(indexMes: number) {
    return invoices.filter((invoice) => {
      if (!invoice.competency_date) return false;
      const data = new Date(invoice.competency_date + "T00:00:00");
      return data.getMonth() === indexMes;
    }).length;
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <div style={topBarStyle}>
          <div style={brandBoxStyle}>
            <span style={brandMiniStyle}>MVP Automação Fiscal</span>
            <h1 style={pageTitleStyle}>DASN do Cliente</h1>
            <p style={pageSubtitleStyle}>
              Acompanhe o faturamento anual do MEI, controle o limite e registre
              a declaração anual com base nas notas emitidas.
            </p>
          </div>

          <div style={navActionsStyle}>
            <button
              onClick={() => router.push(`/clientes/${clientId}`)}
              style={navActionButtonStyle}
            >
              Voltar ao cliente
            </button>

            <Link href="/dashboard-empresa" style={navButtonStyle}>
              Menu principal
            </Link>

            <Link href="/notas-emitidas" style={primaryNavButtonStyle}>
              Notas emitidas
            </Link>
          </div>
        </div>

        <section style={heroCardStyle}>
          <div style={heroLeftStyle}>
            <span style={heroTagStyle}>Módulo fiscal anual</span>
            <h2 style={heroTitleStyle}>
              Consolidação automática da DASN por notas emitidas
            </h2>
            <p style={heroTextStyle}>
              O sistema soma o faturamento do ano, mostra o percentual do limite
              MEI e permite salvar, acompanhar e exportar a DASN em PDF.
            </p>
          </div>

          <div style={heroRightStyle}>
            <span style={heroInfoLabelStyle}>Ano base selecionado</span>
            <strong style={heroInfoValueStyle}>{year}</strong>
          </div>
        </section>

        <section style={summaryCardsGridStyle}>
          <div style={summaryCardStyle}>
            <span style={summaryCardLabelStyle}>Cliente</span>
            <strong style={summaryCardValueStyle}>
              {client?.name || "Carregando..."}
            </strong>
            <span style={summaryCardFooterStyle}>
              {client?.cnpj || "CNPJ não informado"}
            </span>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryCardLabelStyle}>Faturamento anual</span>
            <strong style={summaryCardValueStyle}>
              {formatarValor(annualRevenue)}
            </strong>
            <span style={summaryCardFooterStyle}>
              Baseado nas notas do ano selecionado
            </span>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryCardLabelStyle}>Percentual do limite</span>
            <strong style={summaryCardValueStyle}>
              {limitPercentage.toFixed(2)}%
            </strong>
            <span style={summaryCardFooterStyle}>
              Teto anual do MEI: {formatarValor(LIMITE_MEI)}
            </span>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryCardLabelStyle}>Limite restante</span>
            <strong style={summaryCardValueStyle}>
              {formatarValor(Math.max(remainingLimit, 0))}
            </strong>
            <span style={summaryCardFooterStyle}>
              {remainingLimit < 0 ? "Limite excedido" : "Ainda disponível"}
            </span>
          </div>
        </section>

        <section style={mainGridStyle}>
          <div style={formCardStyle}>
            <div style={cardHeaderStyle}>
              <h3 style={cardTitleStyle}>Resumo anual e dados da declaração</h3>
              <p style={cardTextStyle}>
                Consulte o faturamento mensal, escolha o ano base e registre os
                dados complementares da DASN.
              </p>
            </div>

            {loading ? (
              <div style={loadingBoxStyle}>Carregando dados da DASN...</div>
            ) : (
              <>
                <div style={filtersRowStyle}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Ano base</label>
                    <select
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      style={inputStyle}
                    >
                      {Array.from({ length: 6 }).map((_, index) => {
                        const optionYear = currentYear - index;
                        return (
                          <option key={optionYear} value={optionYear}>
                            {optionYear}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div style={fieldStyle}>
                    <label style={labelStyle}>Status da DASN</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="pendente">Pendente</option>
                      <option value="em andamento">Em andamento</option>
                      <option value="entregue">Entregue</option>
                    </select>
                  </div>
                </div>

                <div style={monthlyGridStyle}>
                  {monthlyRevenue.map((value, index) => (
                    <div key={nomesMeses[index]} style={monthCardStyle}>
                      <span style={monthLabelStyle}>{nomesMeses[index]}</span>
                      <strong style={monthValueStyle}>
                        {formatarValor(value)}
                      </strong>
                      <span style={monthMetaStyle}>
                        {totalizarQuantidadeNotasMes(index)} nota(s)
                      </span>
                    </div>
                  ))}
                </div>

                <div style={infoBoxStyle}>
                  Esta área usa as <strong>notas emitidas do cliente</strong> para
                  consolidar automaticamente o faturamento do ano da DASN.
                </div>

                <div style={declarationFormStyle}>
                  <div style={checkboxRowStyle}>
                    <label style={checkboxLabelStyle}>
                      <input
                        type="checkbox"
                        checked={hadEmployee}
                        onChange={(e) => setHadEmployee(e.target.checked)}
                        style={checkboxStyle}
                      />
                      Teve funcionário no ano base
                    </label>
                  </div>

                  <div style={fieldStyle}>
                    <label style={labelStyle}>Observações</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Descreva observações importantes sobre a declaração anual"
                      style={textareaStyle}
                    />
                  </div>
                </div>

                <div style={actionsGridStyle}>
                  <button
                    onClick={() => salvarDasn("pendente")}
                    disabled={salvando}
                    style={salvando ? disabledButtonStyle : secondaryActionButtonStyle}
                  >
                    {salvando ? "Salvando..." : "Salvar rascunho"}
                  </button>

                  <button
                    onClick={() => salvarDasn("em andamento")}
                    disabled={salvando}
                    style={salvando ? disabledButtonStyle : buttonStyle}
                  >
                    {salvando ? "Salvando..." : "Gerar DASN"}
                  </button>

                  <button
                    onClick={() => salvarDasn("entregue")}
                    disabled={salvando}
                    style={salvando ? disabledButtonStyle : successButtonStyle}
                  >
                    {salvando ? "Salvando..." : "Marcar como entregue"}
                  </button>

                  <button onClick={baixarPdf} style={warningButtonStyle}>
                    Baixar PDF
                  </button>
                </div>

                {mensagem && (
                  <div
                    style={
                      tipoMensagem === "erro"
                        ? errorMessageStyle
                        : successMessageStyle
                    }
                  >
                    {mensagem}
                  </div>
                )}
              </>
            )}
          </div>

          <div style={sideCardStyle}>
            <div style={cardHeaderStyle}>
              <h3 style={cardTitleStyle}>Painel da declaração</h3>
              <p style={cardTextStyle}>
                Consulte os dados principais da DASN antes de concluir o envio.
              </p>
            </div>

            <div style={clientSummaryStyle}>
              <div style={summaryItemStyle}>
                <span style={summaryLabelStyle}>Cliente</span>
                <p style={summaryValueStyle}>{client?.name || "Não informado"}</p>
              </div>

              <div style={summaryItemStyle}>
                <span style={summaryLabelStyle}>CNPJ</span>
                <p style={summaryValueStyle}>{client?.cnpj || "Não informado"}</p>
              </div>

              <div style={summaryItemStyle}>
                <span style={summaryLabelStyle}>Ano base</span>
                <p style={summaryValueStyle}>{year}</p>
              </div>

              <div style={summaryItemStyle}>
                <span style={summaryLabelStyle}>Notas no ano</span>
                <p style={summaryValueStyle}>{invoices.length}</p>
              </div>

              <div style={summaryItemStyle}>
                <span style={summaryLabelStyle}>Faturamento total</span>
                <p style={summaryValueStyle}>{formatarValor(annualRevenue)}</p>
              </div>

              <div style={summaryItemStyle}>
                <span style={summaryLabelStyle}>Situação da DASN</span>
                <div
                  style={{
                    ...statusBadgeBaseStyle,
                    ...getStatusBadgeStyle(status),
                  }}
                >
                  {getStatusLabel(status)}
                </div>
              </div>
            </div>

            <div style={downloadBoxStyle}>
              <strong style={downloadTitleStyle}>Resumo do limite MEI</strong>

              <div style={limitSummaryGridStyle}>
                <div style={limitBoxStyle}>
                  <span style={limitBoxLabelStyle}>Teto anual</span>
                  <strong style={limitBoxValueStyle}>
                    {formatarValor(LIMITE_MEI)}
                  </strong>
                </div>

                <div style={limitBoxStyle}>
                  <span style={limitBoxLabelStyle}>Utilizado</span>
                  <strong style={limitBoxValueStyle}>
                    {limitPercentage.toFixed(2)}%
                  </strong>
                </div>

                <div style={limitBoxStyle}>
                  <span style={limitBoxLabelStyle}>Restante</span>
                  <strong style={limitBoxValueStyle}>
                    {formatarValor(Math.max(remainingLimit, 0))}
                  </strong>
                </div>
              </div>
            </div>

            <div style={emptySideBoxStyle}>
              O faturamento anual desta tela é calculado automaticamente pelas
              notas fiscais emitidas e salvas na tabela <strong>invoices</strong>.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #eef4ff 0%, #f8fafc 100%)",
  padding: "32px 20px",
  fontFamily: "Arial, sans-serif",
};

const containerStyle: React.CSSProperties = {
  maxWidth: "1280px",
  margin: "0 auto",
};

const topBarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "24px",
  flexWrap: "wrap",
};

const brandBoxStyle: React.CSSProperties = {
  maxWidth: "760px",
};

const brandMiniStyle: React.CSSProperties = {
  display: "inline-block",
  fontSize: "12px",
  fontWeight: 700,
  color: "#2563eb",
  backgroundColor: "#dbeafe",
  borderRadius: "999px",
  padding: "8px 12px",
  marginBottom: "12px",
};

const pageTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "34px",
  fontWeight: 800,
  color: "#0f172a",
};

const pageSubtitleStyle: React.CSSProperties = {
  marginTop: "10px",
  marginBottom: 0,
  color: "#64748b",
  fontSize: "15px",
  lineHeight: 1.6,
};

const navActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
};

const navButtonStyle: React.CSSProperties = {
  textDecoration: "none",
  backgroundColor: "#ffffff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: "12px",
  padding: "12px 16px",
  fontSize: "14px",
  fontWeight: 700,
  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.05)",
};

const navActionButtonStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: "12px",
  padding: "12px 16px",
  fontSize: "14px",
  fontWeight: 700,
  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.05)",
  cursor: "pointer",
};

const primaryNavButtonStyle: React.CSSProperties = {
  textDecoration: "none",
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: "#ffffff",
  border: "none",
  borderRadius: "12px",
  padding: "12px 16px",
  fontSize: "14px",
  fontWeight: 700,
  boxShadow: "0 10px 24px rgba(37, 99, 235, 0.20)",
};

const heroCardStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  padding: "24px",
  borderRadius: "24px",
  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
  color: "#ffffff",
  marginBottom: "24px",
  boxShadow: "0 18px 45px rgba(15, 23, 42, 0.18)",
  flexWrap: "wrap",
};

const heroLeftStyle: React.CSSProperties = {
  maxWidth: "760px",
};

const heroTagStyle: React.CSSProperties = {
  display: "inline-block",
  fontSize: "12px",
  fontWeight: 700,
  color: "#bfdbfe",
  backgroundColor: "rgba(255,255,255,0.08)",
  padding: "8px 12px",
  borderRadius: "999px",
  marginBottom: "12px",
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "28px",
  fontWeight: 800,
};

const heroTextStyle: React.CSSProperties = {
  marginTop: "10px",
  marginBottom: 0,
  color: "#cbd5e1",
  fontSize: "15px",
  lineHeight: 1.6,
};

const heroRightStyle: React.CSSProperties = {
  minWidth: "240px",
  padding: "18px",
  borderRadius: "18px",
  backgroundColor: "rgba(255,255,255,0.08)",
};

const heroInfoLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#cbd5e1",
  marginBottom: "8px",
};

const heroInfoValueStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 800,
};

const summaryCardsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "18px",
  marginBottom: "24px",
};

const summaryCardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "22px",
  padding: "22px",
  boxShadow: "0 14px 38px rgba(15, 23, 42, 0.06)",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const summaryCardLabelStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  fontWeight: 700,
};

const summaryCardValueStyle: React.CSSProperties = {
  fontSize: "24px",
  color: "#0f172a",
  fontWeight: 800,
  lineHeight: 1.3,
};

const summaryCardFooterStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  lineHeight: 1.5,
};

const mainGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.7fr) minmax(320px, 0.9fr)",
  gap: "24px",
};

const formCardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "24px",
  padding: "28px",
  boxShadow: "0 14px 38px rgba(15, 23, 42, 0.06)",
};

const sideCardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "24px",
  padding: "24px",
  boxShadow: "0 14px 38px rgba(15, 23, 42, 0.06)",
  alignSelf: "start",
};

const cardHeaderStyle: React.CSSProperties = {
  marginBottom: "22px",
};

const cardTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 800,
  color: "#111827",
};

const cardTextStyle: React.CSSProperties = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: 1.5,
};

const loadingBoxStyle: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "18px",
  color: "#475569",
};

const filtersRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "18px",
  marginBottom: "22px",
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const labelStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#334155",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "50px",
  borderRadius: "14px",
  border: "1px solid #cbd5e1",
  padding: "0 14px",
  fontSize: "14px",
  backgroundColor: "#ffffff",
  outline: "none",
  color: "#0f172a",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "130px",
  borderRadius: "14px",
  border: "1px solid #cbd5e1",
  padding: "14px",
  fontSize: "14px",
  backgroundColor: "#ffffff",
  outline: "none",
  color: "#0f172a",
  resize: "vertical",
  boxSizing: "border-box",
};

const monthlyGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "16px",
};

const monthCardStyle: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  padding: "18px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const monthLabelStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#475569",
  fontWeight: 700,
};

const monthValueStyle: React.CSSProperties = {
  fontSize: "21px",
  color: "#0f172a",
  fontWeight: 800,
};

const monthMetaStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
};

const infoBoxStyle: React.CSSProperties = {
  marginTop: "22px",
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1d4ed8",
  borderRadius: "16px",
  padding: "14px 16px",
  fontSize: "14px",
  lineHeight: 1.6,
};

const declarationFormStyle: React.CSSProperties = {
  marginTop: "22px",
  display: "grid",
  gap: "18px",
};

const checkboxRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
};

const checkboxLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  color: "#334155",
  fontSize: "14px",
  fontWeight: 700,
};

const checkboxStyle: React.CSSProperties = {
  width: "16px",
  height: "16px",
};

const actionsGridStyle: React.CSSProperties = {
  marginTop: "24px",
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "12px",
};

const buttonStyle: React.CSSProperties = {
  height: "52px",
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: "#fff",
  border: "none",
  borderRadius: "14px",
  fontSize: "15px",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(37, 99, 235, 0.22)",
};

const secondaryActionButtonStyle: React.CSSProperties = {
  height: "52px",
  backgroundColor: "#ffffff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: "14px",
  fontSize: "15px",
  fontWeight: 800,
  cursor: "pointer",
};

const successButtonStyle: React.CSSProperties = {
  height: "52px",
  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  color: "#fff",
  border: "none",
  borderRadius: "14px",
  fontSize: "15px",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(16, 185, 129, 0.20)",
};

const warningButtonStyle: React.CSSProperties = {
  height: "52px",
  background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
  color: "#fff",
  border: "none",
  borderRadius: "14px",
  fontSize: "15px",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(245, 158, 11, 0.20)",
};

const disabledButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  opacity: 0.7,
  cursor: "not-allowed",
};

const clientSummaryStyle: React.CSSProperties = {
  display: "grid",
  gap: "14px",
};

const summaryItemStyle: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "14px",
};

const summaryLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#64748b",
  marginBottom: "6px",
};

const summaryValueStyle: React.CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontWeight: 700,
  lineHeight: 1.5,
};

const statusBadgeBaseStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "36px",
  padding: "8px 12px",
  borderRadius: "999px",
  fontSize: "13px",
  fontWeight: 800,
};

const downloadBoxStyle: React.CSSProperties = {
  marginTop: "20px",
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "16px",
};

const downloadTitleStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "12px",
  color: "#0f172a",
  fontSize: "14px",
};

const limitSummaryGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
};

const limitBoxStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "12px",
};

const limitBoxLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#64748b",
  marginBottom: "6px",
};

const limitBoxValueStyle: React.CSSProperties = {
  fontSize: "16px",
  color: "#0f172a",
  fontWeight: 800,
};

const emptySideBoxStyle: React.CSSProperties = {
  marginTop: "20px",
  backgroundColor: "#f8fafc",
  border: "1px dashed #cbd5e1",
  borderRadius: "16px",
  padding: "18px",
  color: "#64748b",
  lineHeight: 1.6,
};

const successMessageStyle: React.CSSProperties = {
  marginTop: "16px",
  backgroundColor: "#ecfdf5",
  border: "1px solid #a7f3d0",
  color: "#065f46",
  borderRadius: "14px",
  padding: "12px 14px",
  fontSize: "14px",
};

const errorMessageStyle: React.CSSProperties = {
  marginTop: "16px",
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  borderRadius: "14px",
  padding: "12px 14px",
  fontSize: "14px",
};