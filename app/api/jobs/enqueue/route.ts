import { NextRequest, NextResponse } from "next/server";
import { enqueueInvoiceJob } from "@/lib/invoiceQueue";
import { logJob } from "@/lib/invoiceJobLogger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const invoiceId = Number(body.invoiceId);
    const partnerCompanyId = Number(body.partnerCompanyId);
    const clientId = Number(body.clientId);

    if (!invoiceId || !partnerCompanyId || !clientId) {
      return NextResponse.json(
        {
          success: false,
          message: "invoiceId, partnerCompanyId e clientId são obrigatórios.",
        },
        { status: 400 }
      );
    }

    const payload = {
      competencyDate: body.competencyDate,
      tomadorDocumento: body.tomadorDocumento,
      taxCode: body.taxCode,
      serviceCity: body.serviceCity,
      serviceValue: body.serviceValue,
      serviceDescription: body.serviceDescription,
      cancelKey: body.cancelKey || String(invoiceId),
    };

    const job = await enqueueInvoiceJob({
      invoiceId,
      partnerCompanyId,
      clientId,
      payload,
    });

    await logJob({
      jobId: job.id,
      invoiceId,
      level: "info",
      message: "Job enfileirado com sucesso.",
      meta: {
        partnerCompanyId,
        clientId,
        payload,
      },
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: "queued",
      message: "Job adicionado à fila com sucesso.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: String(error?.message || "Erro ao enfileirar job."),
      },
      { status: 500 }
    );
  }
}