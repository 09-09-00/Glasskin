import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CUSTOMER_COOKIE, verificarSesionCliente } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function accountId(request: NextRequest) {
  return verificarSesionCliente(request.cookies.get(CUSTOMER_COOKIE)?.value);
}

export async function GET(request: NextRequest) {
  const id = await accountId(request);
  if (!id) return NextResponse.json({ error: "Inicia sesión para ver tu perfil" }, { status: 401 });
  const account = await prisma.customerAccount.findUnique({ where: { id }, select: { id: true, nombre: true, email: true, telefono: true, tipoPiel: true, preocupacionesPiel: true, rutinaGuardada: true, consentimientoPersonalizacion: true, consentimientoPersonalizacionAt: true, rutinaGuardadaAt: true, createdAt: true } });
  if (!account) return NextResponse.json({ error: "La cuenta no está disponible" }, { status: 401 });
  return NextResponse.json({ account });
}

const UpdateSchema = z.object({
  nombre: z.string().trim().min(2).max(100).optional(),
  telefono: z.string().trim().max(40).optional(),
  personalizacion: z.object({
    consentimiento: z.boolean(),
    tipoPiel: z.enum(["seca", "grasa", "mixta", "sensible", "normal"]).optional(),
    preocupaciones: z.array(z.enum(["acne", "manchas", "arrugas", "poros", "rojez", "deshidratacion"])).max(6).optional().default([]),
  }).optional().superRefine((profile, context) => {
    if (profile?.consentimiento && !profile.tipoPiel) context.addIssue({ code: "custom", path: ["tipoPiel"], message: "Selecciona tu tipo de piel para guardar la personalización." });
  }),
}).refine((data) => data.nombre !== undefined || data.telefono !== undefined || data.personalizacion !== undefined);

export async function PATCH(request: NextRequest) {
  const id = await accountId(request);
  if (!id) return NextResponse.json({ error: "Inicia sesión para editar tu perfil" }, { status: 401 });
  const parsed = UpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Revisa los datos del perfil" }, { status: 400 });
  const { personalizacion } = parsed.data;
  const account = await prisma.customerAccount.update({
    where: { id },
    data: {
      ...(parsed.data.nombre !== undefined ? { nombre: parsed.data.nombre } : {}),
      ...(parsed.data.telefono !== undefined ? { telefono: parsed.data.telefono || null } : {}),
      ...(personalizacion ? {
        consentimientoPersonalizacion: personalizacion.consentimiento,
        consentimientoPersonalizacionAt: personalizacion.consentimiento ? new Date() : null,
        tipoPiel: personalizacion.consentimiento ? personalizacion.tipoPiel! : null,
        preocupacionesPiel: JSON.stringify(personalizacion.consentimiento ? personalizacion.preocupaciones : []),
        ...(personalizacion.consentimiento ? {} : { rutinaGuardada: null, rutinaGuardadaAt: null }),
      } : {}),
    },
    select: { id: true, nombre: true, email: true, telefono: true, tipoPiel: true, preocupacionesPiel: true, consentimientoPersonalizacion: true, consentimientoPersonalizacionAt: true, rutinaGuardadaAt: true, createdAt: true },
  });
  return NextResponse.json({ account });
}
