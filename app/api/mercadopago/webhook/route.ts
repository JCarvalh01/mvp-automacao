import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Plano = "essencial" | "full";

function parseExternalReference(externalReference: string | null | undefined) {
  const value = String(externalReference || "");
  const match = value.match(/^client_(\d+)_(essencial|full)$/);

  if (!match) {
    return null;
  }

  return {
    clientId: Number(match[1]),
    plano: match[2] as Plano,
  };
}

function getPlanoUpdate(plano: Plano) {
  if (plano === "essencial") {
    return {
      plan_type: "essencial",
      notes_limit: 10,
      is_blocked: false,
      subscription_status: "active",
    };
  }

  return {
    plan_type: "full",
    notes_limit: 999999,
    is_blocked: false,
    subscription_status: "active",
  };
}

async function processarPagamento(paymentId: string, accessToken: string) {
  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  const payment = await response.json();

  if (!response.ok) {
    throw new Error(
      payment?.message || "Erro ao consultar pagamento no Mercado Pago."
    );
  }

  return payment;
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "MERCADO_PAGO_ACCESS_TOKEN não configurado." },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const topic = url.searchParams.get("topic") || url.searchParams.get("type");
    const idFromQuery =
      url.searchParams.get("id") || url.searchParams.get("data.id");

    let body: any = null;

    try {
      body = await request.json();
    } catch {
      body = null;
    }

    const resourceType = body?.type || topic;
    const paymentId = body?.data?.id || body?.id || idFromQuery;

    if (resourceType !== "payment" || !paymentId) {
      return NextResponse.json({ received: true });
    }

    const payment = await processarPagamento(String(paymentId), accessToken);

    const status = String(payment?.status || "").toLowerCase();

    if (status !== "approved") {
      return NextResponse.json({
        received: true,
        status: payment?.status || null,
      });
    }

    const parsed = parseExternalReference(payment?.external_reference);

    if (!parsed) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const planoUpdate = getPlanoUpdate(parsed.plano);

    const { error } = await supabaseAdmin
      .from("clients")
      .update(planoUpdate)
      .eq("id", parsed.clientId);

    if (error) {
      console.log("Erro ao liberar plano do cliente:", error);
      return NextResponse.json(
        { success: false, message: "Erro ao atualizar plano do cliente." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      clientId: parsed.clientId,
      plano: parsed.plano,
      status: "approved",
    });
  } catch (error) {
    console.log("Erro webhook Mercado Pago:", error);

    return NextResponse.json(
      { success: false, message: "Erro inesperado no webhook." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}