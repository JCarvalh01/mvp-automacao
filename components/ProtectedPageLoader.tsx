"use client";

export default function ProtectedPageLoader({
  label = "Carregando...",
}: {
  label?: string;
}) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#050816] via-[#0b1120] to-[#10182b] text-white">
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6">
        <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-cyan-400/30 border-t-cyan-400" />
          <h1 className="text-2xl font-bold">Validando acesso</h1>
          <p className="mt-3 text-sm text-white/65">{label}</p>
        </div>
      </div>
    </main>
  );
}