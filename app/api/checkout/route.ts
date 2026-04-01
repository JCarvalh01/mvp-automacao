import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: NextRequest) {
  try {
    const { plan, empresaId } = await req.json();

    let priceId = "";

    if (plan === "essencial") {
      priceId = "price_ESSENCIAL"; // criar no stripe
    }

    if (plan === "full") {
      priceId = "price_FULL";
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard-empresa?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/planos`,
      metadata: {
        empresaId: String(empresaId),
        plan,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "Erro no checkout" }, { status: 500 });
  }
}