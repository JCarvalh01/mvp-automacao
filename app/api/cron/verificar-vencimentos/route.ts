import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

function nowIso() {
  return new Date().toISOString();
}

function autorizado(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

async function executarBloqueio() {
  const now = nowIso();

  console.log("CRON INICIADO:", now);

  const { data: clientes, error: clientesError } = await supabaseAdmin
    .from("clients")
    .select("id, subscription_expires_at, is_blocked")
    .not("subscription_expires_at", "is", null)
    .lte("subscription_expires_at", now)
    .eq("is_blocked", false);

  let totalClientes = 0;

  if (clientesError) {
    console.log("Erro ao buscar clientes:", clientesError);
  }

  if (clientes && clientes.length > 0) {
    for (const cliente of clientes) {
      const { error } = await supabaseAdmin
        .from("clients")
        .update({
          is_blocked: true,
          subscription_status: "expired",
        })
        .eq("id", cliente.id);

      if (!error) {
        totalClientes++;
      } else {
        console.log("Erro ao bloquear cliente:", cliente.id, error);
      }
    }
  }

  const { data: empresas, error: empresasError } = await supabaseAdmin
    .from("partner_companies")
    .select("id, subscription_expires_at, is_blocked")
    .not("subscription_expires_at", "is", null)
    .lte("subscription_expires_at", now)
    .eq("is_blocked", false);

  let totalEmpresas = 0;

  if (empresasError) {
    console.log("Erro ao buscar empresas:", empresasError);
  }

  if (empresas && empresas.length > 0) {
    for (const empresa of empresas) {
      const { error } = await supabaseAdmin
        .from("partner_companies")
        .update({
          is_blocked: true,
          payment_status: "expired",
        })
        .eq("id", empresa.id);

      if (!error) {
        totalEmpresas++;
      } else {
        console.log("Erro ao bloquear empresa:", empresa.id, error);
      }
    }
  }

  console.log("CRON FINALIZADO");

  return {
    success: true,
    now,
    clientes_bloqueados: totalClientes,
    empresas_bloqueadas: totalEmpresas,
  };
}

export async function GET(request: NextRequest) {
  try {
    if (!autorizado(request)) {
      return NextResponse.json(
        { success: false, message: "Não autorizado." },
        { status: 401 }
      );
    }

    const result = await executarBloqueio();
    return NextResponse.json(result);
  } catch (error: any) {
    console.log("Erro no CRON GET:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Erro no cron",
        details: error?.message || null,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!autorizado(request)) {
      return NextResponse.json(
        { success: false, message: "Não autorizado." },
        { status: 401 }
      );
    }

    const result = await executarBloqueio();
    return NextResponse.json(result);
  } catch (error: any) {
    console.log("Erro no CRON POST:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Erro no cron",
        details: error?.message || null,
      },
      { status: 500 }
    );
  }
}