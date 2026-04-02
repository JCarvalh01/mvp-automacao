"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");

  async function handleRecuperar() {
    setLoading(true);
    setMensagem("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nova-senha`,
    });

    if (error) {
      setMensagem("Erro ao enviar email.");
    } else {
      setMensagem("Email enviado! Verifique sua caixa.");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl w-full max-w-md">
        <h1 className="text-xl font-bold mb-4">Recuperar senha</h1>

        <input
          type="email"
          placeholder="Seu email"
          className="w-full border p-2 rounded mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          onClick={handleRecuperar}
          className="w-full bg-blue-600 text-white p-2 rounded"
          disabled={loading}
        >
          {loading ? "Enviando..." : "Enviar link"}
        </button>

        {mensagem && (
          <p className="mt-3 text-sm text-center">{mensagem}</p>
        )}
      </div>
    </div>
  );
}