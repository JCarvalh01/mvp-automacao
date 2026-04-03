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

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // 🔒 Segurança (IMPORTANTE)
    if (cronSecret) {
      const expected = `Bearer ${cronSecret}`;
      if (authHeader !== expected) {
        return NextResponse.json(
          { success: false, message: "Não autorizado." },
          { status: 401 }
        );
      }
    }

    const now = nowIso();

    console.log("CRON INICIADO:", now);

    // ======================================================
    // CLIENTES VENCIDOS
    // ======================================================
    const { data: clientesVencidos, error: clientesError } =
      await supabaseAdmin
        .from("clients")
        .select("id, subscription_expires_at, is_blocked")
        .lte("subscription_expires_at", now)
        .eq("is_blocked", false);

    if (clientesError) {
      console.log("Erro ao buscar clientes vencidos:", clientesError);
    }

    let totalClientesBloqueados = 0;

    if (clientesVencidos && clientesVencidos.length > 0) {
      for (const cliente of clientesVencidos) {
        const { error } = await supabaseAdmin
          .from("clients")
          .update({
            is_blocked: true,
            subscription_status: "expired",
          })
          .eq("id", cliente.id);

        if (!error) {
          totalClientesBloqueados++;
        } else {
          console.log("Erro ao bloquear cliente:", cliente.id, error);
        }
      }
    }

    // ======================================================
    // EMPRESAS VENCIDAS
    // ======================================================
    const { data: empresasVencidas, error: empresasError } =
      await supabaseAdmin
        .from("partner_companies")
        .select("id, subscription_expires_at, is_blocked")
        .lte("subscription_expires_at", now)
        .eq("is_blocked", false);

    if (empresasError) {
      console.log("Erro ao buscar empresas vencidas:", empresasError);
    }

    let totalEmpresasBloqueadas = 0;

    if (empresasVencidas && empresasVencidas.length > 0) {
      for (const empresa of empresasVencidas) {
        const { error } = await supabaseAdmin
          .from("partner_companies")
          .update({
            is_blocked: true,
            payment_status: "expired",
          })
          .eq("id", empresa.id);

        if (!error) {
          totalEmpresasBloqueadas++;
        } else {
          console.log("Erro ao bloquear empresa:", empresa.id, error);
        }
      }
    }

    console.log("CRON FINALIZADO");

    return NextResponse.json({
      success: true,
      now,
      clientes_bloqueados: totalClientesBloqueados,
      empresas_bloqueadas: totalEmpresasBloqueadas,
    });
  } catch (error: any) {
    console.log("Erro no CRON:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Erro no processamento do cron.",
        details: error?.message || null,
      },
      { status: 500 }
    );
  }
}