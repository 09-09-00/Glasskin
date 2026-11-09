import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const setting = await prisma.setting.findUnique({ where: { clave: "whatsapp_contacto" }, select: { valor: true } });
    const valor = setting?.valor || process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "";
    return NextResponse.json({ whatsapp: valor.replace(/\D/g, "") }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/configuracion/contacto error:", error);
    return NextResponse.json({ error: "No se pudo cargar el contacto." }, { status: 503 });
  }
}
