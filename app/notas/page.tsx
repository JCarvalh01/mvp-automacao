"use client";

import Link from "next/link";
import JSZip from "jszip";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ProtectedPageLoader from "@/components/ProtectedPageLoader";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { getPartnerCompanySession } from "@/lib/session";
import EmpresaPageShell from "@/components/EmpresaPageShell";

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
  competency_date: string;
  service_taker: string | null;
  tax_code: string | null;
  service_city: string | null;
  service_value: number;
  service_description: string | null;
  status: string | null;
  error_message: string | null;
  pdf_path: string | null;
  xml_path: string | null;
  pdf_url?: string | null;
  xml_url?: string | null;
  nfse_key?: string | null;
  client?: Cliente | Cliente[] | null;
};

const ITENS_POR_PAGINA = 50;

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

function getClienteNormalizado(cliente: Nota["client"]): Cliente | null {
  if (!cliente) return null;
  if (Array.isArray(cliente)) return cliente[0] || null;
  return cliente;
}

function getStatusMeta(status?: string | null, errorMessage?: string | null) {
  const valor = String(status || "").toLowerCase();
  const temMensagem = !!String(errorMessage || "").trim();

  if (valor === "success" && temMensagem) {
    return {
      label: "Emitida com aviso",
      bg: "rgba(59,130,246,0.12)",
      border: "1px solid rgba(59,130,246,0.22)",
      color: "#dbeafe",
    };
  }

  if (valor === "success") {
    return {
      label: "Emitida",
      bg: "rgba(16,185,129,0.14)",
      border: "1px solid rgba(16,185,129,0.25)",
      color: "#bbf7d0",
    };
  }

  if (valor === "pending" || valor === "processing") {
    return {
      label: "Processando",
      bg: "rgba(245,158,11,0.14)",
      border: "1px solid rgba(245,158,11,0.25)",
      color: "#fde68a",
    };
  }

  if (valor === "error") {
    return {
      label: "Erro",
      bg: "rgba(239,68,68,0.14)",
      border: "1px solid rgba(239,68,68,0.24)",
      color: "#fecaca",
    };
  }

  if (valor === "canceled") {
    return {
      label: "Cancelada",
      bg: "rgba(148,163,184,0.14)",
      border: "1px solid rgba(148,163,184,0.24)",
      color: "#cbd5e1",
    };
  }

  return {
    label: status || "Sem status",
    bg: "rgba(59,130,246,0.12)",
    border: "1px solid rgba(59,130,246,0.22)",
    color: "#dbeafe",
  };
}

function getStatusFiltro(status?: string | null, errorMessage?: string | null) {
  const valor = String(status || "").toLowerCase();
  const temMensagem = !!String(errorMessage || "").trim();

  if (valor === "success" && temMensagem) return "success_warning";
  if (valor === "success") return "success";
  if (valor === "pending" || valor === "processing") return "processing";
  if (valor === "error") return "error";
  if (valor === "canceled") return "canceled";
  return "other";
}

function parseDateOnly(valor?: string | null) {
  const texto = String(valor || "").trim();
  if (!texto) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const [ano, mes, dia] = texto.split("-").map(Number);
    return new Date(ano, mes - 1, dia, 12, 0, 0, 0);
  }

  const data = new Date(texto);
  if (Number.isNaN(data.getTime())) return null;

  return new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate(),
    12,
    0,
    0,
    0
  );
}

function isDateInRange(
  valor: string | null | undefined,
  dataInicial?: string,
  dataFinal?: string
) {
  const dataNota = parseDateOnly(valor);
  if (!dataNota) return false;

  const inicio = dataInicial ? parseDateOnly(dataInicial) : null;
  const fim = dataFinal ? parseDateOnly(dataFinal) : null;

  if (inicio && dataNota < inicio) return false;
  if (fim && dataNota > fim) return false;

  return true;
}

