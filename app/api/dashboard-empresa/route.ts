import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

type DashboardRequestBody = {
  partnerCompanyId: number;
};

type Cliente = {
  id: number;
  name: string;
  created_at?: string;
};

type Invoice = {
  id: number;
  client_id: number | null;
  partner_company_id: number | null;
  status: string | null;
  service_value: number | null;
  competency_date: string | null;
  created_at: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DashboardRequestBody;
    const partnerCompanyId = Number(body?.partnerCompanyId);

    if (!partnerCompanyId) {
      return NextResponse.json(
        { success: false, message: "partnerCompanyId não informado." },
        { status: 400 }
      );
    }

    const hoje = new Date();
    const data90Dias = new Date();
    data90Dias.setDate(hoje.getDate() - 90);

    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const inicioAno = new Date(hoje.getFullYear(), 0, 1);

    const [clientsResult, invoicesResult] = await Promise.all([
      supabase
        .from("clients")
        .select("id, name, created_at")
        .eq("partner_company_id", partnerCompanyId)
        .order("name", { ascending: true }),

      supabase
        .from("invoices")
        .select("id, client_id, partner_company_id, status, service_value, competency_date, created_at")
        .eq("partner_company_id", partnerCompanyId)
        .order("created_at", { ascending: false }),
    ]);

    if (clientsResult.error) {
      return NextResponse.json(
        { success: false, message: "Erro ao buscar clientes.", error: clientsResult.error.message },
        { status: 500 }
      );
    }

    if (invoicesResult.error) {
      return NextResponse.json(
        { success: false, message: "Erro ao buscar notas.", error: invoicesResult.error.message },
        { status: 500 }
      );
    }

    const clients = (clientsResult.data || []) as Cliente[];
    const invoices = (invoicesResult.data || []) as Invoice[];

    const totalClientes = clients.length;
    const totalNotas = invoices.length;

    const notasSuccess = invoices.filter((n) => n.status === "success");
    const notasError = invoices.filter((n) => n.status === "error");
    const notasPending = invoices.filter((n) => n.status === "pending");
    const notasProcessing = invoices.filter((n) => n.status === "processing");
    const notasCanceled = invoices.filter((n) => n.status === "canceled");

    const clientesAtivosSet = new Set<number>();

    for (const invoice of invoices) {
      if (!invoice.client_id) continue;
      const dataComparacao = new Date(invoice.created_at || invoice.competency_date || "");
      const estaNosUltimos90Dias = dataComparacao >= data90Dias;

      if (invoice.status === "success" && estaNosUltimos90Dias) {
        clientesAtivosSet.add(invoice.client_id);
      }
    }

    const clientesAtivos90Dias = clientesAtivosSet.size;
    const clientesInativos90Dias = Math.max(totalClientes - clientesAtivos90Dias, 0);

    const volumeFinanceiroTotal = notasSuccess.reduce(
      (acc, nota) => acc + Number(nota.service_value || 0),
      0
    );

    const volumeMesAtual = notasSuccess
      .filter((nota) => {
        const data = new Date(nota.created_at || nota.competency_date || "");
        return data >= inicioMes;
      })
      .reduce((acc, nota) => acc + Number(nota.service_value || 0), 0);

    const volumeAnoAtual = notasSuccess
      .filter((nota) => {
        const data = new Date(nota.created_at || nota.competency_date || "");
        return data >= inicioAno;
      })
      .reduce((acc, nota) => acc + Number(nota.service_value || 0), 0);

    return NextResponse.json({
      success: true,
      dashboard: {
        cards: {
          total_clientes: totalClientes,
          clientes_ativos_90_dias: clientesAtivos90Dias,
          clientes_inativos_90_dias: clientesInativos90Dias,
          total_notas: totalNotas,
          notas_success: notasSuccess.length,
          notas_error: notasError.length,
          notas_pending: notasPending.length,
          notas_processing: notasProcessing.length,
          notas_canceled: notasCanceled.length,
          volume_financeiro_total: volumeFinanceiroTotal,
          volume_mes_atual: volumeMesAtual,
          volume_ano_atual: volumeAnoAtual,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: "Erro interno ao gerar dashboard da empresa.",
        error: error?.message || "Erro desconhecido.",
      },
      { status: 500 }
    );
  }
}