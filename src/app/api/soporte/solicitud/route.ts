import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const Schema = z.object({
  nombre: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  telefono: z.string().trim().max(40).optional().default(""),
  consulta: z.string().trim().min(3).max(1000),
  respuestaSugerida: z.string().trim().max(1500).optional().default(""),
  empresa: z.string().max(200).optional().default(""),
});

function clasificar(consulta: string) {
  if (/reclamo|queja|problema|defectuoso|devoluci[oó]n/i.test(consulta)) return "reclamo";
  if (/pedido|compra|env[ií]o|entrega|seguimiento/i.test(consulta)) return "pedido";
  if (/rutina|piel|producto|recomend|ingrediente/i.test(consulta)) return "recomendacion";
  return "otra";
}

export async function POST(request: NextRequest) {
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa tu nombre, correo y consulta" }, { status: 400 });
  // Campo trampa para descartar envíos de bots sin exponer el criterio.
  if (parsed.data.empresa) return NextResponse.json({ ok: true });

  const email = parsed.data.email.toLowerCase();
  const consulta = parsed.data.consulta;
  const repetido = await prisma.supportCase.findFirst({
    where: { email, consulta, createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) } },
    select: { id: true },
  });
  if (repetido) return NextResponse.json({ ok: true, numero: repetido.id });

  const caso = await prisma.supportCase.create({
    data: {
      nombre: parsed.data.nombre,
      email,
      telefono: parsed.data.telefono || null,
      categoria: clasificar(consulta),
      consulta,
      respuestaSugerida: parsed.data.respuestaSugerida || null,
    },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, numero: caso.id }, { status: 201 });
}
