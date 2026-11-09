import { NextResponse } from "next/server";
import { obtenerConfiguracionEntrega } from "@/lib/entregas";

export async function GET() {
  try {
    return NextResponse.json(await obtenerConfiguracionEntrega(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("GET /api/configuracion/entrega error:", error);
    return NextResponse.json({ error: "No se pudo cargar la configuración de entrega" }, { status: 503 });
  }
}
