import cron from "node-cron";

export function iniciarCron() {
  console.log("🚀 CRON iniciado");

  cron.schedule("0 3 * * *", async () => {
    try {
      console.log("🧹 Limpando notas com erro...");

      await fetch("http://localhost:3000/api/cleanup-notas", {
        method: "POST",
      });

      console.log("✅ Limpeza concluída");
    } catch (err) {
      console.log("❌ Erro na limpeza:", err);
    }
  });
}