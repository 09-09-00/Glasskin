// ============================================================
//  PATCH /api/admin/settings/tasa - Actualizar tasa de cambio
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const BodySchema = z.object({
  tasa: z.number().int().min(1).max(20000),
});

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Tasa inválida" }, { status: 400 });
    }

    const { tasa } = parsed.data;
    await prisma.setting.upsert({
      where: { clave: "tasa_usd_pyg" },
      update: { valor: String(tasa) },
      create: { clave: "tasa_usd_pyg", valor: String(tasa) },
    });

    return NextResponse.json({ ok: true, tasa });
  } catch (e) {
    console.error("PATCH /api/admin/settings/tasa error:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}