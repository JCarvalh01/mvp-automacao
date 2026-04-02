import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export async function GET(request: NextRequest) {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Variáveis do Supabase não configuradas.",
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const clientId = Number(searchParams.get("clientId"));

    if (!clientId || Number.isNaN(clientId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Cliente inválido.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("clients")
      .select(
        "id, plan_type, notes_limit, is_blocked, subscription_status, partner_company_id, is_active"
      )
      .eq("id", clientId)
      .maybeSingle();

    if (error) {
      console.log("Erro Supabase client-status:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Erro ao consultar cliente.",
          details: error.message || null,
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          message: "Cliente não encontrado.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        id: data.id,
        plan_type: data.plan_type || null,
        notes_limit: data.notes_limit ?? null,
        is_blocked: Boolean(data.is_blocked),
        subscription_status: data.subscription_status || null,
        partner_company_id:
          data.partner_company_id === null || data.partner_company_id === undefined
            ? null
            : Number(data.partner_company_id),
        is_active: Boolean(data.is_active),
        is_direct_client:
          data.partner_company_id === null || data.partner_company_id === undefined,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.log("Erro geral client-status:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Erro inesperado ao consultar status do cliente.",
        details: error?.message || null,
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: "Método POST não permitido nesta rota.",
    },
    { status: 405 }
  );
}