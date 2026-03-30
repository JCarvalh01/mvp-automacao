import { supabase } from "@/lib/supabaseClient";

export async function enqueueInvoiceJob({
  invoiceId,
  partnerCompanyId,
  clientId,
  payload,
}: {
  invoiceId: number;
  partnerCompanyId: number;
  clientId: number;
  payload: any;
}) {
  const { data, error } = await supabase
    .from("invoice_jobs")
    .insert({
      invoice_id: invoiceId,
      partner_company_id: partnerCompanyId,
      client_id: clientId,
      payload,
      status: "queued",
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}