import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const Schema = z.object({ estado: z.enum(["visible", "oculta"]) });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "Reseña inválida." }, { status: 400 });
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Estado de reseña inválido." }, { status: 400 });
  try {
    const result = await prisma.productReview.updateMany({ where: { id }, data: { estado: parsed.data.estado } });
    if (!result.count) return NextResponse.json({ error: "No encontramos esa reseña." }, { status: 404 });
    return NextResponse.json({ ok: true, estado: parsed.data.estado });
  } catch (error) {
    console.error("PATCH /api/admin/resenas/[id] error:", error);
    return NextResponse.json({ error: "No se pudo actualizar la reseña." }, { status: 503 });
  }
}
