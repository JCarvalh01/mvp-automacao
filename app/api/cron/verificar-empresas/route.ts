import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      const expected = `Bearer ${cronSecret}`;
      if (authHeader !== expected) {
        return NextResponse.json(
          { success: false, message: "Não autorizado." },
          { status: 401 }
        );
      }
    }

    const hoje = new Date().toISOString().split("T")[0];

    const { data: empresas, error } = await supabaseAdmin
      .from("partner_companies")
      .select("*");

    if (error) throw error;

    let bloqueadas = 0;

    for (const empresa of empresas || []) {
      if (!empresa.next_due_date) continue;

      if (empresa.next_due_date < hoje) {
        await supabaseAdmin
          .from("partner_companies")
          .update({
            payment_status: "unpaid",
            is_blocked: true,
          })
          .eq("id", empresa.id);

        bloqueadas++;
      }
    }

    return NextResponse.json({
      success: true,
      empresas_analisadas: empresas?.length || 0,
      bloqueadas,
    });
  } catch (error) {
    console.log("Erro CRON empresas:", error);

    return NextResponse.json(
      { success: false, message: "Erro interno." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { success: false, message: "Use POST." },
    { status: 405 }
  );
}