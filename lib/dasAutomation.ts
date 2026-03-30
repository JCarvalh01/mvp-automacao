export type ConsultarDasInput = {
  cnpj: string;
  targetYear?: number;
  targetMonth?: number | null;
  clientId?: number | null;
  partnerCompanyId?: number | null;
  clientName?: string | null;
};

export type ConsultarDasResult = {
  success: boolean;
  status: "paid" | "pending" | "overdue" | "unavailable" | "error";
  dueDate: string | null;
  amount: number | null;
  governmentMessage: string;
  checkedAt: string;
  cnpj?: string;
  clientId?: number | null;
  partnerCompanyId?: number | null;
  clientName?: string | null;
};

export async function consultarDas(
  input: ConsultarDasInput
): Promise<ConsultarDasResult> {
  return {
    success: false,
    status: "unavailable",
    dueDate: null,
    amount: null,
    governmentMessage: "Automação do DAS temporariamente desativada.",
    checkedAt: new Date().toISOString(),
    cnpj: input.cnpj,
    clientId: input.clientId ?? null,
    partnerCompanyId: input.partnerCompanyId ?? null,
    clientName: input.clientName ?? null,
  };
}