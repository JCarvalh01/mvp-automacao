import { supabase } from "@/lib/supabaseClient";

export async function logJob({
  jobId,
  invoiceId,
  level = "info",
  message,
  meta = null,
}: {
  jobId: number;
  invoiceId: number;
  level?: "debug" | "info" | "warning" | "error";
  message: string;
  meta?: any;
}) {
  try {
    await supabase.from("invoice_job_logs").insert({
      job_id: jobId,
      invoice_id: invoiceId,
      level,
      message,
      meta,
    });
  } catch (err) {
    console.error("Erro ao logar job:", err);
  }
}