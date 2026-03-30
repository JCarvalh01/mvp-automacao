"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type Invoice = {
  id: number
  client_id: number
  partner_company_id: number | null
  description: string
  amount: number
  due_date: string | null
  issue_date?: string | null
  created_at: string
  status: string
  invoice_type?: string | null
  service_taker?: string | null
  tax_service_code?: string | null
  service_location?: string | null
  pdf_url?: string | null
  xml_url?: string | null
}

type Client = {
  id: number
  name: string
  cnpj: string
}

type InvoiceComCliente = Invoice & {
  client_name?: string
  client_cnpj?: string
}

export default function InvoicesPage() {
  const [clientId, setClientId] = useState<number | null>(null)
  const [partnerCompanyId, setPartnerCompanyId] = useState<number | null>(null)

  const [amount, setAmount] = useState("75.90")
  const [dueDate, setDueDate] = useState("")
  const [status, setStatus] = useState("pendente")
  const [mensagem, setMensagem] = useState("")

  const [invoices, setInvoices] = useState<InvoiceComCliente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedClientId = localStorage.getItem("clientId")
    const storedPartnerCompanyId = localStorage.getItem("partnerCompanyId")

    if (storedClientId) {
      setClientId(Number(storedClientId))
    }

    if (storedPartnerCompanyId) {
      setPartnerCompanyId(Number(storedPartnerCompanyId))
    }

    buscarNotas()
  }, [])

  async function buscarNotas() {
    setLoading(true)

    const { data: invoicesData, error: invoicesError } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false })

    if (invoicesError) {
      console.log("Erro ao buscar registros:", invoicesError)
      setInvoices([])
      setLoading(false)
      return
    }

    const { data: clientsData, error: clientsError } = await supabase
      .from("clients")
      .select("id, name, cnpj")

    if (clientsError) {
      console.log("Erro ao buscar clientes:", clientsError)
      setInvoices((invoicesData as InvoiceComCliente[]) || [])
      setLoading(false)
      return
    }

    const clientesMap = new Map<number, Client>()

    ;(clientsData || []).forEach((client) => {
      clientesMap.set(client.id, client)
    })

    const notasComClientes: InvoiceComCliente[] = (invoicesData || []).map((invoice: Invoice) => {
      const cliente = clientesMap.get(invoice.client_id)

      return {
        ...invoice,
        client_name: cliente?.name || "Cliente não encontrado",
        client_cnpj: cliente?.cnpj || "-",
      }
    })

    setInvoices(notasComClientes)
    setLoading(false)
  }

  async function salvarPrazoDas() {
    setMensagem("")

    if (!clientId) {
      setMensagem("Usuário não identificado. Faça login novamente.")
      return
    }

    if (!amount || !dueDate) {
      setMensagem("Preencha o valor da DAS e a data de vencimento")
      return
    }

    const valorNumerico = Number(amount)

    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      setMensagem("Informe um valor válido")
      return
    }

    const { error } = await supabase
      .from("invoices")
      .insert([
        {
          partner_company_id: partnerCompanyId ? partnerCompanyId : null,
          client_id: clientId,
          description: "Pagamento da DAS",
          amount: valorNumerico,
          due_date: dueDate,
          issue_date: new Date().toISOString().split("T")[0],
          status,
          invoice_type: "das",
        },
      ])

    if (error) {
      console.log("Erro ao salvar DAS:", error)
      setMensagem(`Erro ao salvar prazo da DAS: ${error.message}`)
      return
    }

    setMensagem("Prazo da DAS salvo com sucesso")
    setAmount("75.90")
    setDueDate("")
    setStatus("pendente")

    buscarNotas()
  }

  function formatarValor(valor: number) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  function formatarData(data: string | null | undefined) {
    if (!data) return "-"
    return new Date(data).toLocaleDateString("pt-BR")
  }

  function getStatusBadgeStyle(status: string) {
    const statusNormalizado = (status || "").toLowerCase()

    if (statusNormalizado === "pago" || statusNormalizado === "emitida") {
      return {
        backgroundColor: "#dcfce7",
        color: "#166534",
      }
    }

    if (statusNormalizado === "atrasado" || statusNormalizado === "cancelada") {
      return {
        backgroundColor: "#fee2e2",
        color: "#991b1b",
      }
    }

    return {
      backgroundColor: "#fef3c7",
      color: "#92400e",
    }
  }

  function baixarPDF(invoice: InvoiceComCliente) {
    const conteudo = `
NOTA FISCAL DE SERVIÇO

ID: ${invoice.id}
Cliente: ${invoice.client_name || "-"}
CNPJ do cliente: ${invoice.client_cnpj || "-"}
CNPJ do tomador: ${invoice.service_taker || "-"}
Código de tributação: ${invoice.tax_service_code || "-"}
Local da prestação: ${invoice.service_location || "-"}
Descrição: ${invoice.description || "-"}
Valor: ${formatarValor(invoice.amount)}
Emissão: ${formatarData(invoice.issue_date || invoice.created_at)}
Status: ${invoice.status || "-"}
    `.trim()

    const blob = new Blob([conteudo], { type: "application/pdf" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = `nota-${invoice.id}.pdf`
    a.click()

    URL.revokeObjectURL(url)
  }

  function baixarXML(invoice: InvoiceComCliente) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<notaFiscal>
  <id>${invoice.id}</id>
  <cliente>${invoice.client_name || ""}</cliente>
  <cnpjCliente>${invoice.client_cnpj || ""}</cnpjCliente>
  <cnpjTomador>${invoice.service_taker || ""}</cnpjTomador>
  <codigoTributacao>${invoice.tax_service_code || ""}</codigoTributacao>
  <localPrestacao>${invoice.service_location || ""}</localPrestacao>
  <descricao>${invoice.description || ""}</descricao>
  <valor>${invoice.amount}</valor>
  <dataEmissao>${invoice.issue_date || invoice.created_at || ""}</dataEmissao>
  <status>${invoice.status || ""}</status>
</notaFiscal>`

    const blob = new Blob([xml], { type: "application/xml" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = `nota-${invoice.id}.xml`
    a.click()

    URL.revokeObjectURL(url)
  }

  const notasEmitidas = useMemo(() => {
    return invoices.filter((invoice) => invoice.invoice_type !== "das")
  }, [invoices])

  const registrosDas = useMemo(() => {
    return invoices.filter((invoice) => invoice.invoice_type === "das")
  }, [invoices])

  const faturamentoTotal = useMemo(() => {
    return notasEmitidas.reduce((total, invoice) => {
      return total + Number(invoice.amount || 0)
    }, 0)
  }, [notasEmitidas])

  const quantidadeNotas = notasEmitidas.length
  const limiteMEI = 81000
  const restanteLimite = limiteMEI - faturamentoTotal
  const percentualUsado = limiteMEI > 0 ? (faturamentoTotal / limiteMEI) * 100 : 0

  return (
    <main style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>MVP Automação Fiscal</h1>
          <p style={subtitleStyle}>
            Gestão de notas fiscais, controle da DAS e acompanhamento do limite anual do MEI.
          </p>
        </div>
      </div>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Resumo Fiscal</h2>

        <div style={cardsGridStyle}>
          <div style={cardStyle}>
            <p style={cardLabelStyle}>Faturamento Total</p>
            <strong style={cardValueStyle}>{formatarValor(faturamentoTotal)}</strong>
            <span style={cardHintStyle}>Baseado apenas nas notas emitidas</span>
          </div>

          <div style={cardStyle}>
            <p style={cardLabelStyle}>Notas Emitidas</p>
            <strong style={cardValueStyle}>{quantidadeNotas}</strong>
            <span style={cardHintStyle}>Quantidade total de notas fiscais</span>
          </div>

          <div style={cardStyle}>
            <p style={cardLabelStyle}>Limite MEI Utilizado</p>
            <strong style={cardValueStyle}>{percentualUsado.toFixed(2)}%</strong>
            <span style={cardHintStyle}>Com base no limite de R$ 81.000,00</span>
          </div>

          <div style={cardStyle}>
            <p style={cardLabelStyle}>Restante do Limite</p>
            <strong style={cardValueStyle}>{formatarValor(restanteLimite)}</strong>
            <span style={cardHintStyle}>Valor disponível até o teto anual</span>
          </div>
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Controle de Pagamento da DAS</h2>
            <p style={sectionTextStyle}>
              Registre o vencimento e acompanhe o status dos pagamentos mensais da DAS.
            </p>
          </div>
        </div>

        <div style={formCardStyle}>
          <div style={formGridStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Valor da DAS</label>
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex.: 75.90"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Data de vencimento</label>
              <input
                style={inputStyle}
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Status</label>
              <select
                style={inputStyle}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="pendente">Pendente</option>
                <option value="atrasado">Atrasado</option>
                <option value="pago">Pago</option>
              </select>
            </div>
          </div>

          <div style={actionsRowStyle}>
            <button style={primaryButtonStyle} onClick={salvarPrazoDas}>
              Salvar prazo da DAS
            </button>
          </div>

          {mensagem && (
            <div style={messageBoxStyle}>
              {mensagem}
            </div>
          )}
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Notas Emitidas</h2>
            <p style={sectionTextStyle}>
              Estas notas são as que alimentam o faturamento total e o acompanhamento do limite do MEI.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={emptyStateStyle}>Carregando...</div>
        ) : notasEmitidas.length === 0 ? (
          <div style={emptyStateStyle}>Nenhuma nota emitida encontrada.</div>
        ) : (
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr style={tableHeadRowStyle}>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Cliente</th>
                  <th style={thStyle}>CNPJ cliente</th>
                  <th style={thStyle}>CNPJ tomador</th>
                  <th style={thStyle}>Cód. tributação</th>
                  <th style={thStyle}>Local prestação</th>
                  <th style={thStyle}>Descrição</th>
                  <th style={thStyle}>Valor</th>
                  <th style={thStyle}>Emissão</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>PDF</th>
                  <th style={thStyle}>XML</th>
                </tr>
              </thead>

              <tbody>
                {notasEmitidas.map((invoice) => (
                  <tr key={invoice.id}>
                    <td style={tdStyle}>{invoice.id}</td>
                    <td style={tdStyle}>{invoice.client_name}</td>
                    <td style={tdStyle}>{invoice.client_cnpj}</td>
                    <td style={tdStyle}>{invoice.service_taker || "-"}</td>
                    <td style={tdStyle}>{invoice.tax_service_code || "-"}</td>
                    <td style={tdStyle}>{invoice.service_location || "-"}</td>
                    <td style={tdStyle}>{invoice.description}</td>
                    <td style={tdStyle}>{formatarValor(invoice.amount)}</td>
                    <td style={tdStyle}>{formatarData(invoice.issue_date || invoice.created_at)}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          ...statusBadgeBaseStyle,
                          ...getStatusBadgeStyle(invoice.status),
                        }}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <button style={secondaryButtonStyle} onClick={() => baixarPDF(invoice)}>
                        Baixar PDF
                      </button>
                    </td>
                    <td style={tdStyle}>
                      <button style={secondaryButtonStyle} onClick={() => baixarXML(invoice)}>
                        Baixar XML
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Registros de DAS</h2>
            <p style={sectionTextStyle}>
              Estes registros são separados das notas emitidas e não entram no cálculo do faturamento.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={emptyStateStyle}>Carregando...</div>
        ) : registrosDas.length === 0 ? (
          <div style={emptyStateStyle}>Nenhum registro de DAS encontrado.</div>
        ) : (
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr style={tableHeadRowStyle}>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Cliente</th>
                  <th style={thStyle}>Valor</th>
                  <th style={thStyle}>Vencimento</th>
                  <th style={thStyle}>Emissão</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>

              <tbody>
                {registrosDas.map((invoice) => (
                  <tr key={invoice.id}>
                    <td style={tdStyle}>{invoice.id}</td>
                    <td style={tdStyle}>{invoice.client_name}</td>
                    <td style={tdStyle}>{formatarValor(invoice.amount)}</td>
                    <td style={tdStyle}>{formatarData(invoice.due_date)}</td>
                    <td style={tdStyle}>{formatarData(invoice.issue_date || invoice.created_at)}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          ...statusBadgeBaseStyle,
                          ...getStatusBadgeStyle(invoice.status),
                        }}
                      >
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#f5f7fb",
  padding: "32px",
  fontFamily: "Arial, sans-serif",
}

const headerStyle = {
  marginBottom: "28px",
}

const titleStyle = {
  margin: 0,
  fontSize: "32px",
  fontWeight: 700,
  color: "#111827",
}

const subtitleStyle = {
  marginTop: "8px",
  color: "#6b7280",
  fontSize: "15px",
}

const sectionStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "24px",
  marginBottom: "24px",
  boxShadow: "0 4px 18px rgba(15, 23, 42, 0.04)",
}

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "18px",
}

const sectionTitleStyle = {
  margin: 0,
  fontSize: "22px",
  fontWeight: 700,
  color: "#111827",
}

const sectionTextStyle = {
  marginTop: "6px",
  marginBottom: 0,
  color: "#6b7280",
  fontSize: "14px",
}

const cardsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
}

const cardStyle = {
  background: "linear-gradient(180deg, #ffffff 0%, #f9fbff 100%)",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "18px",
}

const cardLabelStyle = {
  margin: 0,
  color: "#6b7280",
  fontSize: "14px",
}

const cardValueStyle = {
  display: "block",
  marginTop: "10px",
  fontSize: "26px",
  color: "#111827",
}

const cardHintStyle = {
  display: "block",
  marginTop: "8px",
  color: "#9ca3af",
  fontSize: "12px",
}

const formCardStyle = {
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "18px",
}

const formGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
}

const fieldStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
}

const labelStyle = {
  fontSize: "14px",
  color: "#374151",
  fontWeight: 600,
}

const inputStyle = {
  height: "44px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  padding: "0 12px",
  fontSize: "14px",
  outline: "none",
  backgroundColor: "#fff",
}

const actionsRowStyle = {
  marginTop: "18px",
  display: "flex",
  gap: "12px",
}

const primaryButtonStyle = {
  backgroundColor: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  padding: "12px 18px",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
}

const secondaryButtonStyle = {
  backgroundColor: "#eef2ff",
  color: "#3730a3",
  border: "1px solid #c7d2fe",
  borderRadius: "8px",
  padding: "8px 12px",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
}

const messageBoxStyle = {
  marginTop: "16px",
  backgroundColor: "#ecfdf5",
  border: "1px solid #a7f3d0",
  color: "#065f46",
  borderRadius: "10px",
  padding: "12px 14px",
  fontSize: "14px",
}

const tableWrapperStyle = {
  overflowX: "auto" as const,
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
}

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse" as const,
  backgroundColor: "#fff",
}

const tableHeadRowStyle = {
  backgroundColor: "#f9fafb",
}

const thStyle = {
  padding: "14px 12px",
  textAlign: "left" as const,
  fontSize: "13px",
  color: "#374151",
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap" as const,
}

const tdStyle = {
  padding: "14px 12px",
  borderBottom: "1px solid #f1f5f9",
  fontSize: "14px",
  color: "#111827",
  whiteSpace: "nowrap" as const,
}

const statusBadgeBaseStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "capitalize" as const,
}

const emptyStateStyle = {
  padding: "24px",
  border: "1px dashed #d1d5db",
  borderRadius: "14px",
  textAlign: "center" as const,
  color: "#6b7280",
  backgroundColor: "#f9fafb",
}