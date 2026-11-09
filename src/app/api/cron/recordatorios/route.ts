import { NextRequest, NextResponse } from "next/server";
import { procesarRecordatoriosReposicion } from "@/lib/recordatorios-reposicion";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "La automatización programada no está configurada" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const resultado = await procesarRecordatoriosReposicion();
    return NextResponse.json({ ok: true, ...resultado });
  } catch (error) {
    console.error("GET /api/cron/recordatorios error:", error);
    return NextResponse.json({ error: "No se pudieron procesar los avisos" }, { status: 500 });
  }
}
