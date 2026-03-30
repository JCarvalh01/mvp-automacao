"use client";

import Link from "next/link";
import JSZip from "jszip";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Empresa = {
  id: number;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  user_id: number;
};

type Cliente = {
  id: number;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
};

type Nota = {
  id: number;
  created_at: string;
  client_id: number | null;
  partner_company_id: number | null;
  competency_date: string | null;
  issue_date?: string | null;
  service_taker: string | null;
  tax_code: string | null;
  service_city: string | null;
  service_value: number;
  service_description: string | null;
  status: "pending" | "processing" | "success" | "error" | "canceled" | string | null;
  error_message: string | null;
  pdf_url?: string | null;
  xml_url?: string | null;
  pdf_path: string | null;
  xml_path: string | null;
  nfse_key?: string | null;
  client?: Cliente | null;
};

export default function NotasEmitidasPage() {
  const router = useRouter();

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState("");

  const [busca, setBusca] = useState("");
  const [filtroTomador, setFiltroTomador] = useState("");
  const [filtroCnpj, setFiltroCnpj] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [valorMinimo, setValorMinimo] = useState("");
  const [valorMaximo, setValorMaximo] = useState("");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");

  const [selecionadas, setSelecionadas] = useState<number[]>([]);
  const [baixandoZip, setBaixandoZip] = useState(false);

  useEffect(() => {
    carregarNotas();
  }, []);

  async function carregarNotas() {
    try {
      setLoading(true);
      setMensagem("");

      const empresaStorage = localStorage.getItem("partnerCompany");

      if (!empresaStorage) {
        router.push("/login-empresa");
        return;
      }

      const empresaConvertida = JSON.parse(empresaStorage);

      const { data: empresaData, error: empresaError } = await supabase
        .from("partner_companies")
        .select("*")
        .eq("id", empresaConvertida.id)
        .single();

      if (empresaError || !empresaData) {
        console.log("Erro ao buscar empresa:", empresaError);
        setMensagem("Nenhuma empresa parceira encontrada.");
        setLoading(false);
        return;
      }

      setEmpresa(empresaData);

      const { data: notasData, error: notasError } = await supabase
        .from("invoices")
        .select(`
          id,
          created_at,
          client_id,
          partner_company_id,
          competency_date,
          issue_date,
          service_taker,
          tax_code,
          service_city,
          service_value,
          service_description,
          status,
          error_message,
          pdf_url,
          xml_url,
          pdf_path,
          xml_path,
          nfse_key,
          client:clients (
            id,
            name,
            cnpj,
            email,
            phone,
            address
          )
        `)
        .eq("partner_company_id", empresaData.id)
        .order("created_at", { ascending: false });

      if (notasError) {
        console.log("Erro ao buscar notas:", notasError);
        setMensagem("Erro ao carregar notas emitidas.");
        setLoading(false);
        return;
      }

      setNotas((notasData as Nota[]) || []);
      setLoading(false);
    } catch (error) {
      console.log("Erro inesperado:", error);
      setMensagem("Erro inesperado ao carregar a página.");
      setLoading(false);
    }
  }

  function formatarData(data: string | null | undefined) {
    if (!data) return "-";

    if (data.includes("T")) {
      const date = new Date(data);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString("pt-BR");
      }
    }

    const partes = data.split("-");
    if (partes.length === 3) {
      const [ano, mes, dia] = partes;
      return `${dia}/${mes}/${ano}`;
    }

    return data;
  }

  function formatarDataArquivo(data: string | null | undefined) {
    if (!data) return "sem-data";
    const date = new Date(data);
    if (Number.isNaN(date.getTime())) return "sem-data";

    const dia = String(date.getDate()).padStart(2, "0");
    const mes = String(date.getMonth() + 1).padStart(2, "0");
    const ano = date.getFullYear();

    return `${dia}-${mes}-${ano}`;
  }

  function formatarValor(valor: number) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function converterValorTextoParaNumero(texto: string) {
    if (!texto.trim()) return null;

    const normalizado = texto
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "");

    const numero = Number(normalizado);
    return Number.isNaN(numero) ? null : numero;
  }

  function normalizarTexto(texto?: string | null) {
    return (texto || "").toLowerCase().trim();
  }

  function obterUrlPdf(nota: Nota) {
    return nota.pdf_url || nota.pdf_path || null;
  }

  function obterUrlXml(nota: Nota) {
    return nota.xml_url || nota.xml_path || null;
  }

  function abrirArquivo(url: string | null, tipo: "PDF" | "XML") {
    if (!url) {
      alert(`Esta nota ainda não possui ${tipo} disponível.`);
      return;
    }

    window.open(url, "_blank");
  }

  function alternarSelecao(notaId: number) {
    setSelecionadas((atual) =>
      atual.includes(notaId)
        ? atual.filter((id) => id !== notaId)
        : [...atual, notaId]
    );
  }

  function selecionarTodasFiltradas() {
    setSelecionadas(notasFiltradas.map((nota) => nota.id));
  }

  function limparSelecao() {
    setSelecionadas([]);
  }

  function limparFiltros() {
    setBusca("");
    setFiltroTomador("");
    setFiltroCnpj("");
    setFiltroCidade("");
    setFiltroStatus("");
    setValorMinimo("");
    setValorMaximo("");
    setDataInicial("");
    setDataFinal("");
    setSelecionadas([]);
  }

  async function baixarZipSelecionadas(tipo: "pdf" | "xml" | "ambos") {
    const notasSelecionadas = notasFiltradas.filter((nota) =>
      selecionadas.includes(nota.id)
    );

    if (notasSelecionadas.length === 0) {
      alert("Selecione pelo menos uma nota.");
      return;
    }

    try {
      setBaixandoZip(true);

      const zip = new JSZip();
      const pastaPrincipal = zip.folder("notas-selecionadas");

      if (!pastaPrincipal) {
        throw new Error("Não foi possível criar a pasta do ZIP.");
      }

      let arquivosAdicionados = 0;

      for (const nota of notasSelecionadas) {
        const nomeCliente =
          nota.client?.name?.trim().replace(/[^\w\-]+/g, "_") || "cliente";
        const dataNota = formatarDataArquivo(nota.created_at);
        const prefixo = `nota_${nota.id}_${nomeCliente}_${dataNota}`;

        const pdfFinal = obterUrlPdf(nota);
        const xmlFinal = obterUrlXml(nota);

        if ((tipo === "pdf" || tipo === "ambos") && pdfFinal) {
          try {
            const response = await fetch(pdfFinal);
            if (response.ok) {
              const blob = await response.blob();
              pastaPrincipal.file(`${prefixo}.pdf`, blob);
              arquivosAdicionados++;
            }
          } catch (error) {
            console.log(`Erro ao baixar PDF da nota ${nota.id}:`, error);
          }
        }

        if ((tipo === "xml" || tipo === "ambos") && xmlFinal) {
          try {
            const response = await fetch(xmlFinal);
            if (response.ok) {
              const blob = await response.blob();
              pastaPrincipal.file(`${prefixo}.xml`, blob);
              arquivosAdicionados++;
            }
          } catch (error) {
            console.log(`Erro ao baixar XML da nota ${nota.id}:`, error);
          }
        }
      }

      if (arquivosAdicionados === 0) {
        alert("As notas selecionadas não possuem arquivos disponíveis para gerar o ZIP.");
        return;
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;

      const dataAtual = new Date();
      const nomeZip = `notas_emitidas_${dataAtual
        .toLocaleDateString("pt-BR")
        .replace(/\//g, "-")}.zip`;

      a.download = nomeZip;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.log("Erro ao gerar ZIP:", error);
      alert("Não foi possível gerar o arquivo ZIP.");
    } finally {
      setBaixandoZip(false);
    }
  }

  function renderStatus(status: string | null) {
    const valor = (status || "").toLowerCase();

    if (valor === "success") {
      return <span style={tagSuccessStyle}>Sucesso</span>;
    }

    if (valor === "processing") {
      return <span style={tagProcessingStyle}>Processando</span>;
    }

    if (valor === "pending") {
      return <span style={tagPendingStyle}>Pendente</span>;
    }

    if (valor === "error") {
      return <span style={tagErrorStyle}>Erro</span>;
    }

    if (valor === "canceled") {
      return <span style={tagCanceledStyle}>Cancelada</span>;
    }

    return <span style={tagNeutralStyle}>{status || "-"}</span>;
  }

  const notasFiltradas = useMemo(() => {
    const minimo = converterValorTextoParaNumero(valorMinimo);
    const maximo = converterValorTextoParaNumero(valorMaximo);

    return notas.filter((nota) => {
      const textoBusca = normalizarTexto(busca);
      const textoTomador = normalizarTexto(filtroTomador);
      const textoCnpj = normalizarTexto(filtroCnpj);
      const textoCidade = normalizarTexto(filtroCidade);
      const textoStatus = normalizarTexto(filtroStatus);

      const nomeCliente = normalizarTexto(nota.client?.name);
      const cnpjCliente = normalizarTexto(nota.client?.cnpj);
      const tomador = normalizarTexto(nota.service_taker);
      const cidade = normalizarTexto(nota.service_city);
      const codigo = normalizarTexto(nota.tax_code);
      const descricao = normalizarTexto(nota.service_description);
      const chave = normalizarTexto(nota.nfse_key);
      const status = normalizarTexto(nota.status);
      const erro = normalizarTexto(nota.error_message);

      const valor = Number(nota.service_value || 0);

      const dataReferencia = nota.competency_date || nota.created_at;
      const dataNota = dataReferencia ? new Date(dataReferencia) : null;
      const inicio = dataInicial ? new Date(`${dataInicial}T00:00:00`) : null;
      const fim = dataFinal ? new Date(`${dataFinal}T23:59:59`) : null;

      const passouBusca =
        !textoBusca ||
        nomeCliente.includes(textoBusca) ||
        cnpjCliente.includes(textoBusca) ||
        tomador.includes(textoBusca) ||
        cidade.includes(textoBusca) ||
        codigo.includes(textoBusca) ||
        descricao.includes(textoBusca) ||
        chave.includes(textoBusca) ||
        erro.includes(textoBusca) ||
        String(nota.id).includes(textoBusca);

      const passouTomador = !textoTomador || tomador.includes(textoTomador);
      const passouCnpj = !textoCnpj || cnpjCliente.includes(textoCnpj);
      const passouCidade = !textoCidade || cidade.includes(textoCidade);
      const passouStatus = !textoStatus || status.includes(textoStatus);
      const passouMinimo = minimo === null || valor >= minimo;
      const passouMaximo = maximo === null || valor <= maximo;
      const passouDataInicial = !inicio || (dataNota ? dataNota >= inicio : false);
      const passouDataFinal = !fim || (dataNota ? dataNota <= fim : false);

      return (
        passouBusca &&
        passouTomador &&
        passouCnpj &&
        passouCidade &&
        passouStatus &&
        passouMinimo &&
        passouMaximo &&
        passouDataInicial &&
        passouDataFinal
      );
    });
  }, [
    notas,
    busca,
    filtroTomador,
    filtroCnpj,
    filtroCidade,
    filtroStatus,
    valorMinimo,
    valorMaximo,
    dataInicial,
    dataFinal,
  ]);

  const resumo = useMemo(() => {
    const total = notasFiltradas.length;
    const valorTotal = notasFiltradas.reduce(
      (acc, nota) => acc + Number(nota.service_value || 0),
      0
    );

    const sucesso = notasFiltradas.filter((nota) => nota.status === "success").length;
    const erro = notasFiltradas.filter((nota) => nota.status === "error").length;

    return {
      total,
      valorTotal,
      selecionadas: selecionadas.length,
      sucesso,
      erro,
    };
  }, [notasFiltradas, selecionadas]);

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <section style={heroCardStyle}>
          <div style={heroLeftStyle}>
            <span style={heroTagStyle}>Histórico fiscal</span>
            <h1 style={heroTitleStyle}>Visualize, filtre e exporte as notas registradas</h1>
            <p style={heroTextStyle}>
              Agora a tela usa a estrutura oficial da invoices, com status, erro, chave da NFS-e e exportação em ZIP.
            </p>
          </div>

          <div style={heroRightStyle}>
            <span style={heroInfoLabelStyle}>Empresa logada</span>
            <strong style={heroInfoValueStyle}>
              {empresa?.name || "Carregando..."}
            </strong>
          </div>
        </section>

        <section style={filterCardStyle}>
          <h2 style={sectionTitleStyle}>Filtros</h2>
          <p style={sectionTextStyle}>
            Filtre as notas por cliente, tomador, cidade, status, valor e período.
          </p>

          <div style={filtersGridStyle}>
            <div>
              <label style={labelStyle}>Busca geral</label>
              <input
                type="text"
                placeholder="Cliente, CNPJ, tomador, código, chave..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Tomador</label>
              <input
                type="text"
                placeholder="Filtrar por tomador"
                value={filtroTomador}
                onChange={(e) => setFiltroTomador(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>CNPJ</label>
              <input
                type="text"
                placeholder="Filtrar por CNPJ"
                value={filtroCnpj}
                onChange={(e) => setFiltroCnpj(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Cidade</label>
              <input
                type="text"
                placeholder="Filtrar por cidade"
                value={filtroCidade}
                onChange={(e) => setFiltroCidade(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                style={inputStyle}
              >
                <option value="">Todos</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Valor mínimo</label>
              <input
                type="text"
                placeholder="Ex.: 100,00"
                value={valorMinimo}
                onChange={(e) => setValorMinimo(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Valor máximo</label>
              <input
                type="text"
                placeholder="Ex.: 5000,00"
                value={valorMaximo}
                onChange={(e) => setValorMaximo(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Data inicial</label>
              <input
                type="date"
                value={dataInicial}
                onChange={(e) => setDataInicial(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Data final</label>
              <input
                type="date"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={filterActionsStyle}>
            <button type="button" onClick={limparFiltros} style={secondaryButtonStyle}>
              Limpar filtros
            </button>
          </div>
        </section>

        <section style={summaryGridStyle}>
          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Notas filtradas</span>
            <strong style={summaryValueStyle}>{resumo.total}</strong>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Valor total filtrado</span>
            <strong style={summaryValueStyle}>
              {formatarValor(resumo.valorTotal)}
            </strong>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Selecionadas</span>
            <strong style={summaryValueStyle}>{resumo.selecionadas}</strong>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Sucesso</span>
            <strong style={summaryValueStyle}>{resumo.sucesso}</strong>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Erro</span>
            <strong style={summaryValueStyle}>{resumo.erro}</strong>
          </div>
        </section>

        <section style={tableCardStyle}>
          <div style={cardHeaderStyle}>
            <div>
              <h3 style={cardTitleStyle}>Lista de notas</h3>
              <p style={cardTextStyle}>
                Histórico da empresa com filtros, status, erro e exportação.
              </p>
            </div>

            <div style={headerButtonsStyle}>
              <button type="button" onClick={carregarNotas} style={secondaryButtonStyle}>
                Atualizar
              </button>

              <button
                type="button"
                onClick={selecionarTodasFiltradas}
                style={secondaryButtonStyle}
              >
                Selecionar filtradas
              </button>
            </div>
          </div>

          {selecionadas.length > 0 && (
            <div style={bulkActionsWrapperStyle}>
              <div style={bulkInfoStyle}>
                <strong>{selecionadas.length}</strong> nota(s) selecionada(s)
              </div>

              <div style={bulkButtonsStyle}>
                <button
                  type="button"
                  onClick={limparSelecao}
                  style={secondaryButtonStyle}
                  disabled={baixandoZip}
                >
                  Limpar seleção
                </button>

                <button
                  type="button"
                  onClick={() => baixarZipSelecionadas("pdf")}
                  style={secondaryButtonStyle}
                  disabled={baixandoZip}
                >
                  {baixandoZip ? "Gerando ZIP..." : "ZIP com PDFs"}
                </button>

                <button
                  type="button"
                  onClick={() => baixarZipSelecionadas("xml")}
                  style={secondaryButtonStyle}
                  disabled={baixandoZip}
                >
                  {baixandoZip ? "Gerando ZIP..." : "ZIP com XMLs"}
                </button>

                <button
                  type="button"
                  onClick={() => baixarZipSelecionadas("ambos")}
                  style={primaryButtonStyle}
                  disabled={baixandoZip}
                >
                  {baixandoZip ? "Gerando ZIP..." : "ZIP com PDF + XML"}
                </button>
              </div>
            </div>
          )}

          {mensagem && <div style={errorMessageStyle}>{mensagem}</div>}

          {loading ? (
            <div style={loadingBoxStyle}>Carregando dados...</div>
          ) : notasFiltradas.length === 0 ? (
            <div style={emptyBoxStyle}>
              Nenhuma nota foi encontrada com os filtros selecionados.
            </div>
          ) : (
            <div style={tableWrapperStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Selecionar</th>
                    <th style={thStyle}>Data</th>
                    <th style={thStyle}>Competência</th>
                    <th style={thStyle}>Cliente</th>
                    <th style={thStyle}>CNPJ</th>
                    <th style={thStyle}>Tomador</th>
                    <th style={thStyle}>Código</th>
                    <th style={thStyle}>Cidade</th>
                    <th style={thStyle}>Descrição</th>
                    <th style={thStyle}>Valor</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Chave NFS-e</th>
                    <th style={thStyle}>Erro</th>
                    <th style={thStyle}>PDF</th>
                    <th style={thStyle}>XML</th>
                  </tr>
                </thead>

                <tbody>
                  {notasFiltradas.map((nota) => {
                    const estaSelecionada = selecionadas.includes(nota.id);
                    const pdfFinal = obterUrlPdf(nota);
                    const xmlFinal = obterUrlXml(nota);

                    return (
                      <tr
                        key={nota.id}
                        style={estaSelecionada ? trSelectedStyle : undefined}
                      >
                        <td style={tdStyle}>
                          <input
                            type="checkbox"
                            checked={estaSelecionada}
                            onChange={() => alternarSelecao(nota.id)}
                          />
                        </td>

                        <td style={tdStyle}>{formatarData(nota.created_at)}</td>
                        <td style={tdStyle}>{formatarData(nota.competency_date)}</td>
                        <td style={tdStyle}>
                          {nota.client?.name || "-"}
                        </td>
                        <td style={tdStyle}>{nota.client?.cnpj || "-"}</td>
                        <td style={tdStyle}>{nota.service_taker || "-"}</td>
                        <td style={tdStyle}>{nota.tax_code || "-"}</td>
                        <td style={tdStyle}>{nota.service_city || "-"}</td>
                        <td style={tdStyle}>{nota.service_description || "-"}</td>
                        <td style={tdStyle}>{formatarValor(nota.service_value)}</td>
                        <td style={tdStyle}>{renderStatus(nota.status)}</td>
                        <td style={tdStyle}>{nota.nfse_key || "-"}</td>
                        <td style={tdStyle}>
                          {nota.error_message ? (
                            <span style={errorInlineStyle}>{nota.error_message}</span>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td style={tdStyle}>
                          {pdfFinal ? (
                            <button
                              type="button"
                              onClick={() => abrirArquivo(pdfFinal, "PDF")}
                              style={linkButtonStyle}
                            >
                              Baixar PDF
                            </button>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td style={tdStyle}>
                          {xmlFinal ? (
                            <button
                              type="button"
                              onClick={() => abrirArquivo(xmlFinal, "XML")}
                              style={linkButtonStyle}
                            >
                              Baixar XML
                            </button>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div style={footerActionsStyle}>
          <Link href="/dashboard-empresa" style={secondaryLinkStyle}>
            Voltar ao menu principal
          </Link>

          <Link href="/emitir" style={primaryLinkStyle}>
            Emitir nova nota
          </Link>
        </div>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f8fafc",
  padding: "20px",
  fontFamily: "Arial, sans-serif",
};

const containerStyle: React.CSSProperties = {
  maxWidth: "1280px",
  margin: "0 auto",
};

const heroCardStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  padding: "28px 20px",
  borderRadius: "24px",
  background: "linear-gradient(90deg, #0f172a 0%, #1e293b 100%)",
  color: "#ffffff",
  marginBottom: "16px",
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
  fontSize: "18px",
  lineHeight: 1.4,
  fontWeight: 800,
};

const heroTextStyle: React.CSSProperties = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#e2e8f0",
  fontSize: "14px",
  lineHeight: 1.6,
};

const heroRightStyle: React.CSSProperties = {
  minWidth: "220px",
  padding: "16px",
  borderRadius: "16px",
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

const filterCardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "24px",
  padding: "18px",
  marginBottom: "16px",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "18px",
  fontWeight: 800,
  color: "#0f172a",
};

const sectionTextStyle: React.CSSProperties = {
  marginTop: "8px",
  marginBottom: "14px",
  color: "#64748b",
  fontSize: "14px",
};

const filtersGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "12px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "6px",
  fontSize: "13px",
  color: "#0f172a",
  fontWeight: 700,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: "12px",
  padding: "12px 14px",
  fontSize: "14px",
  outline: "none",
  backgroundColor: "#ffffff",
  boxSizing: "border-box",
};

const filterActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "16px",
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "16px",
};

const summaryCardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
  padding: "18px",
};

const summaryLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#64748b",
  marginBottom: "8px",
};

const summaryValueStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 800,
  color: "#0f172a",
};

const tableCardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "24px",
  padding: "18px",
};

const cardHeaderStyle: React.CSSProperties = {
  marginBottom: "14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

const cardTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "18px",
  fontWeight: 800,
  color: "#111827",
};

const cardTextStyle: React.CSSProperties = {
  marginTop: "6px",
  marginBottom: 0,
  color: "#6b7280",
  fontSize: "13px",
};

const headerButtonsStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const bulkActionsWrapperStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  flexWrap: "wrap",
  marginBottom: "18px",
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "12px",
};

const bulkInfoStyle: React.CSSProperties = {
  color: "#0f172a",
  fontSize: "14px",
};

const bulkButtonsStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const tableWrapperStyle: React.CSSProperties = {
  overflowX: "auto",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "1500px",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 10px",
  borderBottom: "1px solid #cbd5e1",
  fontSize: "12px",
  color: "#334155",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 10px",
  borderBottom: "1px solid #e2e8f0",
  fontSize: "13px",
  color: "#0f172a",
  verticalAlign: "middle",
};

const trSelectedStyle: React.CSSProperties = {
  backgroundColor: "#eff6ff",
};

const linkButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#2563eb",
  fontWeight: 700,
  cursor: "pointer",
  padding: 0,
};

const secondaryButtonStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  color: "#1e293b",
  border: "1px solid #cbd5e1",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
};

const loadingBoxStyle: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "18px",
  color: "#475569",
};

const emptyBoxStyle: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  border: "1px dashed #cbd5e1",
  borderRadius: "16px",
  padding: "20px",
  color: "#64748b",
};

const errorMessageStyle: React.CSSProperties = {
  marginBottom: "16px",
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  borderRadius: "14px",
  padding: "12px 14px",
  fontSize: "14px",
};

const errorInlineStyle: React.CSSProperties = {
  color: "#991b1b",
  fontWeight: 700,
};

const footerActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "16px",
};

const secondaryLinkStyle: React.CSSProperties = {
  textDecoration: "none",
  backgroundColor: "#ffffff",
  color: "#1e293b",
  border: "1px solid #cbd5e1",
  borderRadius: "12px",
  padding: "12px 16px",
  fontSize: "14px",
  fontWeight: 700,
};

const primaryLinkStyle: React.CSSProperties = {
  textDecoration: "none",
  background: "#2563eb",
  color: "#ffffff",
  borderRadius: "12px",
  padding: "12px 16px",
  fontSize: "14px",
  fontWeight: 700,
};

const tagBaseStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: 800,
};

const tagSuccessStyle: React.CSSProperties = {
  ...tagBaseStyle,
  backgroundColor: "#dcfce7",
  color: "#166534",
};

const tagProcessingStyle: React.CSSProperties = {
  ...tagBaseStyle,
  backgroundColor: "#dbeafe",
  color: "#1d4ed8",
};

const tagPendingStyle: React.CSSProperties = {
  ...tagBaseStyle,
  backgroundColor: "#fef3c7",
  color: "#92400e",
};

const tagErrorStyle: React.CSSProperties = {
  ...tagBaseStyle,
  backgroundColor: "#fee2e2",
  color: "#991b1b",
};

const tagCanceledStyle: React.CSSProperties = {
  ...tagBaseStyle,
  backgroundColor: "#e5e7eb",
  color: "#374151",
};

const tagNeutralStyle: React.CSSProperties = {
  ...tagBaseStyle,
  backgroundColor: "#e2e8f0",
  color: "#334155",
};