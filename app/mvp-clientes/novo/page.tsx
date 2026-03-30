"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function NovoClienteMVP() {
  const [name, setName] = useState("")
  const [cnpj, setCnpj] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [meiCreatedAt, setMeiCreatedAt] = useState("")
  const [password, setPassword] = useState("")
  const [mensagem, setMensagem] = useState("")

  async function cadastrarClienteMVP() {
    setMensagem("")

    if (!name || !cnpj || !password) {
      setMensagem("Preencha nome, CNPJ e senha")
      return
    }

    const { error } = await supabase
      .from("clients")
      .insert([
        {
          name,
          cnpj,
          email,
          phone,
          address,
          mei_created_at: meiCreatedAt || null,
          password,
          client_type: "mvp",
          admin_id: 1,
        },
      ])

    if (error) {
      console.log(error)
      setMensagem("Erro ao cadastrar cliente da MVP")
      return
    }

    setMensagem("Cliente da MVP cadastrado com sucesso")
    setName("")
    setCnpj("")
    setEmail("")
    setPhone("")
    setAddress("")
    setMeiCreatedAt("")
    setPassword("")
  }

  return (
    <main style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>Cadastro Cliente MVP</h1>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          maxWidth: "450px",
        }}
      >
        <input
          placeholder="Nome do cliente"
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

        <label>Data de criação do MEI</label>
        <input
          type="date"
          value={meiCreatedAt}
          onChange={(e) => setMeiCreatedAt(e.target.value)}
        />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={cadastrarClienteMVP}>
          Cadastrar
        </button>

        {mensagem && <p>{mensagem}</p>}
      </div>
    </main>
  )
}