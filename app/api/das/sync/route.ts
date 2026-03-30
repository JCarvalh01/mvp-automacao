import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      disabled: true,
      mode: "disabled",
      message: "Sincronização do DAS desativada.",
    },
    { status: 403 }
  );
}