export default function NotasPage() {
  const { isLoading: loadingAccess, isAuthorized: authorized } = useProtectedRoute();

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState("");

  const [busca, setBusca] = useState("");
  const [filtroTomador, setFiltroTomador] = useState("");
  const [filtroCnpj, setFiltroCnpj] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [valorMinimo, setValorMinimo] = useState("");
  const [valorMaximo, setValorMaximo] = useState("");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");

  const [selecionadas, setSelecionadas] = useState<number[]>([]);
  const [baixandoZip, setBaixandoZip] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [paginaDigitada, setPaginaDigitada] = useState("1");

  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const bottomScrollRef = useRef<HTMLDivElement | null>(null);
  const topSpacerRef = useRef<HTMLDivElement | null>(null);
  const isSyncingScrollRef = useRef(false);

  useEffect(() => {
    if (!loadingAccess && authorized) {
      carregarNotas();
    }
  }, [loadingAccess, authorized]);

  useEffect(() => {
    setPaginaAtual(1);
    setPaginaDigitada("1");
    setSelecionadas([]);
  }, [
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

  useEffect(() => {
    setPaginaDigitada(String(paginaAtual));
  }, [paginaAtual]);

  useEffect(() => {
    function sincronizarLargura() {
      if (!bottomScrollRef.current || !topSpacerRef.current) return;
      topSpacerRef.current.style.width = `${bottomScrollRef.current.scrollWidth}px`;
    }

    sincronizarLargura();
    window.addEventListener("resize", sincronizarLargura);

    return () => {
      window.removeEventListener("resize", sincronizarLargura);
    };
  }, [notas, loading]);

  function syncHorizontalScroll(origem: "top" | "bottom") {
    if (isSyncingScrollRef.current) return;

    isSyncingScrollRef.current = true;

    if (origem === "top" && topScrollRef.current && bottomScrollRef.current) {
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }

    if (origem === "bottom" && topScrollRef.current && bottomScrollRef.current) {
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }

    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  }

  async function carregarNotas() {
    try {
      setLoading(true);
      setMensagem("");

      const empresaSessao = getPartnerCompanySession();

      if (!empresaSessao?.id) {
        setEmpresa(null);
        setNotas([]);
        setMensagem("Nenhuma empresa encontrada na sessão.");
        setLoading(false);
        return;
      }

      const { data: empresaData, error: empresaError } = await supabase
        .from("partner_companies")
        .select("*")
        .eq("id", empresaSessao.id)
        .single();

      if (empresaError || !empresaData) {
        console.log("Erro ao buscar empresa:", empresaError);
        setEmpresa(null);
        setNotas([]);
        setMensagem("Nenhuma empresa parceira encontrada.");
        setLoading(false);
        return;
      }

      setEmpresa(empresaData as Empresa);

      const { data: notasData, error: notasError } = await supabase
        .from("invoices")
        .select(`
          id,
          created_at,
          client_id,
          partner_company_id,
          competency_date,
          service_taker,
          tax_code,
          service_city,
          service_value,
          service_description,
          status,
          error_message,
          pdf_path,
          xml_path,
          pdf_url,
          xml_url,
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
        setNotas([]);
        setLoading(false);
        return;
      }

      setNotas((notasData as Nota[]) || []);
      setLoading(false);
    } catch (error) {
      console.log("Erro inesperado:", error);
      setMensagem("Erro inesperado ao carregar a página.");
      setNotas([]);
      setLoading(false);
    }
  }

  function getArquivoUrl(nota: Nota, tipo: "PDF" | "XML") {
    if (tipo === "PDF") {
      return nota.pdf_url || nota.pdf_path || null;
    }
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

  function selecionarTodasDaPagina() {
    setSelecionadas(notasPaginadas.map((nota) => nota.id));
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
    setFiltroStatus("todos");
    setValorMinimo("");
    setValorMaximo("");
    setDataInicial("");
    setDataFinal("");
    setSelecionadas([]);
    setPaginaAtual(1);
    setPaginaDigitada("1");
  }

  function irParaPaginaDesejada() {
    const numero = Number(paginaDigitada);

    if (!Number.isInteger(numero) || Number.isNaN(numero)) {
      setPaginaDigitada(String(paginaAtual));
      return;
    }

    const paginaValida = Math.min(Math.max(numero, 1), totalPaginas);
    setPaginaAtual(paginaValida);
    setPaginaDigitada(String(paginaValida));
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
        const clienteNormalizado = getClienteNormalizado(nota.client);
        const nomeCliente =
          clienteNormalizado?.name?.trim().replace(/[^\w\-]+/g, "_") || "cliente";
        const dataNota = formatarDataArquivo(nota.created_at);
        const prefixo = `nota_${nota.id}_${nomeCliente}_${dataNota}`;

        const pdfUrl = getArquivoUrl(nota, "PDF");
        const xmlUrl = getArquivoUrl(nota, "XML");

        if ((tipo === "pdf" || tipo === "ambos") && pdfUrl) {
          try {
            const response = await fetch(pdfUrl);
            if (response.ok) {
              const blob = await response.blob();
              pastaPrincipal.file(`${prefixo}.pdf`, blob);
              arquivosAdicionados++;
            }
          } catch (error) {
            console.log(`Erro ao baixar PDF da nota ${nota.id}:`, error);
          }
        }

        if ((tipo === "xml" || tipo === "ambos") && xmlUrl) {
          try {
            const response = await fetch(xmlUrl);
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
        alert(
          "As notas selecionadas não possuem arquivos disponíveis para gerar o ZIP."
        );
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

  const notasFiltradas = useMemo(() => {
    const minimo = converterValorTextoParaNumero(valorMinimo);
    const maximo = converterValorTextoParaNumero(valorMaximo);

    return notas.filter((nota) => {
      const clienteNormalizado = getClienteNormalizado(nota.client);

      const textoBusca = normalizarTexto(busca);
      const textoTomador = normalizarTexto(filtroTomador);
      const textoCnpj = normalizarTexto(filtroCnpj);
      const textoCidade = normalizarTexto(filtroCidade);

      const nomeCliente = normalizarTexto(clienteNormalizado?.name);
      const cnpjCliente = normalizarTexto(clienteNormalizado?.cnpj);
      const tomador = normalizarTexto(nota.service_taker);
      const cidade = normalizarTexto(nota.service_city);
      const codigo = normalizarTexto(nota.tax_code);
      const descricao = normalizarTexto(nota.service_description);
      const chave = normalizarTexto(nota.nfse_key);
      const mensagemErro = normalizarTexto(nota.error_message);
      const status = normalizarTexto(nota.status);
      const statusFiltroNota = getStatusFiltro(nota.status, nota.error_message);

      const valor = Number(nota.service_value || 0);
      const dataBase = nota.competency_date || nota.created_at;
      const passouDataInicialEFinal =
        (!dataInicial && !dataFinal) ||
        isDateInRange(dataBase, dataInicial, dataFinal);

      const passouBusca =
        !textoBusca ||
        nomeCliente.includes(textoBusca) ||
        cnpjCliente.includes(textoBusca) ||
        tomador.includes(textoBusca) ||
        cidade.includes(textoBusca) ||
        codigo.includes(textoBusca) ||
        descricao.includes(textoBusca) ||
        chave.includes(textoBusca) ||
        mensagemErro.includes(textoBusca) ||
        status.includes(textoBusca) ||
        String(nota.id).includes(textoBusca);

      const passouTomador = !textoTomador || tomador.includes(textoTomador);
      const passouCnpj = !textoCnpj || cnpjCliente.includes(textoCnpj);
      const passouCidade = !textoCidade || cidade.includes(textoCidade);
      const passouStatus =
        filtroStatus === "todos" || statusFiltroNota === filtroStatus;
      const passouMinimo = minimo === null || valor >= minimo;
      const passouMaximo = maximo === null || valor <= maximo;

      return (
        passouBusca &&
        passouTomador &&
        passouCnpj &&
        passouCidade &&
        passouStatus &&
        passouMinimo &&
        passouMaximo &&
        passouDataInicialEFinal
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

  const totalPaginas = useMemo(() => {
    return Math.max(1, Math.ceil(notasFiltradas.length / ITENS_POR_PAGINA));
  }, [notasFiltradas.length]);

  const notasPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
    const fim = inicio + ITENS_POR_PAGINA;
    return notasFiltradas.slice(inicio, fim);
  }, [notasFiltradas, paginaAtual]);

  const resumo = useMemo(() => {
    const total = notasFiltradas.length;
    const valorTotal = notasFiltradas.reduce(
      (acc, nota) => acc + Number(nota.service_value || 0),
      0
    );

    const sucessos = notasFiltradas.filter(
      (nota) => String(nota.status || "").toLowerCase() === "success"
    ).length;

    const erros = notasFiltradas.filter(
      (nota) => String(nota.status || "").toLowerCase() === "error"
    ).length;

    return {
      total,
      valorTotal,
      selecionadas: selecionadas.length,
      sucessos,
      erros,
    };
  }, [notasFiltradas, selecionadas]);

  const indiceInicialPagina = notasFiltradas.length
    ? (paginaAtual - 1) * ITENS_POR_PAGINA + 1
    : 0;

  const indiceFinalPagina = Math.min(
    paginaAtual * ITENS_POR_PAGINA,
    notasFiltradas.length
  );

  if (loadingAccess) {
    return <ProtectedPageLoader label="Validando acesso da empresa..." />;
  }

  if (!authorized) {
    return null;
  }

  return (
    <EmpresaPageShell
      title="Notas Emitidas"
      subtitle="Visualize, filtre e exporte as notas registradas da empresa."
    >
      <div style={containerStyle}>
        <section style={heroCardStyle}>
          <div style={heroLeftStyle}>
            <span style={heroTagStyle}>Histórico fiscal</span>
            <h1 style={heroTitleStyle}>
              Visualize, filtre e exporte as notas registradas
            </h1>
            <p style={heroTextStyle}>
              Consulte o histórico da operação fiscal com filtros mais completos,
              status operacionais, paginação e exportação em lote.
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
            Filtre as notas por dados do cliente, tomador, cidade, valor, período e status.
          </p>

          <div style={filtersGridStyle}>
            <div>
              <label style={labelStyle}>Busca geral</label>
              <input
                type="text"
                placeholder="Cliente, CNPJ, tomador, código, status..."
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
                <option value="todos">Todos</option>
                <option value="success">Emitida</option>
                <option value="success_warning">Emitida com aviso</option>
                <option value="processing">Processando</option>
                <option value="error">Erro</option>
                <option value="canceled">Cancelada</option>
                <option value="other">Outros</option>
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
            <button
              type="button"
              onClick={limparFiltros}
              style={secondaryButtonStyle}
            >
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
            <span style={summaryLabelStyle}>Emitidas com sucesso</span>
            <strong style={summaryValueStyle}>{resumo.sucessos}</strong>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Com erro</span>
            <strong style={summaryValueStyle}>{resumo.erros}</strong>
          </div>
        </section>

        <section style={tableCardStyle}>
          <div style={cardHeaderStyle}>
            <div>
              <h3 style={cardTitleStyle}>Lista de notas</h3>
              <p style={cardTextStyle}>
                Histórico da empresa com filtros, seleção múltipla, paginação e exportação.
              </p>
            </div>

            <div style={headerButtonsStyle}>
              <button
                type="button"
                onClick={carregarNotas}
                style={secondaryButtonStyle}
              >
                Atualizar
              </button>

              <button
                type="button"
                onClick={selecionarTodasDaPagina}
                style={secondaryButtonStyle}
              >
                Selecionar página
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

          {!loading && notasFiltradas.length > 0 && (
            <div style={tableMetaBarStyle}>
              <span style={tableMetaTextStyle}>
                Mostrando <strong>{indiceInicialPagina}</strong> até <strong>{indiceFinalPagina}</strong> de{" "}
                <strong>{notasFiltradas.length}</strong> nota(s)
              </span>

              <span style={tableMetaTextStyle}>
                Página <strong>{paginaAtual}</strong> de <strong>{totalPaginas}</strong>
              </span>
            </div>
          )}

          {loading ? (
            <div style={loadingBoxStyle}>Carregando dados...</div>
          ) : notasFiltradas.length === 0 ? (
            <div style={emptyBoxStyle}>
              Nenhuma nota foi encontrada com os filtros selecionados.
            </div>
          ) : (
            <>
              <div
                ref={topScrollRef}
                onScroll={() => syncHorizontalScroll("top")}
                style={topHorizontalScrollStyle}
              >
                <div ref={topSpacerRef} style={topHorizontalSpacerStyle} />
              </div>

              <div
                ref={bottomScrollRef}
                onScroll={() => syncHorizontalScroll("bottom")}
                style={tableWrapperStyle}
              >
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Selecionar</th>
                      <th style={thStyle}>Data</th>
                      <th style={thStyle}>Cliente</th>
                      <th style={thStyle}>CNPJ</th>
                      <th style={thStyle}>Tomador</th>
                      <th style={thStyle}>Código</th>
                      <th style={thStyle}>Cidade</th>
                      <th style={thStyle}>Descrição</th>
                      <th style={thStyle}>Valor</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Mensagem</th>
                      <th style={thStyle}>PDF</th>
                      <th style={thStyle}>XML</th>
                    </tr>
                  </thead>

                  <tbody>
                    {notasPaginadas.map((nota) => {
                      const estaSelecionada = selecionadas.includes(nota.id);
                      const clienteNormalizado = getClienteNormalizado(nota.client);
                      const statusMeta = getStatusMeta(nota.status, nota.error_message);
                      const pdfUrl = getArquivoUrl(nota, "PDF");
                      const xmlUrl = getArquivoUrl(nota, "XML");

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

                          <td style={tdStyle}>
                            {formatarData(nota.competency_date || nota.created_at)}
                          </td>

                          <td style={tdStyle}>
                            {clienteNormalizado?.name || nota.service_taker || "-"}
                          </td>

                          <td style={tdStyle}>{clienteNormalizado?.cnpj || "-"}</td>
                          <td style={tdStyle}>{nota.service_taker || "-"}</td>
                          <td style={tdStyle}>{nota.tax_code || "-"}</td>
                          <td style={tdStyle}>{nota.service_city || "-"}</td>
                          <td style={tdStyle}>{nota.service_description || "-"}</td>
                          <td style={tdStyle}>{formatarValor(nota.service_value)}</td>

                          <td style={tdStyle}>
                            <span
                              style={{
                                ...statusBadgeStyle,
                                background: statusMeta.bg,
                                border: statusMeta.border,
                                color: statusMeta.color,
                              }}
                            >
                              {statusMeta.label}
                            </span>
                          </td>

                          <td style={tdStyle}>
                            <span style={messageCellStyle}>
                              {nota.error_message || "-"}
                            </span>
                          </td>

                          <td style={tdStyle}>
                            {pdfUrl ? (
                              <button
                                type="button"
                                onClick={() => abrirArquivo(pdfUrl, "PDF")}
                                style={linkButtonStyle}
                              >
                                Baixar PDF
                              </button>
                            ) : (
                              "-"
                            )}
                          </td>

                          <td style={tdStyle}>
                            {xmlUrl ? (
                              <button
                                type="button"
                                onClick={() => abrirArquivo(xmlUrl, "XML")}
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

              <div style={paginationWrapperStyle}>
                <div style={paginationInfoStyle}>
                  50 registros por página
                </div>

                <div style={paginationButtonsStyle}>
                  <button
                    type="button"
                    onClick={() => setPaginaAtual(1)}
                    disabled={paginaAtual === 1}
                    style={paginaAtual === 1 ? disabledPaginationButtonStyle : paginationButtonStyle}
                  >
                    Primeira
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaginaAtual((atual) => Math.max(1, atual - 1))}
                    disabled={paginaAtual === 1}
                    style={paginaAtual === 1 ? disabledPaginationButtonStyle : paginationButtonStyle}
                  >
                    Anterior
                  </button>

                  <div style={paginationCurrentStyle}>
                    Página {paginaAtual} / {totalPaginas}
                  </div>

                  <div style={paginationGoToWrapperStyle}>
                    <input
                      type="number"
                      min={1}
                      max={totalPaginas}
                      value={paginaDigitada}
                      onChange={(e) => setPaginaDigitada(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          irParaPaginaDesejada();
                        }
                      }}
                      style={paginationInputStyle}
                    />

                    <button
                      type="button"
                      onClick={irParaPaginaDesejada}
                      style={paginationGoButtonStyle}
                    >
                      Ir
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setPaginaAtual((atual) => Math.min(totalPaginas, atual + 1))
                    }
                    disabled={paginaAtual === totalPaginas}
                    style={
                      paginaAtual === totalPaginas
                        ? disabledPaginationButtonStyle
                        : paginationButtonStyle
                    }
                  >
                    Próxima
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaginaAtual(totalPaginas)}
                    disabled={paginaAtual === totalPaginas}
                    style={
                      paginaAtual === totalPaginas
                        ? disabledPaginationButtonStyle
                        : paginationButtonStyle
                    }
                  >
                    Última
                  </button>
                </div>
              </div>
            </>
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
    </EmpresaPageShell>
  );
}

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
  background:
    "linear-gradient(135deg, rgba(2,6,23,0.92) 0%, rgba(15,23,42,0.96) 100%)",
  color: "#ffffff",
  marginBottom: "16px",
  flexWrap: "wrap",
  border: "1px solid rgba(59,130,246,0.16)",
  boxShadow: "0 18px 45px rgba(0, 0, 0, 0.35)",
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
  fontSize: "24px",
  lineHeight: 1.4,
  fontWeight: 800,
  color: "#ffffff",
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
  color: "#ffffff",
};

const filterCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.90) 0%, rgba(15,23,42,0.92) 100%)",
  border: "1px solid rgba(59,130,246,0.14)",
  borderRadius: "24px",
  padding: "18px",
  marginBottom: "16px",
  boxShadow: "0 14px 38px rgba(0, 0, 0, 0.28)",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "18px",
  fontWeight: 800,
  color: "#ffffff",
};

const sectionTextStyle: React.CSSProperties = {
  marginTop: "8px",
  marginBottom: "14px",
  color: "#94a3b8",
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
  color: "#93c5fd",
  fontWeight: 700,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(59,130,246,0.18)",
  borderRadius: "12px",
  padding: "12px 14px",
  fontSize: "14px",
  outline: "none",
  backgroundColor: "rgba(15,23,42,0.92)",
  color: "#ffffff",
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
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.90) 0%, rgba(15,23,42,0.92) 100%)",
  border: "1px solid rgba(59,130,246,0.14)",
  borderRadius: "20px",
  padding: "18px",
};

const summaryLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#93c5fd",
  marginBottom: "8px",
};

const summaryValueStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 800,
  color: "#ffffff",
};

const tableCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.90) 0%, rgba(15,23,42,0.92) 100%)",
  border: "1px solid rgba(59,130,246,0.14)",
  borderRadius: "24px",
  padding: "18px",
  boxShadow: "0 14px 38px rgba(0, 0, 0, 0.28)",
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
  color: "#ffffff",
};

const cardTextStyle: React.CSSProperties = {
  marginTop: "6px",
  marginBottom: 0,
  color: "#94a3b8",
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
  backgroundColor: "rgba(15,23,42,0.82)",
  border: "1px solid rgba(59,130,246,0.12)",
  borderRadius: "16px",
  padding: "12px",
};

const bulkInfoStyle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "14px",
};

const bulkButtonsStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const tableMetaBarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "12px",
};

const tableMetaTextStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#cbd5e1",
};

const topHorizontalScrollStyle: React.CSSProperties = {
  overflowX: "auto",
  overflowY: "hidden",
  height: "16px",
  marginBottom: "8px",
};

const topHorizontalSpacerStyle: React.CSSProperties = {
  height: "1px",
};

const tableWrapperStyle: React.CSSProperties = {
  overflowX: "auto",
  borderRadius: "14px",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "1350px",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 10px",
  borderBottom: "1px solid rgba(59,130,246,0.18)",
  fontSize: "12px",
  color: "#93c5fd",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 10px",
  borderBottom: "1px solid rgba(59,130,246,0.10)",
  fontSize: "13px",
  color: "#ffffff",
  verticalAlign: "middle",
};

const trSelectedStyle: React.CSSProperties = {
  backgroundColor: "rgba(37,99,235,0.10)",
};

const statusBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "7px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
};

const messageCellStyle: React.CSSProperties = {
  display: "block",
  maxWidth: "260px",
  color: "#cbd5e1",
  lineHeight: 1.5,
  wordBreak: "break-word",
};

const linkButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#60a5fa",
  fontWeight: 700,
  cursor: "pointer",
  padding: 0,
};

const secondaryButtonStyle: React.CSSProperties = {
  backgroundColor: "rgba(255,255,255,0.04)",
  color: "#e2e8f0",
  border: "1px solid rgba(148,163,184,0.20)",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: "#ffffff",
  border: "none",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
};

const paginationWrapperStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "16px",
  paddingTop: "14px",
  borderTop: "1px solid rgba(59,130,246,0.12)",
};

const paginationInfoStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "13px",
};

const paginationButtonsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
};

const paginationButtonStyle: React.CSSProperties = {
  backgroundColor: "rgba(255,255,255,0.04)",
  color: "#e2e8f0",
  border: "1px solid rgba(148,163,184,0.20)",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
};

const disabledPaginationButtonStyle: React.CSSProperties = {
  ...paginationButtonStyle,
  opacity: 0.45,
  cursor: "not-allowed",
};

const paginationCurrentStyle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 700,
  padding: "0 4px",
};

const paginationGoToWrapperStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "nowrap",
};

const paginationInputStyle: React.CSSProperties = {
  width: "84px",
  border: "1px solid rgba(59,130,246,0.18)",
  borderRadius: "12px",
  padding: "10px 12px",
  fontSize: "14px",
  outline: "none",
  backgroundColor: "rgba(15,23,42,0.92)",
  color: "#ffffff",
  boxSizing: "border-box",
  textAlign: "center",
};

const paginationGoButtonStyle: React.CSSProperties = {
  backgroundColor: "rgba(255,255,255,0.04)",
  color: "#e2e8f0",
  border: "1px solid rgba(148,163,184,0.20)",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
};

const loadingBoxStyle: React.CSSProperties = {
  backgroundColor: "rgba(15,23,42,0.82)",
  border: "1px solid rgba(59,130,246,0.12)",
  borderRadius: "16px",
  padding: "18px",
  color: "#cbd5e1",
};

const emptyBoxStyle: React.CSSProperties = {
  backgroundColor: "rgba(15,23,42,0.82)",
  border: "1px dashed rgba(59,130,246,0.20)",
  borderRadius: "16px",
  padding: "20px",
  color: "#94a3b8",
};

const errorMessageStyle: React.CSSProperties = {
  marginBottom: "16px",
  backgroundColor: "rgba(239,68,68,0.12)",
  border: "1px solid rgba(239,68,68,0.22)",
  color: "#fecaca",
  borderRadius: "14px",
  padding: "12px 14px",
  fontSize: "14px",
};

const footerActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "16px",
};

const secondaryLinkStyle: React.CSSProperties = {
  textDecoration: "none",
  backgroundColor: "rgba(255,255,255,0.04)",
  color: "#e2e8f0",
  border: "1px solid rgba(148,163,184,0.20)",
  borderRadius: "12px",
  padding: "12px 16px",
  fontSize: "14px",
  fontWeight: 700,
};

const primaryLinkStyle: React.CSSProperties = {
  textDecoration: "none",
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: "#ffffff",
  borderRadius: "12px",
  padding: "12px 16px",
  fontSize: "14px",
  fontWeight: 700,
};