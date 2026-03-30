import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const partnerCompanyId = Number(body?.partnerCompanyId);

    if (!partnerCompanyId) {
      return NextResponse.json(
        {
          success: false,
          message: "partnerCompanyId não informado.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("clients")
      .select("id, name")
      .eq("partner_company_id", partnerCompanyId)
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: "Erro ao listar clientes.",
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      clients: data || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: "Erro interno ao listar clientes.",
        error: error?.message || "Erro desconhecido.",
      },
      { status: 500 }
    );
  }
}