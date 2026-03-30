import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

const TETO_MEI_ANUAL = 81000;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const clientId = Number(body?.clientId);
    const partnerCompanyId = Number(body?.partnerCompanyId);

    if (!clientId || !partnerCompanyId) {
      return NextResponse.json(
        {
          success: false,
          message: "clientId e partnerCompanyId são obrigatórios.",
        },
        { status: 400 }
      );
    }

    const [clientResult, invoicesResult] = await Promise.all([
      supabase
        .from("clients")
        .select("id, name, cnpj, client_type, mei_created_at, partner_company_id")
        .eq("id", clientId)
        .eq("partner_company_id", partnerCompanyId)
        .single(),

      supabase
        .from("invoices")
        .select("id, status, service_value, competency_date, created_at, service_taker, service_city, nfse_key")
        .eq("client_id", clientId)
        .eq("partner_company_id", partnerCompanyId)
        .order("created_at", { ascending: false }),
    ]);

    if (clientResult.error || !clientResult.data) {
      return NextResponse.json(
        {
          success: false,
          message: "Cliente não encontrado.",
        },
        { status: 404 }
      );
    }

    if (invoicesResult.error) {
      return NextResponse.json(
        {
          success: false,
          message: "Erro ao buscar notas do cliente.",
          error: invoicesResult.error.message,
        },
        { status: 500 }
      );
    }

    const client = clientResult.data;
    const invoices = invoicesResult.data || [];

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const last90Days = new Date();
    last90Days.setDate(now.getDate() - 90);

    const notasSuccess = invoices.filter((n: any) => n.status === "success");

    const faturamentoMes = notasSuccess.reduce((acc: number, nota: any) => {
      const dataBase = new Date(nota.competency_date || nota.created_at);
      return dataBase >= startOfMonth ? acc + Number(nota.service_value || 0) : acc;
    }, 0);

    const faturamentoAno = notasSuccess.reduce((acc: number, nota: any) => {
      const dataBase = new Date(nota.competency_date || nota.created_at);
      return dataBase >= startOfYear ? acc + Number(nota.service_value || 0) : acc;
    }, 0);

    const clienteAtivo90Dias = notasSuccess.some((nota: any) => {
      const dataBase = new Date(nota.competency_date || nota.created_at);
      return dataBase >= last90Days;
    });

    return NextResponse.json({
      success: true,
      dashboard: {
        cliente: {
          id: client.id,
          name: client.name,
          cnpj: client.cnpj,
          client_type: client.client_type,
          mei_created_at: client.mei_created_at,
          ativo_90_dias: clienteAtivo90Dias,
        },
        resumo: {
          faturamento_mes: faturamentoMes,
          faturamento_ano: faturamentoAno,
          teto_mei_anual: TETO_MEI_ANUAL,
          percentual_teto_mei: (faturamentoAno / TETO_MEI_ANUAL) * 100,
          total_notas: invoices.length,
          notas_success: notasSuccess.length,
          ultima_emissao: notasSuccess[0]?.created_at || null,
        },
        ultimas_notas: invoices.slice(0, 10),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: "Erro interno ao gerar dashboard do cliente.",
        error: error?.message || "Erro desconhecido.",
      },
      { status: 500 }
    );
  }
}