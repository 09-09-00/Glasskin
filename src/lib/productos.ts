// ============================================================
//  Consultas de catálogo usadas por las páginas y la API
// ============================================================
import { prisma } from "./prisma";

/** Filtros admitidos por el catálogo (vienen de la URL o de la API). */
export interface FiltrosCatalogo {
  marca?: string;
  categoria?: string;
  piel?: string;
  preocupacion?: string;
  precioMax?: number;
  q?: string;
  orden?: string;
}

export function extraerPresupuestoConsulta(consulta?: string) {
  if (!consulta) return null;
  const textoOriginal = consulta.toLowerCase();
  const match = textoOriginal.match(/(?:menos de|hasta|m[aá]ximo|tope de|presupuesto(?: de)?|no m[aá]s de|no supere)\s+(?:(?:gs\.?|usd|pyg)\s*)?([0-9][0-9.,]*(?:\s*mil)?)\s*(gs\.?|guaran[ií]es|guaran[ií]|pyg|usd|d[oó]lares|d[oó]lar)?/i)
    ?? textoOriginal.match(/(?:\$|usd\s*)([0-9][0-9.,]*(?:\s*mil)?)/i);
  if (!match) return null;
  const textoImporte = match[1].replace(/\s*mil$/, "");
  const monedaDetectada = match[2]?.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const esGuaranies = Boolean(monedaDetectada && ["gs", "gs.", "guaranies", "guarani", "pyg"].includes(monedaDetectada)) || /guaran|\bgs\b|\bpyg\b/.test(textoOriginal);
  let importeTexto = textoImporte;
  if (esGuaranies) importeTexto = importeTexto.replace(/[.,]/g, "");
  else if (/[.,]/.test(importeTexto)) {
    const separador = Math.max(importeTexto.lastIndexOf("."), importeTexto.lastIndexOf(","));
    const decimales = importeTexto.length - separador - 1;
    importeTexto = decimales === 1 || decimales === 2
      ? `${importeTexto.slice(0, separador).replace(/[.,]/g, "")}.${importeTexto.slice(separador + 1)}`
      : importeTexto.replace(/[.,]/g, "");
  }
  const importe = Number(importeTexto) * (match[1].endsWith("mil") ? 1000 : 1);
  return Number.isFinite(importe) && importe > 0 ? { importe, moneda: esGuaranies ? "PYG" as const : "USD" as const } : null;
}

/** Prioriza la foto principal de la galería y conserva el campo legado como respaldo. */
export function imagenPrincipalProducto(producto: {
  imagen: string | null;
  imagenes?: Array<{ url: string; blurDataUrl?: string | null }>;
}) {
  return {
    url: producto.imagenes?.[0]?.url ?? producto.imagen,
    blurDataUrl: producto.imagenes?.[0]?.blurDataUrl ?? null,
  };
}

const incluirImagenPrincipal = {
  orderBy: [{ principal: "desc" as const }, { orden: "asc" as const }],
  take: 1,
};

const IGNORAR_BUSQUEDA = new Set(["para", "con", "por", "del", "las", "los", "una", "uno", "que", "mas", "menos", "quiero", "busco", "necesito", "producto", "productos", "piel", "hasta", "maximo", "tope", "presupuesto", "supere", "usd", "pyg", "gs", "dolar", "dolares", "guarani", "guaranies"]);
const SINONIMOS_BUSQUEDA: Record<string, string[]> = {
  acne: ["acne", "granos", "imperfecciones", "puntos negros", "sebo", "salicilico", "bha"],
  manchas: ["manchas", "tono desigual", "marcas", "hiperpigmentacion", "vitamina c", "arbutina", "luminosidad"],
  deshidratacion: ["deshidratacion", "tirantez", "piel seca", "hidratacion", "hialuronico"],
  rojez: ["rojez", "sensible", "irritacion", "calmante", "centella", "barrera"],
  poros: ["poros", "textura", "puntos negros", "bha"],
  arrugas: ["arrugas", "lineas", "firmeza", "retinol", "retinal", "peptidos"],
  hidratante: ["hidratante", "crema", "hidratacion", "barrera", "seca"],
  protector: ["protector", "solar", "spf", "bloqueador", "fotoprotector"],
  limpiador: ["limpiador", "limpieza", "jabón", "gel limpiador"],
};

function normalizarBusqueda(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").replace(/[^a-z0-9]+/g, " ").trim();
}

function distanciaEdicion(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const fila = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const anterior = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, diagonal + Number(a[i - 1] !== b[j - 1]));
      diagonal = anterior;
    }
  }
  return fila[b.length];
}

