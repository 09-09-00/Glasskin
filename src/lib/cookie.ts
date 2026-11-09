// ============================================================
//  Cookie helpers para moneda (lado cliente)
// ============================================================
export { type Moneda } from "./moneda";
import type { Moneda } from "./moneda";

const COOKIE_NAME = "aurora_moneda";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 año

/** Lee la moneda de la cookie (lado cliente) */
export function leerMonedaCookie(): Moneda {
  if (typeof document === "undefined") return "USD";
  const match = document.cookie.match(new RegExp(`(^| )${COOKIE_NAME}=([^;]+)`));
  return (match?.[2] as Moneda) ?? "USD";
}

/** Escribe la moneda en la cookie (lado cliente) */
export function escribirMonedaCookie(moneda: Moneda): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${moneda}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}