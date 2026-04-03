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

function getNextExpirationDate(baseDate?: string | Date | null) {
  const base = baseDate ? new Date(baseDate) : new Date();

  if (Number.isNaN(base.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 30);
    return fallback.toISOString();
  }

  base.setDate(base.getDate() + 30);
  return base.toISOString();
}

async function buscarPagamentoNoMercadoPago(
  paymentId: string,
  accessToken: string
) {
  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  const result = await response.json().catch(() => null);

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
      console.log("WEBHOOK pagamento não encontrado ou ainda não disponível.");

      return NextResponse.json({
        received: true,
        ignored: true,
        reason: "payment_not_found_or_not_ready",
      });
    }

    const payment = paymentResponse.data;
    const paymentStatus = String(payment?.status || "").trim().toLowerCase();

    console.log("WEBHOOK payment.status:", paymentStatus);
    console.log(
      "WEBHOOK payment.external_reference:",
      payment?.external_reference
    );

    if (!payment?.external_reference) {
      console.log("WEBHOOK sem external_reference, ignorando.");

      return NextResponse.json({
        received: true,
        ignored: true,
        reason: "no_external_reference",
      });
    }

    const parsed = parseExternalReference(payment.external_reference);

    if (!parsed) {
      console.log(
        "WEBHOOK external_reference inválida:",
        payment?.external_reference
      );
      return NextResponse.json({
        received: true,
        ignored: true,
        reason: "external_reference_invalida",
      });
    }

    console.log("WEBHOOK parsed clientId:", parsed.clientId);
    console.log("WEBHOOK parsed plano:", parsed.plano);

    const paymentIdValue =
      payment?.id !== undefined && payment?.id !== null
        ? String(payment.id)
        : null;

    const amountValue = Number(payment?.transaction_amount || 0);

    const paidAtValue = payment?.date_approved
      ? new Date(payment.date_approved).toISOString()
      : null;

    const createdAtValue = payment?.date_created
      ? new Date(payment.date_created).toISOString()
      : null;

    const paymentDateBase = paidAtValue || createdAtValue || new Date().toISOString();
    const nextExpirationDate = getNextExpirationDate(paymentDateBase);

    // ======================================================
    // REGISTRO DO PAGAMENTO NA TABELA payments
    // ======================================================
    try {
      const { error: paymentSaveError } = await supabaseAdmin
        .from("payments")
        .upsert(
          {
            client_id: parsed.clientId,
            partner_company_id: null,
            payer_type: "client",
            provider: "mercado_pago",
            external_reference: payment?.external_reference || null,
            payment_id: paymentIdValue,
            plan_type: parsed.plano,
            status: paymentStatus,
            amount: Number.isFinite(amountValue) ? amountValue : 0,
            paid_at: paidAtValue,
            webhook_payload: body || null,
          },
          {
            onConflict: "payment_id",
          }
        );

      if (paymentSaveError) {
        console.log(
          "WEBHOOK erro ao salvar payment na tabela payments:",
          paymentSaveError
        );
      } else {
        console.log("WEBHOOK payment salvo/atualizado com sucesso.");
      }
    } catch (paymentInsertError) {
      console.log(
        "WEBHOOK erro inesperado ao registrar payment:",
        paymentInsertError
      );
    }

    if (paymentStatus !== "approved") {
      console.log("WEBHOOK pagamento ainda não aprovado.");
      return NextResponse.json({
        received: true,
        payment_status: paymentStatus,
      });
    }

    const planoUpdate = getPlanoUpdate(parsed.plano);

    const { data: clienteAntes, error: clienteAntesError } = await supabaseAdmin
      .from("clients")
      .select(
        "id, name, email, plan_type, notes_limit, is_blocked, subscription_status, last_payment_at, subscription_expires_at"
      )
      .eq("id", parsed.clientId)
      .maybeSingle();

    console.log("WEBHOOK cliente antes:", JSON.stringify(clienteAntes));

    if (clienteAntesError) {
      console.log("WEBHOOK erro ao buscar cliente antes:", clienteAntesError);
    }

    const updateClientePayload = {
      ...planoUpdate,
      last_payment_at: paymentDateBase,
      subscription_expires_at: nextExpirationDate,
    };

    const { error: updateError } = await supabaseAdmin
      .from("clients")
      .update(updateClientePayload)
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
      .select(
        "id, name, email, plan_type, notes_limit, is_blocked, subscription_status, last_payment_at, subscription_expires_at"
      )
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
      payment_status: paymentStatus,
      last_payment_at: paymentDateBase,
      subscription_expires_at: nextExpirationDate,
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