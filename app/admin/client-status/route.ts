import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = Number(searchParams.get("clientId"));

    if (!clientId || Number.isNaN(clientId)) {
      return NextResponse.json(
        { success: false, message: "Cliente inválido." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("id, plan_type, notes_limit, is_blocked, subscription_status")
      .eq("id", clientId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, message: "Cliente não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      plan_type: data.plan_type,
      notes_limit: data.notes_limit,
      is_blocked: data.is_blocked,
      subscription_status: data.subscription_status,
    });
  } catch (error) {
    console.log("Erro client-status:", error);

    return NextResponse.json(
      { success: false, message: "Erro interno." },
      { status: 500 }
    );
  }
}