export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { iniciarJobWorkerCron } = await import("./lib/jobWorkerCron");
    iniciarJobWorkerCron();
  }
}