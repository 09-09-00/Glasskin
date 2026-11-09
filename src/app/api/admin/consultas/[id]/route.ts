import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const Schema = z.object({ estado: z.enum(["abierta", "resuelta"]) });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "Consulta inválida" }, { status: 400 });
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  const result = await prisma.supportCase.updateMany({ where: { id }, data: { estado: parsed.data.estado } });
  if (!result.count) return NextResponse.json({ error: "Consulta no encontrada" }, { status: 404 });
  return NextResponse.json({ ok: true, estado: parsed.data.estado });
}
