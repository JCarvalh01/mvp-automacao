import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST() {
  try {
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

    // 1. Buscar notas com erro antigas
    const { data: notasErro, error: erroBusca } = await supabase
      .from("invoices")
      .select("id, pdf_path, xml_path, status, created_at")
      .in("status", ["error", "pending"])
      .lt("created_at", seteDiasAtras.toISOString());

    if (erroBusca) {
      throw erroBusca;
    }

    if (!notasErro || notasErro.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhuma nota para limpar",
      });
    }

    // 2. Deletar arquivos do storage
    const arquivosParaDeletar: string[] = [];

    for (const nota of notasErro) {
      if (nota.pdf_path) arquivosParaDeletar.push(nota.pdf_path);
      if (nota.xml_path) arquivosParaDeletar.push(nota.xml_path);
    }

    if (arquivosParaDeletar.length > 0) {
      await supabase.storage
        .from("notas")
        .remove(arquivosParaDeletar);
    }

    // 3. Deletar registros do banco
    const ids = notasErro.map((n) => n.id);

    const { error: erroDelete } = await supabase
      .from("invoices")
      .delete()
      .in("id", ids);

    if (erroDelete) {
      throw erroDelete;
    }

    return NextResponse.json({
      success: true,
      message: `${ids.length} notas com erro removidas`,
    });
  } catch (err: any) {
    console.error("Erro na limpeza:", err);

    return NextResponse.json(
      {
        success: false,
        message: err.message || "Erro interno",
      },
      { status: 500 }
    );
  }
}