import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ENTREGA_DEFAULTS } from "@/lib/entregas";

const BodySchema = z.object({
  direccionRetiro: z.string().trim().min(5).max(300),
  costoDeliveryUsd: z.number().min(0).max(500).refine((valor) => Number.isInteger(valor * 100), "Usa hasta dos decimales"),
  envioGratisDesdeUsd: z.number().min(0).max(5000).refine((valor) => Number.isInteger(valor * 100), "Usa hasta dos decimales"),
  latitudLocal: z.number().min(-90).max(90),
  longitudLocal: z.number().min(-180).max(180),
});

export async function PATCH(request: NextRequest) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa la dirección y los valores del delivery" }, { status: 400 });

  const { direccionRetiro, costoDeliveryUsd, envioGratisDesdeUsd, latitudLocal, longitudLocal } = parsed.data;
  try {
    await prisma.$transaction([
      prisma.setting.upsert({ where: { clave: "direccion_retiro" }, update: { valor: direccionRetiro }, create: { clave: "direccion_retiro", valor: direccionRetiro } }),
      prisma.setting.upsert({ where: { clave: "costo_delivery_usd" }, update: { valor: costoDeliveryUsd.toFixed(2) }, create: { clave: "costo_delivery_usd", valor: costoDeliveryUsd.toFixed(2) } }),
      prisma.setting.upsert({ where: { clave: "envio_gratis_desde_usd" }, update: { valor: envioGratisDesdeUsd.toFixed(2) }, create: { clave: "envio_gratis_desde_usd", valor: envioGratisDesdeUsd.toFixed(2) } }),
      prisma.setting.upsert({ where: { clave: "latitud_local" }, update: { valor: String(latitudLocal) }, create: { clave: "latitud_local", valor: String(latitudLocal) } }),
      prisma.setting.upsert({ where: { clave: "longitud_local" }, update: { valor: String(longitudLocal) }, create: { clave: "longitud_local", valor: String(longitudLocal) } }),
    ]);
    return NextResponse.json({ ok: true, retiroConfigurado: direccionRetiro !== ENTREGA_DEFAULTS.direccionRetiro });
  } catch (error) {
    console.error("PATCH /api/admin/settings/entrega error:", error);
    return NextResponse.json({ error: "No se pudo guardar la configuración de entrega" }, { status: 500 });
  }
}
