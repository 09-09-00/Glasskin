// ============================================================
//  Helpers de formato SERVER-ONLY (leer tasa/cookie de BD)
//  Solo para uso en Server Components
// ============================================================
import { TIENDA } from "./config";
import { formatearPrecio as formatearPrecioMoneda, Moneda, convertir } from "./moneda";

/** Formatea una fecha en español, ej: "1 de octubre de 2026". */
export function formatearFecha(fecha: Date | string): string {
  return new Date(fecha).toLocaleDateString(TIENDA.locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Versión server-side que lee la tasa de la BD */
export async function formatearPrecioServer(
  valorUSD: number,
  moneda: Moneda,
  prisma: { setting: { findUnique: (args: { where: { clave: string } }) => Promise<{ valor: string } | null> } }
): Promise<string> {
  const { obtenerTasa } = await import("./moneda");
  const tasa = await obtenerTasa(prisma);
  return formatearPrecioMoneda(convertir(valorUSD, moneda, tasa), moneda);
}

/** Lee la moneda desde la cookie (server-side) */
export async function obtenerMonedaServer(): Promise<Moneda> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const moneda = cookieStore.get("aurora_moneda")?.value as Moneda | undefined;
  return moneda ?? "USD";
}

/** Lee la tasa desde la BD (server-side) */
export async function obtenerTasaServer(): Promise<number> {
  const { obtenerTasa } = await import("./moneda");
  const { prisma } = await import("./prisma");
  return obtenerTasa(prisma);
}