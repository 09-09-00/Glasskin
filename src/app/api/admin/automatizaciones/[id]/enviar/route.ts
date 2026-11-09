import { NextResponse } from "next/server";
import { z } from "zod";
import { enviarMensajeAutomatico } from "@/lib/automation-email";

const IdSchema = z.coerce.number().int().positive();

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = IdSchema.safeParse(id);
  if (!parsed.success) return NextResponse.json({ error: "Mensaje inválido" }, { status: 400 });
  const resultado = await enviarMensajeAutomatico(parsed.data);
  if (resultado.estado === "no_encontrado") return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
  if (resultado.estado === "borrador") return NextResponse.json({ error: "Configura RESEND_API_KEY y EMAIL_FROM para enviar correos" }, { status: 503 });
  if (resultado.estado === "error") return NextResponse.json({ error: "El proveedor no pudo enviar el correo. Puedes volver a intentarlo." }, { status: 502 });
  return NextResponse.json({ ok: true, estado: resultado.estado });
}
