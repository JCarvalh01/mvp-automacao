import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      disabled: true,
      message: "Módulo DAS temporariamente desativado.",
    },
    { status: 403 }
  );
}

export async function GET(_request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      disabled: true,
      message: "Módulo DAS temporariamente desativado.",
    },
    { status: 403 }
  );
}