// ============================================================
//  Prompts del asistente IA — FASE 2
//  Salida SIEMPRE JSON validado, sin invenciones
// ============================================================

// import type { RespuestaIA } from "./proveedor"; // usado en otros archivos

// ---------- Tipos de salida ----------

export interface ProductoRecomendado {
  id: number;
  slug: string;
  nombre: string;
  marca: string;
  categoria: string;
  precio: number;
  motivo: string; // por qué se recomienda para este usuario
}

export interface BusquedaInteligenteSalida {
  productos: ProductoRecomendado[];
  explicacion: string; // resumen de la recomendación
  avisos: string[]; // siempre incluye aviso médico
}

export interface PasoRutina {
  orden: number; // 1, 2, 3...
  nombre: string; // "Limpiador", "Tónico", "Sérum", etc.
  productoId?: number; // null si no hay producto recomendado para este paso
  productoNombre?: string;
  instrucciones: string; // cómo aplicar
  esperaMinutos?: number; // tiempo de espera antes del siguiente paso
}

export interface RutinaCompletaSalida {
  manana: PasoRutina[];
  noche: PasoRutina[];
  consejos: string[]; // tips generales de cuidado
  mejoras: string[]; // sugerencias de productos que faltan
  avisos: string[];
}

export interface RutinaPresupuestoSalida {
  productos: Array<{
    id: number;
    slug: string;
    nombre: string;
    marca: string;
    categoria: string;
    precio: number;
    motivo: string;
  }>;
  total: number; // suma calculada EN CÓDIGO, no por el modelo
  presupuesto: number;
  sobra: number;
  avisos: string[];
}

// ---------- Prompts del sistema ----------

const AVISO_MEDICO = [
  "⚠️ IMPORTANTE: Esta información no sustituye consejo médico profesional.",
  "Si tienes condiciones cutáneas graves, persistentes o dudosas, consulta a un dermatólogo.",
  "Los productos son cosméticos, no medicamentos.",
].join(" ");

const SISTEMA_BASE = `Eres un asistente experto en cuidado facial (skincare).
SOLO puedes recomendar productos DEL CATÁLOGO que se te proporciona.
NUNCA inventes productos, marcas, ingredientes ni precios.
Si no hay producto adecuado en el catálogo para un paso, pon productoId: null.
Responde SIEMPRE en JSON válido según el esquema que se te indica.
Incluye siempre el aviso médico en el campo "avisos".`;

export const PROMPT_BUSQUEDA_INTELIGENTE = `${SISTEMA_BASE}

TAREA: El usuario describe su piel y necesidades en texto libre.
DEBES devolver JSON con esta estructura exacta:
{
  "productos": [
    { "id": number, "slug": string, "nombre": string, "marca": string, "categoria": string, "precio": number, "motivo": string }
  ],
  "explicacion": string,
  "avisos": string[]
}

REGLAS:
- Máximo 6 productos recomendados.
- Cada producto debe existir en el catálogo proporcionado.
- El "motivo" debe explicar por qué encaja con la piel/necesidades del usuario.
- Incluye ${AVISO_MEDICO} en "avisos".`;

export const PROMPT_RUTINA_COMPLETA = `${SISTEMA_BASE}

TAREA: Genera rutina de MAÑANA y NOCHE con orden correcto de pasos.
DEBES devolver JSON con esta estructura exacta:
{
  "manana": [
    { "orden": 1, "nombre": "Limpiador", "productoId": number|null, "productoNombre": string|null, "instrucciones": string, "esperaMinutos": number }
  ],
  "noche": [ ... mismo formato ... ],
  "consejos": string[],
  "mejoras": string[],
  "avisos": string[]
}

ORDEN ESTÁNDAR MAÑANA: Limpiador → Tónico → Sérum tratamiento → Hidratante → Protector solar
ORDEN ESTÁNDAR NOCHE: Limpiador (doble si maquillaje/SPF) → Tónico → Exfoliante (si toca) → Sérum tratamiento → Contorno ojos → Hidratante/noche

REGLAS:
- Usa SOLO productos del catálogo.
- Si no hay producto para un paso, productoId: null y explica en instrucciones.
- Incluye ${AVISO_MEDICO} en "avisos".`;

export const PROMPT_RUTINA_PRESUPUESTO = `${SISTEMA_BASE}

TAREA: Arma una rutina completa (mañana + noche) que NO supere el presupuesto indicado.
DEBES devolver JSON con esta estructura exacta:
{
  "productos": [
    { "id": number, "slug": string, "nombre": string, "marca": string, "categoria": string, "precio": number, "motivo": string }
  ],
  "total": number, // LA SUMA LA CALCULA EL CÓDIGO, TÚ SOLO PROPONES LA LISTA
  "presupuesto": number,
  "sobra": number,
  "avisos": string[]
}

REGLAS:
- Prioriza: Limpiador → Hidratante → Protector solar → Sérum → Tónico → Contorno ojos.
- Propón lista de productos; el código calculará el total y descartará si supera el presupuesto.
- Incluye ${AVISO_MEDICO} en "avisos".`;

// ---------- Funciones auxiliares ----------

/** Construye el catálogo compacto para el prompt (solo lo necesario) */
export function catalogoParaPrompt(productos: Array<{
  id: number;
  slug: string;
  nombre: string;
  marca: string;
  categoria: string;
  precio: number;
  tipoPiel: string[];
  preocupaciones: string[];
  descripcion: string;
  modoUso: string;
}>): string {
  return productos
    .map(
      (p) =>
        `ID:${p.id} | ${p.nombre} [${p.marca}] | Cat: ${p.categoria} | \$${p.precio} | Piel: ${p.tipoPiel.join(",")} | Trata: ${p.preocupaciones.join(",")} | ${p.descripcion.slice(0, 120)}`
    )
    .join("\n");
}

/** Valida que los IDs recomendados existan en el catálogo */
export function validarIdsRecomendados<T extends { id: number }>(
  recomendados: T[],
  catalogoIds: Set<number>
): T[] {
  return recomendados.filter((r) => catalogoIds.has(r.id));
}