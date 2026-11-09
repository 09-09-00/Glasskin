import { NextResponse } from "next/server";
import { procesarRecordatoriosReposicion } from "@/lib/recordatorios-reposicion";

export const runtime = "nodejs";

export async function POST() {
  try {
    const resultado = await procesarRecordatoriosReposicion();
    return NextResponse.json({ ok: true, ...resultado });
  } catch (error) {
    console.error("POST /api/admin/automatizaciones/recordatorios error:", error);
    return NextResponse.json({ error: "No se pudieron procesar los recordatorios. Intenta de nuevo." }, { status: 500 });
  }
}
