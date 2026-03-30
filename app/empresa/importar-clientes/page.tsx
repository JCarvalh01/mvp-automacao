"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginEmpresaPage() {

  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {

    e.preventDefault();

    setLoading(true);
    setErro("");

    const { data, error } = await supabase
      .from("partner_companies")
      .select("*")
      .eq("email", email)
      .eq("password", password)
      .single();

    if (error || !data) {

      setErro("Email ou senha inválidos");
      setLoading(false);
      return;

    }

    // salva dados da empresa logada
    localStorage.setItem("partnerCompany", JSON.stringify(data));

    // salva senha para automação de emissão de nota
    localStorage.setItem("empresa_senha", password);

    router.push("/dashboard-empresa");

  }

  return (

    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f5f5f5"
      }}
    >

      <div
        style={{
          width: 400,
          background: "#ffffff",
          padding: 40,
          borderRadius: 12,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
        }}
      >

        <h2
          style={{
            textAlign: "center",
            marginBottom: 30,
            color: "#000"
          }}
        >
          Login Empresa Parceira
        </h2>

        <form onSubmit={handleLogin}>

          <div style={{ marginTop: 10 }}>
            <p style={{ marginBottom: 6, color: "#000" }}>
              Email
            </p>

            <input
              type="email"
              placeholder="Digite seu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #ccc",
                background: "#fff",
                color: "#000",
                fontSize: 14
              }}
            />
          </div>

          <div style={{ marginTop: 20 }}>
            <p style={{ marginBottom: 6, color: "#000" }}>
              Senha
            </p>

            <input
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #ccc",
                background: "#fff",
                color: "#000",
                fontSize: 14
              }}
            />
          </div>

          {erro && (
            <p
              style={{
                color: "red",
                marginTop: 15,
                fontSize: 14
              }}
            >
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 25,
              width: "100%",
              padding: 14,
              background: "#000",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 15
            }}
          >

            {loading ? "Entrando..." : "Entrar"}

          </button>

        </form>

      </div>

    </main>

  );

}