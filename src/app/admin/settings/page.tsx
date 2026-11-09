// ============================================================
//  Panel admin - Configuración (Server Component)
//  Tasa de cambio USD → PYG editable, guardada en BD (Setting)
// ============================================================
import { prisma } from "@/lib/prisma";
import { obtenerConfiguracionEntrega } from "@/lib/entregas";

export const dynamic = "force-dynamic";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const [setting, entrega] = await Promise.all([
    prisma.setting.findUnique({ where: { clave: "tasa_usd_pyg" } }),
    obtenerConfiguracionEntrega(),
  ]);
  const whatsapp = await prisma.setting.findUnique({ where: { clave: "whatsapp_contacto" }, select: { valor: true } });

  const tasaActual = setting ? Number(setting.valor) : 7500;

  return <SettingsClient tasaInicial={tasaActual} entregaInicial={entrega} whatsappInicial={whatsapp?.valor ?? process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? ""} />;
}
