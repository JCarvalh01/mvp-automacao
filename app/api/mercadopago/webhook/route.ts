import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

type Plano = "essencial" | "full";

function parseExternalReference(externalReference: string | null | undefined) {
  const value = String(externalReference || "").trim();
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

async function buscarPagamentoNoMercadoPago(paymentId: string, accessToken: string) {
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const result = await response.json();

  return {
    ok: response.ok,
    status: response.status,
    data: result,
  };
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.log("WEBHOOK ERRO: Supabase env ausente.");
      return NextResponse.json(
        { success: false, message: "Supabase env ausente." },
        { status: 500 }
      );
    }

    if (!accessToken) {
      console.log("WEBHOOK ERRO: MERCADO_PAGO_ACCESS_TOKEN ausente.");
      return NextResponse.json(
        { success: false, message: "MP token ausente." },
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

    console.log("WEBHOOK RECEBIDO URL:", request.url);
    console.log("WEBHOOK RECEBIDO QUERY topic:", topic);
    console.log("WEBHOOK RECEBIDO QUERY id:", idFromQuery);
    console.log("WEBHOOK RECEBIDO BODY:", JSON.stringify(body));

    const resourceType = body?.type || topic;
    const paymentId = body?.data?.id || body?.id || idFromQuery;

    console.log("WEBHOOK resourceType:", resourceType);
    console.log("WEBHOOK paymentId:", paymentId);

    if (resourceType !== "payment" || !paymentId) {
      console.log("WEBHOOK ignorado: não é payment ou não tem paymentId.");
      return NextResponse.json({ received: true, ignored: true });
    }

    const paymentResponse = await buscarPagamentoNoMercadoPago(
      String(paymentId),
      accessToken
    );

    console.log("WEBHOOK consulta MP status HTTP:", paymentResponse.status);
    console.log("WEBHOOK consulta MP body:", JSON.stringify(paymentResponse.data));

    if (!paymentResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Erro ao consultar pagamento no Mercado Pago.",
          details: paymentResponse.data,
        },
        { status: 500 }
      );
    }

    const payment = paymentResponse.data;
    const paymentStatus = String(payment?.status || "").trim().toLowerCase();

    console.log("WEBHOOK payment.status:", paymentStatus);
    console.log("WEBHOOK payment.external_reference:", payment?.external_reference);

    if (paymentStatus !== "approved") {
      console.log("WEBHOOK pagamento ainda não aprovado.");
      return NextResponse.json({
        received: true,
        payment_status: paymentStatus,
      });
    }

    const parsed = parseExternalReference(payment?.external_reference);

    if (!parsed) {
      console.log("WEBHOOK external_reference inválida:", payment?.external_reference);
      return NextResponse.json({
        received: true,
        ignored: true,
        reason: "external_reference inválida",
      });
    }

    console.log("WEBHOOK parsed clientId:", parsed.clientId);
    console.log("WEBHOOK parsed plano:", parsed.plano);

    const planoUpdate = getPlanoUpdate(parsed.plano);

    const { data: clienteAntes, error: clienteAntesError } = await supabaseAdmin
      .from("clients")
      .select("id, name, email, plan_type, notes_limit, is_blocked, subscription_status")
      .eq("id", parsed.clientId)
      .maybeSingle();

    console.log("WEBHOOK cliente antes:", JSON.stringify(clienteAntes));
    if (clienteAntesError) {
      console.log("WEBHOOK erro ao buscar cliente antes:", clienteAntesError);
    }

    const { error: updateError } = await supabaseAdmin
      .from("clients")
      .update(planoUpdate)
      .eq("id", parsed.clientId);

    if (updateError) {
      console.log("WEBHOOK erro ao atualizar cliente:", updateError);

      return NextResponse.json(
        {
          success: false,
          message: "Erro ao atualizar cliente.",
          details: updateError.message || updateError,
        },
        { status: 500 }
      );
    }

    const { data: clienteDepois, error: clienteDepoisError } = await supabaseAdmin
      .from("clients")
      .select("id, name, email, plan_type, notes_limit, is_blocked, subscription_status")
      .eq("id", parsed.clientId)
      .maybeSingle();

    console.log("WEBHOOK cliente depois:", JSON.stringify(clienteDepois));
    if (clienteDepoisError) {
      console.log("WEBHOOK erro ao buscar cliente depois:", clienteDepoisError);
    }

    return NextResponse.json({
      success: true,
      clientId: parsed.clientId,
      plano: parsed.plano,
      updated: true,
    });
  } catch (error: any) {
    console.log("WEBHOOK erro geral:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Erro inesperado no webhook.",
        details: error?.message || null,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    ok: true,
    url: request.url,
    has_supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    has_service_role: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    has_mp_token: Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN),
  });
}