const cancelamentos = new Map<string, boolean>();

export function solicitarCancelamento(chave: string) {
  cancelamentos.set(chave, true);
}

export function estaCancelado(chave?: string | null) {
  if (!chave) return false;
  return cancelamentos.get(chave) === true;
}

export function limparCancelamento(chave?: string | null) {
  if (!chave) return;
  cancelamentos.delete(chave);
}