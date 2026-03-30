import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function executar(request: NextRequest) {
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

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

    const response = await fetch(`${baseUrl}/api/cleanup-notas`, {
      method: "POST",
      headers: {
        ...(cronSecret ? { authorization: `Bearer ${cronSecret}` } : {}),
      },
      cache: "no-store",
    });

    const json = await response.json().catch(() => ({}));

    return NextResponse.json({
      success: true,
      message: "Cron de limpeza executado.",
      result: json,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Erro no cron de limpeza.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return executar(request);
}

export async function POST(request: NextRequest) {
  return executar(request);
}