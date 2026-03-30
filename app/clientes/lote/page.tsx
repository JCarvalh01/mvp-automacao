"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabaseClient";

type Empresa = {
  id: number;
  name: string;
};

type LinhaPlanilha = {
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  is_mei: string | boolean;
  mei_created_at: string;
};

type LinhaPreview = {
  rowNumber: number;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  is_mei: boolean;
  mei_created_at: string;
  status: "pronto" | "erro" | "importado";
  errors: string[];
};

type ResultadoImportacao = {
  success: number;
  failed: number;
  errors: { rowNumber: number; name: string; message: string }[];
};

function somenteNumeros(value: string) {
  return (value || "").replace(/\D/g, "");
}

function formatarCnpj(value: string) {
  const digits = somenteNumeros(value).slice(0, 14);

  if (digits.length !== 14) return value || "";

  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

function emailValido(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function converterExcelDate(value: any) {
  if (!value) return "";

  if (typeof value === "string") {
    const cleaned = value.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleaned)) {
      const [dd, mm, yyyy] = cleaned.split("/");
      return `${yyyy}-${mm}-${dd}`;
    }

    return cleaned;
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return "";
    const yyyy = parsed.y.toString().padStart(4, "0");
    const mm = parsed.m.toString().padStart(2, "0");
    const dd = parsed.d.toString().padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return "";
}

function normalizarIsMei(value: string | boolean) {
  if (typeof value === "boolean") return value;

  const texto = String(value || "")
    .trim()
    .toLowerCase();

  return texto === "true" || texto === "sim" || texto === "1" || texto === "mei";
}

export default function ClientesLotePage() {
  const router = useRouter();

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loadingEmpresa, setLoadingEmpresa] = useState(true);
  const [loadingArquivo, setLoadingArquivo] = useState(false);
  const [importando, setImportando] = useState(false);
  const [preview, setPreview] = useState<LinhaPreview[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [erroGeral, setErroGeral] = useState("");
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const empresaStorage = localStorage.getItem("partnerCompany");

    if (!empresaStorage) {
      router.push("/login-empresa");
      return;
    }

    try {
      const empresaConvertida: Empresa = JSON.parse(empresaStorage);
      setEmpresa(empresaConvertida);
    } catch (error) {
      console.log("Erro ao carregar empresa da sessão:", error);
      router.push("/login-empresa");
      return;
    } finally {
      setLoadingEmpresa(false);
    }
  }, [router]);

  function baixarModelo() {
    const dadosModelo = [
      {
        name: "João da Silva",
        cnpj: "12.345.678/0001-90",
        email: "joao@exemplo.com",
        phone: "11999999999",
        address: "Rua Exemplo, 123 - São Paulo/SP",
        password: "123456",
        is_mei: "true",
        mei_created_at: "2024-01-15",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(dadosModelo);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, "modelo-clientes-mvp.xlsx");
  }

  function validarLinhas(linhas: LinhaPlanilha[]) {
    const mapaCnpjs = new Map<string, number>();

    return linhas.map((item, index) => {
      const errors: string[] = [];
      const cnpjLimpo = somenteNumeros(item.cnpj);
      const email = String(item.email || "").trim();

      if (!String(item.name || "").trim()) errors.push("Nome obrigatório.");
      if (!cnpjLimpo) errors.push("CNPJ obrigatório.");
      if (cnpjLimpo && cnpjLimpo.length !== 14) {
        errors.push("CNPJ deve ter 14 dígitos.");
      }
      if (!email) errors.push("Email obrigatório.");
      if (email && !emailValido(email)) errors.push("Email inválido.");
      if (!String(item.password || "").trim()) errors.push("Senha obrigatória.");

      if (cnpjLimpo) {
        if (mapaCnpjs.has(cnpjLimpo)) {
          errors.push("CNPJ duplicado na planilha.");
        } else {
          mapaCnpjs.set(cnpjLimpo, index + 2);
        }
      }

      return {
        rowNumber: index + 2,
        name: String(item.name || "").trim(),
        cnpj: formatarCnpj(String(item.cnpj || "")),
        email,
        phone: String(item.phone || "").trim(),
        address: String(item.address || "").trim(),
        password: String(item.password || "").trim(),
        is_mei: normalizarIsMei(item.is_mei),
        mei_created_at: converterExcelDate(item.mei_created_at),
        status: errors.length ? "erro" : "pronto",
        errors,
      } as LinhaPreview;
    });
  }

  async function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingArquivo(true);
    setMensagem("");
    setErroGeral("");
    setResultado(null);
    setPreview([]);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const primeiraAba = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[primeiraAba];

      const json = XLSX.utils.sheet_to_json<any>(worksheet, { defval: "" });

      if (!json.length) {
        setErroGeral("A planilha está vazia.");
        setLoadingArquivo(false);
        return;
      }

      const linhasTratadas: LinhaPlanilha[] = json.map((row) => ({
        name: row.name ?? row.nome ?? "",
        cnpj: row.cnpj ?? "",
        email: row.email ?? "",
        phone: row.phone ?? row.telefone ?? "",
        address: row.address ?? row.endereco ?? "",
        password: row.password ?? row.senha ?? "",
        is_mei: row.is_mei ?? row.mei ?? "true",
        mei_created_at: row.mei_created_at ?? row.data_abertura_mei ?? "",
      }));

      const linhasValidadas = validarLinhas(linhasTratadas);
      setPreview(linhasValidadas);
      setMensagem("Planilha carregada com sucesso.");
    } catch (error) {
      console.log(error);
      setErroGeral("Não foi possível ler a planilha.");
    } finally {
      setLoadingArquivo(false);
    }
  }

  const resumo = useMemo(() => {
    const total = preview.length;
    const validas = preview.filter((item) => item.status === "pronto").length;
    const invalidas = preview.filter((item) => item.status === "erro").length;

    return { total, validas, invalidas };
  }, [preview]);

  async function importarClientes() {
    try {
      setImportando(true);
      setMensagem("");
      setErroGeral("");
      setResultado(null);

      if (typeof window === "undefined") {
        setErroGeral("Não foi possível acessar a sessão da empresa.");
        setImportando(false);
        return;
      }

      const empresaStorage = localStorage.getItem("partnerCompany");

      if (!empresaStorage) {
        setErroGeral("Empresa não identificada. Faça login novamente.");
        setImportando(false);
        return;
      }

      const empresaConvertida: Empresa = JSON.parse(empresaStorage);
      const linhasProntas = preview.filter((item) => item.status === "pronto");

      if (!linhasProntas.length) {
        setErroGeral("Não há linhas válidas para importar.");
        setImportando(false);
        return;
      }

      const cnpjs = linhasProntas.map((item) => somenteNumeros(item.cnpj));

      const { data: existentes, error: errorExistentes } = await supabase
        .from("clients")
        .select("cnpj")
        .in("cnpj", cnpjs);

      if (errorExistentes) {
        setErroGeral("Erro ao verificar clientes já cadastrados.");
        setImportando(false);
        return;
      }

      const cnpjsExistentes = new Set(
        (existentes || []).map((item: any) => somenteNumeros(item.cnpj))
      );

      let success = 0;
      let failed = 0;
      const errors: { rowNumber: number; name: string; message: string }[] = [];

      const novoPreview = [...preview];

      for (const linha of linhasProntas) {
        const cnpjLimpo = somenteNumeros(linha.cnpj);

        if (cnpjsExistentes.has(cnpjLimpo)) {
          failed++;
          errors.push({
            rowNumber: linha.rowNumber,
            name: linha.name,
            message: "CNPJ já cadastrado no sistema.",
          });

          const index = novoPreview.findIndex((item) => item.rowNumber === linha.rowNumber);
          if (index >= 0) {
            novoPreview[index] = {
              ...novoPreview[index],
              status: "erro",
              errors: [...novoPreview[index].errors, "CNPJ já cadastrado no sistema."],
            };
          }

          continue;
        }

        const payload = {
          partner_company_id: empresaConvertida.id,
          name: linha.name,
          cnpj: cnpjLimpo,
          email: linha.email,
          phone: linha.phone,
          address: linha.address,
          password: linha.password,
          is_mei: linha.is_mei,
          mei_created_at: linha.mei_created_at || null,
        };

        const { error } = await supabase.from("clients").insert(payload);

        if (error) {
          failed++;
          errors.push({
            rowNumber: linha.rowNumber,
            name: linha.name,
            message: error.message || "Erro ao cadastrar cliente.",
          });

          const index = novoPreview.findIndex((item) => item.rowNumber === linha.rowNumber);
          if (index >= 0) {
            novoPreview[index] = {
              ...novoPreview[index],
              status: "erro",
              errors: [...novoPreview[index].errors, error.message || "Erro ao cadastrar cliente."],
            };
          }
        } else {
          success++;
          cnpjsExistentes.add(cnpjLimpo);

          const index = novoPreview.findIndex((item) => item.rowNumber === linha.rowNumber);
          if (index >= 0) {
            novoPreview[index] = {
              ...novoPreview[index],
              status: "importado",
              errors: [],
            };
          }
        }
      }

      setPreview(novoPreview);
      setResultado({ success, failed, errors });

      if (success > 0) {
        setMensagem(`${success} cliente(s) importado(s) com sucesso.`);
      }

      if (failed > 0 && success === 0) {
        setErroGeral("Nenhum cliente foi importado.");
      }
    } catch (error) {
      console.log(error);
      setErroGeral("Erro interno ao importar clientes.");
    } finally {
      setImportando(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #0f172a 0%, #111827 50%, #1e293b 100%)",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
        color: "#f8fafc",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div
          style={{
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(148, 163, 184, 0.18)",
            borderRadius: "24px",
            padding: "28px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
            marginBottom: "24px",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "13px",
              color: "#94a3b8",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            MVP Automação Fiscal
          </p>

          <h1
            style={{
              margin: "8px 0 10px 0",
              fontSize: "32px",
              fontWeight: "bold",
              color: "#ffffff",
            }}
          >
            Importação em lote
          </h1>

          <p style={{ margin: 0, color: "#cbd5e1" }}>
            {loadingEmpresa
              ? "Carregando empresa..."
              : empresa?.name
              ? `Importe vários clientes para a empresa: ${empresa.name}`
              : "Carregando empresa..."}
          </p>
        </div>

        {mensagem && (
          <div
            style={{
              backgroundColor: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              color: "#bbf7d0",
              borderRadius: "16px",
              padding: "16px 18px",
              marginBottom: "20px",
            }}
          >
            {mensagem}
          </div>
        )}

        {erroGeral && (
          <div
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              color: "#fecaca",
              borderRadius: "16px",
              padding: "16px 18px",
              marginBottom: "20px",
            }}
          >
            {erroGeral}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={baixarModelo}
            style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              color: "#ffffff",
              border: "none",
              padding: "14px 18px",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "bold",
              boxShadow: "0 10px 25px rgba(59,130,246,0.25)",
            }}
          >
            Baixar planilha modelo
          </button>

          <label
            style={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "#ffffff",
              border: "none",
              padding: "14px 18px",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "bold",
              boxShadow: "0 10px 25px rgba(16,185,129,0.25)",
            }}
          >
            {loadingArquivo ? "Lendo arquivo..." : "Selecionar planilha"}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleArquivo}
              style={{ display: "none" }}
            />
          </label>

          <Link
            href="/clientes"
            style={{
              backgroundColor: "transparent",
              color: "#ffffff",
              border: "1px solid rgba(148, 163, 184, 0.3)",
              padding: "14px 18px",
              borderRadius: "12px",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            Voltar para clientes
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <ResumoCard titulo="Total de linhas" valor={String(resumo.total)} />
          <ResumoCard titulo="Linhas prontas" valor={String(resumo.validas)} />
          <ResumoCard titulo="Linhas com erro" valor={String(resumo.invalidas)} />
        </div>

        <div
          style={{
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(148, 163, 184, 0.18)",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          }}
        >
          {preview.length === 0 ? (
            <div
              style={{
                border: "1px dashed rgba(148, 163, 184, 0.25)",
                borderRadius: "16px",
                padding: "28px",
                color: "#cbd5e1",
                textAlign: "center",
              }}
            >
              Selecione uma planilha para visualizar e importar os clientes.
            </div>
          ) : (
            <>
              <div style={{ overflowX: "auto", marginBottom: "20px" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "900px",
                  }}
                >
                  <thead>
                    <tr style={{ background: "rgba(30, 41, 59, 0.55)" }}>
                      <Th>Linha</Th>
                      <Th>Nome</Th>
                      <Th>CNPJ</Th>
                      <Th>Email</Th>
                      <Th>Telefone</Th>
                      <Th>Endereço</Th>
                      <Th>MEI</Th>
                      <Th>Abertura MEI</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((item) => (
                      <tr key={item.rowNumber}>
                        <Td>{String(item.rowNumber)}</Td>
                        <Td>{item.name || "-"}</Td>
                        <Td>{item.cnpj || "-"}</Td>
                        <Td>{item.email || "-"}</Td>
                        <Td>{item.phone || "-"}</Td>
                        <Td>{item.address || "-"}</Td>
                        <Td>{item.is_mei ? "Sim" : "Não"}</Td>
                        <Td>{item.mei_created_at || "-"}</Td>
                        <Td>
                          {item.status === "pronto" && (
                            <StatusCor
                              fundo="rgba(59,130,246,0.14)"
                              borda="1px solid rgba(59,130,246,0.25)"
                              cor="#93c5fd"
                              texto="Pronto"
                            />
                          )}

                          {item.status === "importado" && (
                            <StatusCor
                              fundo="rgba(16,185,129,0.14)"
                              borda="1px solid rgba(16,185,129,0.25)"
                              cor="#86efac"
                              texto="Importado"
                            />
                          )}

                          {item.status === "erro" && (
                            <div style={{ display: "grid", gap: "8px" }}>
                              <StatusCor
                                fundo="rgba(239,68,68,0.14)"
                                borda="1px solid rgba(239,68,68,0.25)"
                                cor="#fca5a5"
                                texto="Com erro"
                              />

                              {item.errors.map((erro, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    fontSize: "12px",
                                    color: "#fecaca",
                                  }}
                                >
                                  • {erro}
                                </div>
                              ))}
                            </div>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <p style={{ margin: 0, color: "#cbd5e1" }}>
                  Revise os dados antes de importar.
                </p>

                <button
                  type="button"
                  onClick={importarClientes}
                  disabled={importando || resumo.validas === 0 || loadingEmpresa}
                  style={{
                    background:
                      importando || resumo.validas === 0 || loadingEmpresa
                        ? "rgba(148, 163, 184, 0.3)"
                        : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "#ffffff",
                    border: "none",
                    padding: "14px 18px",
                    borderRadius: "12px",
                    cursor:
                      importando || resumo.validas === 0 || loadingEmpresa
                        ? "not-allowed"
                        : "pointer",
                    fontWeight: "bold",
                    boxShadow:
                      importando || resumo.validas === 0 || loadingEmpresa
                        ? "none"
                        : "0 10px 25px rgba(16,185,129,0.25)",
                  }}
                >
                  {importando ? "Importando..." : "Cadastrar clientes em lote"}
                </button>
              </div>
            </>
          )}
        </div>

        {resultado && (
          <div
            style={{
              background: "rgba(15, 23, 42, 0.75)",
              border: "1px solid rgba(148, 163, 184, 0.18)",
              borderRadius: "24px",
              padding: "24px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
              marginTop: "24px",
            }}
          >
            <h2 style={{ marginTop: 0, color: "#ffffff" }}>Resultado da importação</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              <ResumoCard titulo="Importados" valor={String(resultado.success)} />
              <ResumoCard titulo="Falhas" valor={String(resultado.failed)} />
            </div>

            {resultado.errors.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "700px",
                  }}
                >
                  <thead>
                    <tr style={{ background: "rgba(30, 41, 59, 0.55)" }}>
                      <Th>Linha</Th>
                      <Th>Cliente</Th>
                      <Th>Motivo</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.errors.map((item, index) => (
                      <tr key={index}>
                        <Td>{String(item.rowNumber)}</Td>
                        <Td>{item.name}</Td>
                        <Td>{item.message}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function ResumoCard({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.75)",
        border: "1px solid rgba(148, 163, 184, 0.18)",
        borderRadius: "20px",
        padding: "20px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}
    >
      <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px" }}>{titulo}</p>
      <h3 style={{ margin: "10px 0 0 0", color: "#ffffff", fontSize: "30px" }}>
        {valor}
      </h3>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "14px",
        color: "#cbd5e1",
        fontSize: "13px",
        borderBottom: "1px solid rgba(148, 163, 184, 0.18)",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td
      style={{
        padding: "14px",
        color: "#ffffff",
        fontSize: "14px",
        borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}

function StatusCor({
  fundo,
  borda,
  cor,
  texto,
}: {
  fundo: string;
  borda: string;
  cor: string;
  texto: string;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        background: fundo,
        border: borda,
        color: cor,
        borderRadius: "999px",
        padding: "8px 12px",
        fontSize: "12px",
        fontWeight: "bold",
      }}
    >
      {texto}
    </span>
  );
}