import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { enviarEmailRecuperacao } from "@/lib/mailer";

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

function normalizarEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

function gerarToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email = normalizarEmail(body?.email || "");

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Informe o email." },
        { status: 400 }
      );
    }

    const { data: usuarios, error: usuariosError } = await supabaseAdmin
      .from("users")
      .select("id, name, email, is_active")
      .ilike("email", email);

    if (usuariosError) {
      console.error("Erro ao buscar users:", usuariosError);
      return NextResponse.json(
        { success: false, message: "Erro ao buscar o usuário." },
        { status: 500 }
      );
    }

    const usuarioAtivo =
      (usuarios || []).find((item: any) => item.is_active) || null;

    let targetType: "user" | "client" | null = null;
    let targetId: number | null = null;

    if (usuarioAtivo) {
      targetType = "user";
      targetId = usuarioAtivo.id;
    } else {
      const { data: clientes, error: clientesError } = await supabaseAdmin
        .from("clients")
        .select("id, name, email, is_active")
        .ilike("email", email);

      if (clientesError) {
        console.error("Erro ao buscar clients:", clientesError);
        return NextResponse.json(
          { success: false, message: "Erro ao buscar o cliente." },
          { status: 500 }
        );
      }

      const clienteAtivo =
        (clientes || []).find((item: any) => item.is_active !== false) || null;

      if (clienteAtivo) {
        targetType = "client";
        targetId = clienteAtivo.id;
      }
    }

    if (!targetType || !targetId) {
      return NextResponse.json(
        {
          success: false,
          message: "Não foi encontrado um cadastro com este e-mail.",
        },
        { status: 404 }
      );
    }

    const rawToken = gerarToken();
    const tokenHash = hashToken(rawToken);
    const agora = new Date();
    const expiraEm = new Date(agora.getTime() + 60 * 60 * 1000);

    await supabaseAdmin
      .from("password_reset_tokens")
      .update({ used_at: agora.toISOString() })
      .eq("email", email)
      .is("used_at", null);

    const { error: insertError } = await supabaseAdmin
      .from("password_reset_tokens")
      .insert({
        email,
        target_type: targetType,
        target_id: targetId,
        token_hash: tokenHash,
        expires_at: expiraEm.toISOString(),
      });

    if (insertError) {
      console.error("Erro ao salvar token:", insertError);
      return NextResponse.json(
        { success: false, message: "Erro ao gerar o link de redefinição." },
        { status: 500 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    const link = `${baseUrl}/nova-senha?token=${rawToken}`;

    try {
      await enviarEmailRecuperacao(email, link);
    } catch (emailError: any) {
      console.error("Erro ao enviar email:", emailError);

      return NextResponse.json(
        {
          success: false,
          message:
            emailError?.message ||
            "Não foi possível enviar o e-mail de recuperação.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Foi encaminhado no seu e-mail o link para recuperar sua senha.",
    });
  } catch (error: any) {
    console.error("Erro geral ao solicitar reset:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Erro ao solicitar redefinição de senha.",
      },
      { status: 500 }
    );
  }
}