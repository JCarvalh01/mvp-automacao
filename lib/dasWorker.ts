import { consultarDas } from "./dasAutomation";

type Job = {
  clientId: number;
  clientName: string;
  clientCnpj: string;
  year: number;
  month: number;
};

const CONCURRENCY = 3;
const RETRY_LIMIT = 2;

export async function processarFila(jobs: Job[]) {
  const results: any[] = [];

  let index = 0;

  async function worker() {
    while (index < jobs.length) {
      const job = jobs[index++];
      let tentativa = 0;
      let sucesso = false;
      let resultado: any = null;

      while (tentativa <= RETRY_LIMIT && !sucesso) {
        try {
          tentativa++;

          resultado = await consultarDas({
            cnpj: job.clientCnpj,
            clientId: job.clientId,
            clientName: job.clientName,
            targetYear: job.year,
            targetMonth: job.month,
          });

          sucesso = true;
        } catch (err: any) {
          if (tentativa > RETRY_LIMIT) {
            resultado = {
              success: false,
              status: "error",
              governmentMessage: err?.message || "Erro ao consultar DAS.",
              dueDate: null,
              amount: null,
              checkedAt: new Date().toISOString(),
              cnpj: job.clientCnpj,
              clientId: job.clientId,
              clientName: job.clientName,
              partnerCompanyId: null,
            };
          }
        }
      }

      results.push({
        clientId: job.clientId,
        ...resultado,
      });
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());

  await Promise.all(workers);

  return results;
}