function puntuarCoincidencia(producto: {
  nombre: string; descripcion: string; brand: { nombre: string }; category: { nombre: string; slug: string };
  tipoPiel: string; preocupaciones: string; ingredientes?: Array<{ ingrediente: { nombre: string } }>;
}, consulta: string) {
  const q = normalizarBusqueda(consulta);
  const nombre = normalizarBusqueda(producto.nombre);
  const marca = normalizarBusqueda(producto.brand.nombre);
  const categoria = normalizarBusqueda(`${producto.category.nombre} ${producto.category.slug}`);
  const ingredientes = normalizarBusqueda(producto.ingredientes?.map((item) => item.ingrediente.nombre).join(" ") ?? "");
  const descripcion = normalizarBusqueda([producto.descripcion, producto.tipoPiel, producto.preocupaciones].join(" "));
  let puntos = q && nombre.includes(q) ? 16 : 0;
  if (q && marca.includes(q)) puntos += 12;
  const tokens = q.split(" ").filter((token) => token.length > 2 && !/^\d+$/.test(token) && !IGNORAR_BUSQUEDA.has(token)).slice(0, 8);
  if (tokens.length === 0) return 1;
  const identidad = `${nombre} ${marca} ${categoria} ${ingredientes}`.split(" ");
  const contexto = descripcion.split(" ");
  const palabraCoincide = (palabra: string, token: string) => {
    const raizPalabra = palabra.endsWith("es") && palabra.length - token.length <= 3
      ? palabra.slice(0, -2)
      : palabra.endsWith("s") && palabra.length - token.length <= 2
        ? palabra.slice(0, -1)
        : palabra;
    return raizPalabra.includes(token) || (token.length >= 5 && distanciaEdicion(raizPalabra, token) === 1);
  };
  const coincidenciasIdentidad = tokens.filter((token) => identidad.some((palabra) => palabraCoincide(palabra, token))).length;
  const coincidenciasContexto = tokens.filter((token) => contexto.some((palabra) => palabraCoincide(palabra, token))).length;
  if (coincidenciasIdentidad === 0 || (tokens.length > 1 && coincidenciasIdentidad < 2 && coincidenciasContexto === 0)) return 0;
  for (const token of tokens) {
    const coincide = (texto: string, umbral: number) => texto.split(" ").some((palabra) => palabraCoincide(palabra, token)) ? umbral : 0;
    puntos += coincide(nombre, 7) + coincide(marca, 6) + coincide(ingredientes, 6) + coincide(categoria, 4) + coincide(descripcion, 2);
  }
  for (const [clave, sinonimos] of Object.entries(SINONIMOS_BUSQUEDA)) {
    if (!tokens.some((token) => token === clave || sinonimos.some((sinonimo) => normalizarBusqueda(sinonimo).split(" ").includes(token)))) continue;
    const objetivo = normalizarBusqueda(`${producto.category.nombre} ${producto.category.slug} ${producto.tipoPiel} ${producto.preocupaciones} ${producto.descripcion} ${producto.nombre} ${ingredientes}`);
    if (sinonimos.some((sinonimo) => objetivo.includes(normalizarBusqueda(sinonimo)))) puntos += 4;
  }
  return puntos;
}

/** Construye el "where" de Prisma a partir de los filtros estructurados. */
function construirWhere(filtros: FiltrosCatalogo) {
  const where: Record<string, unknown> = { activo: true };

  if (filtros.marca) where.brand = { slug: filtros.marca };
  if (filtros.categoria) where.category = { slug: filtros.categoria };
  // tipoPiel y preocupaciones se guardan como texto JSON: buscamos
  // el valor exacto entre comillas para no confundir valores parecidos.
  if (filtros.piel) where.tipoPiel = { contains: `"${filtros.piel}"` };
  if (filtros.preocupacion) where.preocupaciones = { contains: `"${filtros.preocupacion}"` };
  if (filtros.precioMax !== undefined) where.precio = { lte: filtros.precioMax };

  return where;
}

/** Orden de los resultados según el filtro elegido. */
function construirOrden(orden?: string) {
  switch (orden) {
    case "precio-asc":
      return { precio: "asc" as const };
    case "precio-desc":
      return { precio: "desc" as const };
    case "nombre":
      return { nombre: "asc" as const };
    default:
      return { createdAt: "desc" as const };
  }
}

/** Lista de productos activos con los filtros aplicados. */
export async function obtenerProductosConFiltros(filtros: FiltrosCatalogo) {
  const where = construirWhere(filtros);
  if (!filtros.q?.trim()) {
    const productos = await prisma.product.findMany({
    where,
    orderBy: construirOrden(filtros.orden),
    include: { brand: true, category: true, imagenes: incluirImagenPrincipal },
  });
    return filtros.precioMax !== undefined
      ? productos.filter((producto) => producto.precio <= filtros.precioMax!)
      : productos;
  }

  const productos = await prisma.product.findMany({
    where,
    orderBy: construirOrden(filtros.orden),
    include: {
      brand: true,
      category: true,
      imagenes: incluirImagenPrincipal,
      ingredientes: { select: { ingrediente: { select: { nombre: true } } } },
    },
  });
  const ordenManual = filtros.orden && filtros.orden !== "";
  const puntuados = productos.map((producto) => ({ producto, puntos: puntuarCoincidencia(producto, filtros.q!) }))
    .filter((item) => item.puntos > 0 && (filtros.precioMax === undefined || item.producto.precio <= filtros.precioMax));
  if (!ordenManual) puntuados.sort((a, b) => b.puntos - a.puntos || a.producto.precio - b.producto.precio);
  return puntuados.map((item) => item.producto);
}

