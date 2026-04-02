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
    const body = await request.json().catch(() => null);

    console.log("🔥 WEBHOOK RECEBIDO:", JSON.stringify(body));

    const paymentId = body?.data?.id;

    if (!paymentId) {
      console.log("❌ Sem paymentId");
      return NextResponse.json({ ok: true });
    }

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const payment = await response.json();

    console.log("💰 PAGAMENTO:", payment);

    if (payment.status !== "approved") {
      console.log("⏳ Pagamento não aprovado ainda");
      return NextResponse.json({ ok: true });
    }

    const ref = payment.external_reference;

    console.log("🔎 REF:", ref);

    const match = ref.match(/^client_(\d+)_(essencial|full)$/);

    if (!match) {
      console.log("❌ REF inválida");
      return NextResponse.json({ ok: true });
    }

    const clientId = Number(match[1]);
    const plano = match[2];

    console.log("👤 CLIENT:", clientId, plano);

    const update = {
      plan_type: plano,
      notes_limit: plano === "essencial" ? 10 : 999999,
      is_blocked: false,
      subscription_status: "active",
    };

    const { error } = await supabaseAdmin
      .from("clients")
      .update(update)
      .eq("id", clientId);

    if (error) {
      console.log("❌ ERRO SUPABASE:", error);
    } else {
      console.log("✅ CLIENTE ATUALIZADO");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.log("❌ ERRO WEBHOOK:", err);
    return NextResponse.json({ success: false });
  }
}