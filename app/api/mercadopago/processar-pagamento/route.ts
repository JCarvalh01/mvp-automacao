import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
    };
  }

  return {
    plan_type: "full",
    notes_limit: 999999,
    is_blocked: false,
  };
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

    const body = await request.json();

    const token = String(body?.token || "").trim();
    const issuerId = body?.issuer_id ? String(body.issuer_id) : null;
    const paymentMethodId = String(body?.payment_method_id || "").trim();
    const transactionAmount = Number(body?.transaction_amount);
    const installments = Number(body?.installments || 1);
    const payerEmail = String(body?.payer?.email || "").trim();
    const clientId = Number(body?.clientId);
    const plano = String(body?.plano || "").trim() as Plano;

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

    const planoData = getPlanoData(plano);
    const externalReference = `client_${clientId}_${plano}`;

    if (!Number.isFinite(transactionAmount) || transactionAmount <= 0) {
      return NextResponse.json(
        { success: false, message: "Valor inválido para pagamento." },
        { status: 400 }
      );
    }

    const paymentPayload: Record<string, any> = {
      transaction_amount: transactionAmount,
      description: planoData.title,
      payment_method_id: paymentMethodId,
      installments: Number.isFinite(installments) && installments > 0 ? installments : 1,
      payer: {
        email: payerEmail,
      },
      external_reference: externalReference,
      notification_url: `${appUrl}/api/mercadopago/webhook`,
    };

    if (token) {
      paymentPayload.token = token;
    }

    if (issuerId) {
      paymentPayload.issuer_id = issuerId;
    }

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(paymentPayload),
      cache: "no-store",
    });

    const paymentResult = await mpResponse.json();

    if (!mpResponse.ok) {
      console.log("Erro Mercado Pago processar pagamento:", paymentResult);

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

    if (status === "approved") {
      const parsed = parseExternalReference(paymentResult?.external_reference);

      if (parsed) {
        const planoUpdate = getPlanoUpdate(parsed.plano);

        const { error } = await supabaseAdmin
          .from("clients")
          .update(planoUpdate)
          .eq("id", parsed.clientId);

        if (error) {
          console.log("Erro ao liberar plano imediatamente:", error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      status,
      status_detail: statusDetail,
      id: paymentResult?.id || null,
      qr_code: paymentResult?.point_of_interaction?.transaction_data?.qr_code || null,
      qr_code_base64:
        paymentResult?.point_of_interaction?.transaction_data?.qr_code_base64 || null,
      ticket_url:
        paymentResult?.transaction_details?.external_resource_url || null,
    });
  } catch (error) {
    console.log("Erro inesperado ao processar pagamento:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Erro inesperado ao processar pagamento.",
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