import cron from "node-cron";

declare global {
  // eslint-disable-next-line no-var
  var __jobWorkerCronStarted: boolean | undefined;
}

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000"
  );
}

async function processarFila() {
  try {
    const baseUrl = getBaseUrl();

    const response = await fetch(`${baseUrl}/api/jobs/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    console.log("[CRON JOBS]", {
      ok: response.ok,
      status: response.status,
      data,
    });
  } catch (error) {
    console.error("[CRON JOBS] erro ao processar fila:", error);
  }
}

export function iniciarJobWorkerCron() {
  if (global.__jobWorkerCronStarted) {
    console.log("[CRON JOBS] já iniciado, ignorando nova inicialização.");
    return;
  }

  global.__jobWorkerCronStarted = true;

  console.log("[CRON JOBS] iniciando processamento automático da fila...");

  // backup da fila a cada 5 segundos
  cron.schedule("*/5 * * * * *", async () => {
    await processarFila();
  });
}
