import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Plano = "essencial" | "black";

function getPlanoData(plano: Plano) {
  if (plano === "essencial") {
    return {
      title: "Plano Essencial - MVP Automação Fiscal",
      price: 29.9,
    };
  }

  return {
    title: "Plano Black - MVP Automação Fiscal",
    price: 59.9,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const clientId = Number(body?.clientId);
    const plano = String(body?.plano || "") as Plano;

    if (!clientId || Number.isNaN(clientId)) {
      return NextResponse.json(
        { success: false, message: "Cliente inválido." },
        { status: 400 }
      );
    }

    if (plano !== "essencial" && plano !== "black") {
      return NextResponse.json(
        { success: false, message: "Plano inválido." },
        { status: 400 }
      );
    }

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          message: "MERCADO_PAGO_ACCESS_TOKEN não configurado.",
        },
        { status: 500 }
      );
    }

    const planoData = getPlanoData(plano);
    const externalReference = `client_${clientId}_${plano}`;

    // URL temporária válida para testes locais
    const publicTestUrl = "https://google.com";

    const payload = {
      items: [
        {
          title: planoData.title,
          quantity: 1,
          unit_price: planoData.price,
          currency_id: "BRL",
        },
      ],
      external_reference: externalReference,
      notification_url: publicTestUrl,
      back_urls: {
        success: publicTestUrl,
        failure: publicTestUrl,
        pending: publicTestUrl,
      },
      auto_return: "approved",
    };

    const response = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.log("Erro Mercado Pago criar preferência:", result);

      return NextResponse.json(
        {
          success: false,
          message:
            result?.message ||
            result?.error ||
            "Erro ao criar preferência de pagamento.",
          details: result,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point || null,
      preference_id: result.id,
    });
  } catch (error) {
    console.log("Erro inesperado ao criar preferência:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Erro inesperado ao criar preferência.",
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