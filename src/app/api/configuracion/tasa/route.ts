import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TASA_DEFAULT = 7500;

/** Lectura pública usada por el selector USD/PYG de la tienda. */
export async function GET() {
  try {
    const setting = await prisma.setting.findUnique({
      where: { clave: "tasa_usd_pyg" },
      select: { valor: true },
    });
    const tasa = Number(setting?.valor ?? TASA_DEFAULT);
    return NextResponse.json({ tasa: Number.isFinite(tasa) ? tasa : TASA_DEFAULT });
  } catch (error) {
    console.error("GET /api/configuracion/tasa error:", error);
    return NextResponse.json({ tasa: TASA_DEFAULT, fallback: true });
  }
}
