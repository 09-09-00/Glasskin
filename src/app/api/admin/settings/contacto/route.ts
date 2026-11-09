import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({ whatsapp: z.string().trim().max(25) });

export async function PATCH(request: NextRequest) {
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Escribe un número válido o déjalo vacío para ocultar WhatsApp." }, { status: 400 });
  const whatsapp = body.data.whatsapp.replace(/\D/g, "");
  if (body.data.whatsapp && !/^\d{8,15}$/.test(whatsapp)) {
    return NextResponse.json({ error: "Incluye el código de país y usa entre 8 y 15 dígitos." }, { status: 400 });
  }
  try {
    await prisma.setting.upsert({
      where: { clave: "whatsapp_contacto" },
      update: { valor: whatsapp },
      create: { clave: "whatsapp_contacto", valor: whatsapp },
    });
    return NextResponse.json({ ok: true, whatsapp });
  } catch (error) {
    console.error("PATCH /api/admin/settings/contacto error:", error);
    return NextResponse.json({ error: "No se pudo guardar el número de WhatsApp." }, { status: 503 });
  }
}
