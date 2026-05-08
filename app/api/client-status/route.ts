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
        "id, plan_type, is_blocked, subscription_status, partner_company_id, is_active, subscription_expires_at"
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

    const isDirectClient =
      data.partner_company_id === null ||
      data.partner_company_id === undefined;

    const planType = String(data.plan_type || "").toLowerCase();

    const hasValidPlan =
      planType === "essencial" || planType === "full";

    const isPartnerClient = !isDirectClient;

    const isActiveClient =
      Boolean(data.is_active) &&
      !Boolean(data.is_blocked) &&
      (isPartnerClient ||
        (hasValidPlan && String(data.subscription_status || "").toLowerCase() === "active"));

    return NextResponse.json(
      {
        success: true,
        id: data.id,
        plan_type: data.plan_type || null,
        is_blocked: Boolean(data.is_blocked),
        subscription_status: data.subscription_status || null,
        subscription_expires_at: data.subscription_expires_at || null,
        partner_company_id: isDirectClient
          ? null
          : Number(data.partner_company_id),
        is_active: Boolean(data.is_active),
        is_direct_client: isDirectClient,
        is_partner_client: isPartnerClient,
        has_valid_plan: hasValidPlan,
        can_emit: isActiveClient,
        notes_limit: null,
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