// ============================================================
//  Helpers de formato CLIENT-SAFE (sin imports de Prisma)
//  Lado cliente: usa USD almacenado y convierte con tasa pasada por parámetro
// ============================================================
import { TIENDA } from "./config";
import { formatearPrecio as formatearPrecioMoneda, Moneda, convertir } from "./moneda";

/** Formatea un precio según la moneda configurada (lado cliente - usa USD almacenado y convierte) */
export function formatearPrecio(valorUSD: number, moneda: Moneda = "USD", tasa: number = 7500): string {
  return formatearPrecioMoneda(convertir(valorUSD, moneda, tasa), moneda);
}

/** Formatea una fecha en español, ej: "1 de octubre de 2026". */
export function formatearFecha(fecha: Date | string): string {
  return new Date(fecha).toLocaleDateString(TIENDA.locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}