/** Producto por slug con toda su información (marca, categoría, ingredientes, imágenes). */
export async function obtenerProductoPorSlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      category: true,
      ingredientes: {
        orderBy: { orden: "asc" },
        include: { ingrediente: true },
      },
      imagenes: {
        orderBy: [{ principal: "desc" }, { orden: "asc" }],
      },
    },
  });
}

/** Productos relacionados: misma categoría, distinto producto. */
export async function obtenerProductosRelacionados(
  categoriaId: number,
  productoId: number,
  limite = 4
) {
  return prisma.product.findMany({
    where: { categoryId: categoriaId, id: { not: productoId }, activo: true },
    include: { brand: true, imagenes: incluirImagenPrincipal },
    take: limite,
    orderBy: { destacado: "desc" },
  });
}

/**
 * Sugerencias contextuales para una búsqueda: parte del mejor resultado y
 * recupera alternativas de su misma categoría, marca o necesidad de piel.
 */
export async function obtenerRelacionadosDeBusqueda(
  base: { id: number; categoryId: number; brandId: number; preocupaciones: string },
  excluirIds: number[],
  limite = 4,
  precioMax?: number,
) {
  let preocupaciones: string[] = [];
  try {
    const valor = JSON.parse(base.preocupaciones);
    if (Array.isArray(valor)) preocupaciones = valor.filter((item): item is string => typeof item === "string");
  } catch {
    preocupaciones = [];
  }

  return prisma.product.findMany({
    where: {
      activo: true,
      id: { notIn: excluirIds },
      ...(precioMax !== undefined ? { precio: { lte: precioMax } } : {}),
      OR: [
        { categoryId: base.categoryId },
        { brandId: base.brandId },
        ...preocupaciones.slice(0, 3).map((valor) => ({ preocupaciones: { contains: `"${valor}"` } })),
      ],
    },
    include: { brand: true, category: true, imagenes: incluirImagenPrincipal },
    orderBy: [{ destacado: "desc" }, { stock: "desc" }],
    take: limite,
  });
}

/** Productos destacados para la página de inicio. */
export async function obtenerDestacados(limite = 8) {
  return prisma.product.findMany({
    where: { destacado: true, activo: true },
    include: { brand: true, category: true, imagenes: incluirImagenPrincipal },
    take: limite,
    orderBy: { nombre: "asc" },
  });
}

/** Promedio y cantidad de reseñas publicadas para un grupo de tarjetas. */
export async function obtenerCalificacionesProductos(productIds: number[]) {
  const ids = [...new Set(productIds)];
  if (ids.length === 0) return {} as Record<number, { promedio: number; total: number }>;

  const resumenes = await prisma.productReview.groupBy({
    by: ["productId"],
    where: { productId: { in: ids }, estado: "visible" },
    _avg: { rating: true },
    _count: { _all: true },
  });

  return Object.fromEntries(resumenes.map((resumen) => [
    resumen.productId,
    { promedio: resumen._avg.rating ?? 0, total: resumen._count._all },
  ])) as Record<number, { promedio: number; total: number }>;
}

/** Lista de productos para la API de la IA (incluye ingredientes). */
export async function obtenerProductosParaAPI(filtros: FiltrosCatalogo) {
  if (filtros.q?.trim()) {
    const resultados = await obtenerProductosConFiltros(filtros);
    if (resultados.length === 0) return [];
    const rango = new Map(resultados.map((producto, indice) => [producto.id, indice]));
    const completos = await prisma.product.findMany({
      where: { id: { in: resultados.map((producto) => producto.id) }, activo: true },
      include: {
        brand: true,
        category: true,
        imagenes: incluirImagenPrincipal,
        ingredientes: { orderBy: { orden: "asc" }, include: { ingrediente: true } },
      },
    });
    return completos.sort((a, b) => (rango.get(a.id) ?? 0) - (rango.get(b.id) ?? 0));
  }
  return prisma.product.findMany({
    where: construirWhere(filtros),
    orderBy: construirOrden(filtros.orden),
    include: {
      brand: true,
      category: true,
      imagenes: incluirImagenPrincipal,
      ingredientes: {
        orderBy: { orden: "asc" },
        include: { ingrediente: true },
      },
    },
  });
}
