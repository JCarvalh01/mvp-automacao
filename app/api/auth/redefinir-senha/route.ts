import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

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

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const token = String(body?.token || "").trim();
    const senha = String(body?.senha || "");
    const confirmarSenha = String(body?.confirmarSenha || "");

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Token inválido." },
        { status: 400 }
      );
    }

    if (!senha.trim()) {
      return NextResponse.json(
        { success: false, message: "Informe a nova senha." },
        { status: 400 }
      );
    }

    if (senha.length < 6) {
      return NextResponse.json(
        { success: false, message: "A senha deve ter pelo menos 6 caracteres." },
        { status: 400 }
      );
    }

    if (senha !== confirmarSenha) {
      return NextResponse.json(
        { success: false, message: "A confirmação de senha não confere." },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(token);
    const agoraIso = new Date().toISOString();

    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from("password_reset_tokens")
      .select("*")
      .eq("token_hash", tokenHash)
      .is("used_at", null)
      .gt("expires_at", agoraIso)
      .maybeSingle();

    if (tokenError || !tokenRow) {
      return NextResponse.json(
        { success: false, message: "Link inválido ou expirado." },
        { status: 400 }
      );
    }

    if (tokenRow.target_type === "user") {
      const { error: updateUserError } = await supabaseAdmin
        .from("users")
        .update({
          password: senha,
        })
        .eq("id", tokenRow.target_id);

      if (updateUserError) {
        throw new Error(updateUserError.message);
      }
    } else if (tokenRow.target_type === "client") {
      const { error: updateClientError } = await supabaseAdmin
        .from("clients")
        .update({
          password: senha,
        })
        .eq("id", tokenRow.target_id);

      if (updateClientError) {
        throw new Error(updateClientError.message);
      }
    } else {
      return NextResponse.json(
        { success: false, message: "Tipo de conta inválido." },
        { status: 400 }
      );
    }

    await supabaseAdmin
      .from("password_reset_tokens")
      .update({
        used_at: agoraIso,
      })
      .eq("id", tokenRow.id);

    await supabaseAdmin
      .from("password_reset_tokens")
      .update({
        used_at: agoraIso,
      })
      .eq("email", tokenRow.email)
      .is("used_at", null);

    return NextResponse.json({
      success: true,
      message: "Senha atualizada com sucesso.",
    });
  } catch (error: any) {
    console.error("Erro ao redefinir senha:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Erro ao redefinir senha.",
      },
      { status: 500 }
    );
  }
}