import crypto from "crypto";
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

type Plano = "essencial" | "full";

function getPlanoData(plano: Plano) {
  if (plano === "essencial") {
    return {
      title: "Plano Essencial - MVP Automação Fiscal",
      price: 29.9,
    };
  }

  return {
    title: "Plano Full - MVP Automação Fiscal",
    price: 59.9,
  };
}

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

function isPix(paymentMethodId: string) {
  return paymentMethodId.toLowerCase() === "pix";
}

function isTicket(paymentMethodId: string) {
  const value = paymentMethodId.toLowerCase();
  return (
    value === "bolbradesco" ||
    value === "pec" ||
    value === "pagofacil" ||
    value === "rapipago" ||
    value === "redlink" ||
    value === "cargavirtual"
  );
}

function buildWebhookUrl(appUrl: string) {
  const url = new URL(appUrl);

  if (url.hostname === "mvp-automacao.com") {
    url.hostname = "www.mvp-automacao.com";
  }

  url.pathname = "/api/mercadopago/webhook";
  url.search = "";
  url.hash = "";

  return url.toString();
}

async function liberarPlanoSeAprovado(
  externalReference: string | null | undefined
) {
  const parsed = parseExternalReference(externalReference);

  console.log("PROCESSAR externalReference:", externalReference);
  console.log("PROCESSAR parsed:", parsed);

  if (!parsed) {
    return { updated: false, reason: "external_reference inválida" };
  }

  const planoUpdate = getPlanoUpdate(parsed.plano);

  const { error } = await supabaseAdmin
    .from("clients")
    .update(planoUpdate)
    .eq("id", parsed.clientId);

  if (error) {
    console.log("PROCESSAR erro ao liberar plano imediatamente:", error);
    return { updated: false, reason: error.message || "erro update" };
  }

  return { updated: true };
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          message: "MERCADO_PAGO_ACCESS_TOKEN não configurado.",
        },
        { status: 500 }
      );
    }

    if (!appUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "NEXT_PUBLIC_APP_URL não configurado.",
        },
        { status: 500 }
      );
    }

    const webhookUrl = buildWebhookUrl(appUrl);
    const body = await request.json();

    const token = String(body?.token || "").trim();
    const issuerId = body?.issuer_id ? String(body?.issuer_id).trim() : null;
    const paymentMethodId = String(body?.payment_method_id || "").trim();
    const transactionAmount = Number(body?.transaction_amount);
    const installments = Number(body?.installments || 1);
    const payerEmail = String(body?.payer?.email || "").trim();
    const clientId = Number(body?.clientId);
    const plano = String(body?.plano || "").trim() as Plano;

    console.log(
      "PROCESSAR body:",
      JSON.stringify({
        paymentMethodId,
        transactionAmount,
        installments,
        payerEmail,
        clientId,
        plano,
        hasToken: Boolean(token),
        issuerId,
        webhookUrl,
      })
    );

    if (!clientId || Number.isNaN(clientId)) {
      return NextResponse.json(
        { success: false, message: "Cliente inválido." },
        { status: 400 }
      );
    }

    if (plano !== "essencial" && plano !== "full") {
      return NextResponse.json(
        { success: false, message: "Plano inválido." },
        { status: 400 }
      );
    }

    if (!paymentMethodId) {
      return NextResponse.json(
        { success: false, message: "Método de pagamento inválido." },
        { status: 400 }
      );
    }

    if (!payerEmail) {
      return NextResponse.json(
        { success: false, message: "E-mail do pagador não informado." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(transactionAmount) || transactionAmount <= 0) {
      return NextResponse.json(
        { success: false, message: "Valor inválido para pagamento." },
        { status: 400 }
      );
    }

    const planoData = getPlanoData(plano);
    const externalReference = `client_${clientId}_${plano}`;

    const paymentPayload: Record<string, any> = {
      transaction_amount: transactionAmount,
      description: planoData.title,
      payment_method_id: paymentMethodId,
      installments:
        Number.isFinite(installments) && installments > 0 ? installments : 1,
      payer: {
        email: payerEmail,
      },
      external_reference: externalReference,
      notification_url: webhookUrl,
      statement_descriptor: "MVP AUTOMACAO",
      metadata: {
        clientId,
        plano,
        externalReference,
        origem: "mvp_automacao_fiscal",
      },
    };

    if (token && !isPix(paymentMethodId) && !isTicket(paymentMethodId)) {
      paymentPayload.token = token;
    }

    if (issuerId && !isPix(paymentMethodId) && !isTicket(paymentMethodId)) {
      paymentPayload.issuer_id = issuerId;
    }

    console.log(
      "PROCESSAR paymentPayload:",
      JSON.stringify(paymentPayload)
    );

    const idempotencyKey =
      crypto.randomUUID?.() ||
      `${clientId}-${plano}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(paymentPayload),
      cache: "no-store",
    });

    const paymentResult = await mpResponse.json();

    console.log("PROCESSAR mpResponse.status:", mpResponse.status);
    console.log("PROCESSAR paymentResult:", JSON.stringify(paymentResult));

    if (!mpResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            paymentResult?.message ||
            paymentResult?.error ||
            "Erro ao processar pagamento.",
          details: paymentResult,
        },
        { status: 500 }
      );
    }

    const status = String(paymentResult?.status || "").toLowerCase();
    const statusDetail = String(paymentResult?.status_detail || "");

    let liberacaoImediata: any = null;

    if (status === "approved") {
      liberacaoImediata = await liberarPlanoSeAprovado(
        paymentResult?.external_reference
      );
      console.log("PROCESSAR liberacaoImediata:", liberacaoImediata);
    }

    return NextResponse.json({
      success: true,
      status,
      status_detail: statusDetail,
      id: paymentResult?.id || null,
      external_reference: paymentResult?.external_reference || null,
      metadata: paymentResult?.metadata || null,
      notification_url: webhookUrl,
      liberacao_imediata: liberacaoImediata,
      qr_code:
        paymentResult?.point_of_interaction?.transaction_data?.qr_code || null,
      qr_code_base64:
        paymentResult?.point_of_interaction?.transaction_data?.qr_code_base64 ||
        null,
      ticket_url:
        paymentResult?.transaction_details?.external_resource_url || null,
    });
  } catch (error: any) {
    console.log("PROCESSAR erro inesperado:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Erro inesperado ao processar pagamento.",
        details: error?.message || null,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message: "Método GET não permitido nesta rota.",
    },
    { status: 405 }
  );
}