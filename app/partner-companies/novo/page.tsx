"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function NovaEmpresaParceira() {
  const [name, setName] = useState("")
  const [cnpj, setCnpj] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [password, setPassword] = useState("")
  const [mensagem, setMensagem] = useState("")

  async function cadastrarEmpresa() {
    setMensagem("")

    if (!name || !cnpj || !password) {
      setMensagem("Preencha nome, CNPJ e senha")
      return
    }

    const { error } = await supabase
      .from("partner_companies")
      .insert([
        {
          name,
          cnpj,
          email,
          phone,
          address,
          password,
        },
      ])

    if (error) {
      console.log(error)
      setMensagem("Erro ao cadastrar empresa parceira")
      return
    }

    setMensagem("Empresa parceira cadastrada com sucesso")
    setName("")
    setCnpj("")
    setEmail("")
    setPhone("")
    setAddress("")
    setPassword("")
  }

  return (
    <main style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>Cadastro Empresa Parceira</h1>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          maxWidth: "450px",
        }}
      >
        <input
          placeholder="Nome da empresa"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="CNPJ"
          value={cnpj}
          onChange={(e) => setCnpj(e.target.value)}
        />

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="Telefone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <input
          placeholder="Endereço"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={cadastrarEmpresa}>
          Cadastrar
        </button>

        {mensagem && <p>{mensagem}</p>}
      </div>
    </main>
  )
}