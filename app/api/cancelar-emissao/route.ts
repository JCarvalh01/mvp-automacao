import { NextResponse } from "next/server";
import { solicitarCancelamento } from "@/lib/emissaoCancelamento";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cancelKey } = body;

    if (!cancelKey) {
      return NextResponse.json(
        { success: false, message: "cancelKey não informado." },
        { status: 400 }
      );
    }

    solicitarCancelamento(String(cancelKey));

    return NextResponse.json({
      success: true,
      message: "Cancelamento solicitado com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao cancelar emissão:", error);

    return NextResponse.json(
      { success: false, message: "Erro ao solicitar cancelamento." },
      { status: 500 }
    );
  }
}