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

    const respostaPadrao = NextResponse.json({
      success: true,
      message:
        "Se encontrarmos uma conta com este email, enviaremos um link para redefinição de senha.",
    });

    const { data: usuarios, error: usuariosError } = await supabaseAdmin
      .from("users")
      .select("id, name, email, is_active")
      .ilike("email", email);

    if (usuariosError) {
      console.error("Erro ao buscar users:", usuariosError);
      return respostaPadrao;
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
        return respostaPadrao;
      }

      const clienteAtivo =
        (clientes || []).find((item: any) => item.is_active !== false) || null;

      if (clienteAtivo) {
        targetType = "client";
        targetId = clienteAtivo.id;
      }
    }

    if (!targetType || !targetId) {
      return respostaPadrao;
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
      return respostaPadrao;
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    const link = `${baseUrl}/nova-senha?token=${rawToken}`;

    try {
      await enviarEmailRecuperacao(email, link);
    } catch (emailError) {
      console.error("Erro ao enviar email:", emailError);
    }

    return respostaPadrao;
  } catch (error) {
    console.error("Erro geral ao solicitar reset:", error);

    return NextResponse.json(
      {
        success: true,
        message:
          "Se encontrarmos uma conta com este email, enviaremos um link para redefinição de senha.",
      },
      { status: 200 }
    );
  }
}