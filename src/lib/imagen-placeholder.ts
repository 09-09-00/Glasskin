// ============================================================
//  Generador de imágenes placeholder SVG
//  Lo usan el seed y el panel admin (al crear un producto nuevo)
// ============================================================

/** Colores del degradado según la categoría del producto. */
export const coloresCategoria: Record<string, [string, string]> = {
  limpiadores: ["#7dd3fc", "#0ea5e9"],
  "tonicos-esencias": ["#5eead4", "#14b8a6"],
  serums: ["#c4b5fd", "#8b5cf6"],
  hidratantes: ["#a5b4fc", "#6366f1"],
  "protectores-solares": ["#fde68a", "#f59e0b"],
  mascarillas: ["#fbcfe8", "#ec4899"],
  exfoliantes: ["#fdba74", "#f97316"],
  "contornos-ojos": ["#a5b4fc", "#4f46e5"],
  "tratamientos-acne": ["#fca5a5", "#ef4444"],
  "tratamientos-antiedad": ["#d8b4fe", "#a855f7"],
};

/** Convierte un nombre en slug (minúsculas, sin acentos, con guiones). */
export function slugify(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Escapa caracteres especiales de XML en los textos del SVG. */
function escaparXml(texto: string): string {
  return texto
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;")
    .replace(/'/g, "\u0026apos;");
}

/** Parte un texto largo en líneas de máximo ~26 caracteres. */
function partirEnLineas(texto: string, maximo = 26): string[] {
  const palabras = texto.split(" ");
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of palabras) {
    if ((actual + " " + palabra).trim().length > maximo && actual) {
      lineas.push(actual.trim());
      actual = palabra;
    } else {
      actual = (actual + " " + palabra).trim();
    }
  }
  if (actual) lineas.push(actual.trim());
  return lineas.slice(0, 3); // máximo 3 líneas
}

/** Genera una imagen placeholder SVG con degradado según la categoría. */
export function generarSvg(nombre: string, marca: string, categoria: string): string {
  const [c1, c2] = coloresCategoria[categoria] ?? ["#e2e8f0", "#94a3b8"];
  const lineas = partirEnLineas(nombre);
  const yInicio = 470 - (lineas.length - 1) * 14;
  const textos = lineas
    .map(
      (linea, i) =>
        `<text x="300" y="${yInicio + i * 28}" text-anchor="middle" font-family="Georgia, serif" font-size="24" fill="#ffffff" font-weight="bold">${escaparXml(linea)}</text>`
    )
    .join("\n  ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="fondo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#fondo)"/>
  <circle cx="480" cy="110" r="90" fill="#ffffff" opacity="0.15"/>
  <circle cx="80" cy="500" r="130" fill="#ffffff" opacity="0.12"/>
  <rect x="262" y="210" width="76" height="34" rx="7" fill="#ffffff" opacity="0.6"/>
  <rect x="238" y="240" width="124" height="170" rx="20" fill="#ffffff" opacity="0.88"/>
  <rect x="252" y="300" width="96" height="4" rx="2" fill="${c2}" opacity="0.5"/>
  ${textos}
  <text x="300" y="${yInicio + lineas.length * 28 + 4}" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" fill="#ffffff" opacity="0.92">${escaparXml(marca)}</text>
</svg>`;
}
