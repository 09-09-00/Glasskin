// ============================================================
//  Valores fijos usados en filtros, formularios y base de datos
//  (SQLite no fuerza enums, así que los estados se validan aquí)
// ============================================================

/** Tipos de piel admitidos. */
export const TIPOS_PIEL = [
  { valor: "seca", etiqueta: "Seca" },
  { valor: "grasa", etiqueta: "Grasa" },
  { valor: "mixta", etiqueta: "Mixta" },
  { valor: "sensible", etiqueta: "Sensible" },
  { valor: "normal", etiqueta: "Normal" },
] as const;

/** Preocupaciones que los productos pueden tratar. */
export const PREOCUPACIONES = [
  { valor: "acne", etiqueta: "Acné" },
  { valor: "manchas", etiqueta: "Manchas" },
  { valor: "arrugas", etiqueta: "Arrugas" },
  { valor: "poros", etiqueta: "Poros" },
  { valor: "rojez", etiqueta: "Rojez" },
  { valor: "deshidratacion", etiqueta: "Deshidratación" },
] as const;

/** Estados posibles de un pedido. */
export const ESTADOS_PEDIDO = [
  { valor: "pendiente", etiqueta: "Pendiente" },
  { valor: "confirmado", etiqueta: "Confirmado" },
  { valor: "enviado", etiqueta: "Enviado" },
  { valor: "entregado", etiqueta: "Entregado" },
  { valor: "cancelado", etiqueta: "Cancelado" },
] as const;

/**
 * Lee un campo de la BD que se guarda como texto JSON (lista de strings)
 * y lo devuelve como array. Si el contenido no es válido, devuelve [].
 */
export function leerListaJson(campo: string | null | undefined): string[] {
  if (!campo) return [];
  try {
    const parsed = JSON.parse(campo);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** Devuelve la etiqueta legible de un valor dentro de un catálogo. */
export function etiquetaDe(
  catalogo: ReadonlyArray<{ valor: string; etiqueta: string }>,
  valor: string
): string {
  return catalogo.find((item) => item.valor === valor)?.etiqueta ?? valor;
}
