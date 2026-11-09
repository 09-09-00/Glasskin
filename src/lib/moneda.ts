// ============================================================
//  Sistema de moneda - USD (base) y PYG (local Paraguay)
//  Tasa editable desde admin, guardada en BD (Settings)
//  Formateo: USD con 2 decimales, PYG sin decimales con separador de miles
// ============================================================

export type Moneda = "USD" | "PYG";

export const MONEDAS: Record<Moneda, { simbolo: string; nombre: string; decimales: number; separadorMiles: string; separadorDecimal: string }> = {
  USD: { simbolo: "$", nombre: "Dólares USD", decimales: 2, separadorMiles: ",", separadorDecimal: "." },
  PYG: { simbolo: "Gs.", nombre: "Guaraníes PYG", decimales: 0, separadorMiles: ".", separadorDecimal: "," },
};

/** Tasa de cambio por defecto (USD → PYG) */
export const TASA_DEFAULT = 7500;

/** Lee la tasa desde la BD (Settings) o usa la default */
export async function obtenerTasa(prisma: { setting: { findUnique: (args: { where: { clave: string } }) => Promise<{ valor: string } | null> } }): Promise<number> {
  const setting = await prisma.setting.findUnique({ where: { clave: "tasa_usd_pyg" } });
  return setting ? Number(setting.valor) : TASA_DEFAULT;
}

/** Convierte USD a la moneda destino usando la tasa */
export function convertir(usd: number, moneda: Moneda, tasa: number): number {
  if (moneda === "USD") return usd;
  return Math.round(usd * tasa);
}

/** Formatea un precio según la moneda */
export function formatearPrecio(valor: number, moneda: Moneda): string {
  const { simbolo, decimales, separadorMiles, separadorDecimal } = MONEDAS[moneda];
  const fijo = valor.toFixed(decimales);
  const [entero, decimal] = fijo.split(".");
  const conMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, separadorMiles);
  return decimales > 0
    ? `${simbolo} ${conMiles}${separadorDecimal}${decimal}`
    : `${simbolo} ${conMiles}`;
}

/** Formatea precio desde USD almacenado en BD */
export function formatearDesdeUSD(usd: number, moneda: Moneda, tasa: number): string {
  return formatearPrecio(convertir(usd, moneda, tasa), moneda);
}

/** Parsea un string de precio en la moneda dada a número USD */
export function parsearPrecio(str: string, moneda: Moneda, tasa: number): number {
  const { separadorMiles, separadorDecimal, simbolo } = MONEDAS[moneda];
  const limpio = str
    .replace(simbolo, "")
    .replace(new RegExp(`\\${separadorMiles}`, "g"), "")
    .replace(separadorDecimal, ".")
    .trim();
  const valor = parseFloat(limpio);
  if (isNaN(valor)) return 0;
  return moneda === "USD" ? valor : valor / tasa;
}