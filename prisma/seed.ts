// ============================================================
//  Seed de la tienda: marcas, categorías, 72 productos e imágenes
//
//  Lee los archivos JSON de prisma/seed/ (marcas, categorías y
//  5 lotes de productos), llena la base de datos y genera las
//  imágenes placeholder SVG en public/images/productos/.
//
//  Uso: npm run db:seed
// ============================================================
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

// ---------- Tipos de los archivos JSON ----------
interface MarcaJson {
  slug: string;
  nombre: string;
  pais: string;
  descripcion: string;
}

interface CategoriaJson {
  slug: string;
  nombre: string;
  icono: string;
  descripcion: string;
  orden: number;
}

interface ProductoJson {
  slug: string;
  nombre: string;
  marca: string;
  categoria: string;
  descripcion: string;
  ingredientes: string[];
  tipoPiel: string[];
  preocupaciones: string[];
  modoUso: string;
  precio: number;
  stock: number;
  destacado: boolean;
}

// ---------- Colores por categoría para las imágenes placeholder ----------
const coloresCategoria: Record<string, [string, string]> = {
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

// ---------- Utilidades ----------
/** Convierte un nombre en slug (minúsculas, sin acentos, con guiones). */
function slugify(texto: string): string {
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
function generarSvg(nombre: string, marca: string, categoria: string): string {
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

// ---------- Diccionario de ingredientes ----------
// Descripción de cada ingrediente clave usado en el catálogo.
// Si un producto usa un ingrediente que no está aquí, se guarda sin descripción.
const diccIngredientes: Record<string, string> = {
  "Zinc PCA": "Regula el sebo y tiene una acción antibacteriana suave.",
  Glicerina: "Humectante clásico que atrae y retiene el agua en la piel.",
  "Agua termal de La Roche-Posay": "Agua termal con selenio que calma y protege la piel sensible.",
  Niacinamida: "Vitamina B3 que unifica el tono, reduce los poros y refuerza la barrera cutánea.",
  Ceramidas: "Lípidos que consolidan la barrera cutánea y retienen la hidratación.",
  "Ácido hialurónico": "Humectante que retiene hasta 1000 veces su peso en agua e hidrata en profundidad.",
  "Ácido hialurónico (5 tipos)": "Cinco pesos moleculares que hidratan todas las capas de la piel.",
  "Ácido hialurónico (8 tipos)": "Ocho pesos moleculares para una hidratación multicapa.",
  "Extracto de oliva": "Emoliente nutritivo con antioxidantes.",
  "Té verde": "Antioxidante calmante que protege y equilibra la piel.",
  "Ácido salicílico (BHA)": "Exfoliante liposoluble que limpia los poros en profundidad; ideal para el acné.",
  Ginseng: "Antioxidante de la cosmética tradicional coreana: energiza, reafirma y aporta luminosidad.",
  "Aceite de soja": "Nutritivo, rico en vitamina E y lípidos cutáneos.",
  "Extracto de arroz": "Ilumina, hidrata y suaviza; rico en vitaminas B y E.",
  "Ciruela verde": "Hidrata y refresca con antioxidantes suaves.",
  "Ácido glicólico (AHA)": "El AHA de molécula más pequeña: renueva la textura y difumina manchas.",
  "Agua marina de Dokdo": "Agua marina profunda rica en minerales que hidrata y calma.",
  "Agua marina": "Agua marina rica en minerales que hidrata y reequilibra la piel.",
  Aminoácidos: "Componentes del factor natural de hidratación de la piel.",
  Pantenol: "Vitamina B5 que calma, repara y mantiene la hidratación.",
  "Centella asiática": "Planta calmante que repara la barrera, reduce rojeces y acelera la regeneración.",
  "Heartleaf (Houttuynia cordata)": "Planta coreana calmante y antibacteriana; ideal para piel con acné o rojez.",
  Quercetinol: "Derivado calmante de la quercetina; reduce rojeces e irritación.",
  "Ñame coreano": "Nutritivo y calmante; rico en mucílagos hidratantes.",
  "Sulfato de zinc": "Astringente y calmante; matifica la piel grasa.",
  AHA: "Exfoliante hidrosoluble que renueva la superficie y aporta luminosidad.",
  "Aloe vera": "Hidrata y calma las irritaciones.",
  "Mucina de caracol": "Regenera, hidrata y aporta luminosidad; repara la barrera cutánea.",
  "Arcilla volcánica de Jeju": "Absorbe el sebo y limpia los poros en profundidad.",
  PHA: "Exfoliante de molécula grande, muy suave; ideal para pieles sensibles.",
  "Péptidos": "Cadenas de aminoácidos que estimulan el colágeno y mejoran la firmeza.",
  "Allantoína": "Calma y suaviza; favorece la regeneración celular.",
  Trealosa: "Azúcar humectante que retiene la hidratación y protege la piel.",
  "Extracto de cebolla roja": "Rico en quercetina: aclara las marcas y calma la piel.",
  Neoglucosamina: "Acelera la renovación celular y difumina manchas; exfoliante suave.",
  "Vitamina C (ácido ascórbico)": "Vitamina C pura: la más potente para aclarar manchas y antioxidante.",
  "Vitamina C": "Antioxidante que aclara manchas, ilumina y estimula el colágeno.",
  "Glutatión": "Antioxidante que aclara y protege del daño oxidativo.",
  "Alfa-arbutina": "Aclara las manchas y unifica el tono de forma suave y estable.",
  "Propóleo": "Resina de abeja antibacteriana y calmante; nutre y protege.",
  "Aceite de jojoba": "Lípidos similares al sebo: equilibra y nutre sin obstruir los poros.",
  Guaiazuleno: "Antiinflamatorio de color azul que calma las pieles reactivas.",
  Squalano: "Emoliente ligero que hidrata y refuerza la barrera.",
  "Aceites nutritivos": "Lípidos que nutren en profundidad las pieles secas.",
  Miel: "Humectante y antibacteriano natural que nutre la piel.",
  "Savia de abedul": "Hidrata y refresca; rica en aminoácidos y minerales.",
  Betaina: "Humectante que equilibra la hidratación de la piel.",
  "Extracto de flor de cerezo de Jeju": "Antioxidante que ilumina y suaviza la piel.",
  "Filtros UVA/UVB (Mexoryl)": "Tecnología de filtros solares de amplio espectro y alta estabilidad.",
  "Filtros UVA/UVB": "Filtros solares que protegen de quemaduras, manchas y fotoenvejecimiento.",
  "Óxido de zinc": "Calma, seca los granos y actúa como filtro solar mineral.",
  "Dióxido de titanio": "Filtro solar mineral físico de amplio espectro.",
  "Probióticos": "Equilibran el microbioma cutáneo y refuerzan la barrera.",
  "Colágeno": "Proteína estructural que aporta firmeza y elasticidad.",
  "Caolín": "Arcilla suave que absorbe el exceso de grasa sin resecar.",
  "Carbón": "Absorbe las impurezas y desintoxica la piel.",
  Arcilla: "Absorbe el exceso de grasa y limpia la piel.",
  "Extracto de manzana": "Antioxidante suave con AHA naturales.",
  "Corteza de sauce": "Fuente natural de salicina, precursor del BHA.",
  "Flor de albaricoquero": "Suaviza y aporta luminosidad a la piel.",
  "Ácido láctico (AHA)": "AHA suave e hidratante que renueva sin irritar.",
  Retinol: "Vitamina A que renueva la piel, difumina arrugas y manchas; usar de noche con protector solar.",
  Retinal: "Forma de vitamina A más rápida que el retinol; antiedad y antiimperfecciones.",
  Proxilane: "Complejo de L'Oréal que mejora la firmeza y reduce las arrugas.",
  Cafeína: "Descongestiona y reduce la hinchazón; ideal para el contorno de ojos.",
  Procerad: "Complejo de La Roche-Posay que previene las marcas post-acné.",
  LHA: "Ácido caproil salicílico: exfoliante ultra suave para pieles sensibles con acné.",
  "Peróxido de benzoilo": "Antibacteriano potente contra el acné; puede resecar la piel.",
  Hidrocoloide: "Material que absorbe los líquidos y crea un ambiente húmedo de curación.",
  "Cera de abeja": "Emoliente que forma una película protectora sobre la piel.",
  Calamina: "Calma y seca las lesiones; alivia la irritación.",
  "Aceite de árbol de té": "Antibacteriano natural que combate el acné.",
  "Vitamina E": "Antioxidante liposoluble que protege la barrera lipídica.",
  "PDRN (ADN de salmón)": "Regenera y reafirma; mejora la elasticidad y la reparación cutánea.",
  "NMN (nicotinamida mononucleótido)": "Precursor del NAD+ que energiza y renueva la célula.",
  "Té negro": "Antioxidante que mejora la elasticidad y la firmeza de la piel.",
};

// ---------- Lógica principal del seed ----------
async function main() {
  console.log("🌱 Iniciando seed de la tienda...");

  // 1. Marcas
  const marcas = JSON.parse(
    fs.readFileSync(path.join("prisma", "marcas.json"), "utf8")
  ) as MarcaJson[];
  for (const m of marcas) {
    await prisma.brand.upsert({
      where: { slug: m.slug },
      update: { nombre: m.nombre, pais: m.pais, descripcion: m.descripcion },
      create: { slug: m.slug, nombre: m.nombre, pais: m.pais, descripcion: m.descripcion },
    });
  }
  console.log(`   ✔ Marcas: ${marcas.length}`);

  // 2. Categorías
  const categorias = JSON.parse(
    fs.readFileSync(path.join("prisma", "categorias.json"), "utf8")
  ) as CategoriaJson[];
  for (const c of categorias) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { nombre: c.nombre, icono: c.icono, descripcion: c.descripcion, orden: c.orden },
      create: { slug: c.slug, nombre: c.nombre, icono: c.icono, descripcion: c.descripcion, orden: c.orden },
    });
  }
  console.log(`   ✔ Categorías: ${categorias.length}`);

  // 3. Ingredientes del diccionario (con descripción)
  for (const [nombre, descripcion] of Object.entries(diccIngredientes)) {
    await prisma.ingredient.upsert({
      where: { slug: slugify(nombre) },
      update: { nombre, descripcion },
      create: { slug: slugify(nombre), nombre, descripcion },
    });
  }
  console.log(`   ✔ Ingredientes del diccionario: ${Object.keys(diccIngredientes).length}`);

  // 4. Productos (72 registros; 70 quedan activos tras aplicar las sustituciones)
  const lotes = ["productos-01.json", "productos-02.json", "productos-03.json", "productos-04.json", "productos-05.json"];
  let totalProductos = 0;

  for (const lote of lotes) {
    const productos = JSON.parse(
      fs.readFileSync(path.join("prisma", lote), "utf8")
    ) as ProductoJson[];

    for (const p of productos) {
      // Validar que la marca y la categoría existan
      const brand = await prisma.brand.findUnique({ where: { slug: p.marca } });
      const category = await prisma.category.findUnique({ where: { slug: p.categoria } });
      if (!brand || !category) {
        throw new Error(`Marca o categoría no encontrada en ${p.slug}: ${p.marca} / ${p.categoria}`);
      }

      const datosComunes = {
        nombre: p.nombre,
        descripcion: p.descripcion,
        modoUso: p.modoUso,
        precio: p.precio,
        stock: p.stock,
        destacado: p.destacado,
        imagen: `/images/productos/${p.slug}.svg`,
        tipoPiel: JSON.stringify(p.tipoPiel),
        preocupaciones: JSON.stringify(p.preocupaciones),
        brandId: brand.id,
        categoryId: category.id,
      };

      const producto = await prisma.product.upsert({
        where: { slug: p.slug },
        update: datosComunes,
        create: { slug: p.slug, ...datosComunes },
      });

      // Ingredientes clave del producto (relación N:M)
      for (let i = 0; i < p.ingredientes.length; i++) {
        const nombreIng = p.ingredientes[i];
        const ingrediente = await prisma.ingredient.upsert({
          where: { slug: slugify(nombreIng) },
          update: {},
          create: {
            slug: slugify(nombreIng),
            nombre: nombreIng,
            descripcion: diccIngredientes[nombreIng] ?? null,
          },
        });
        await prisma.productIngredient.upsert({
          where: {
            productId_ingredientId: { productId: producto.id, ingredientId: ingrediente.id },
          },
          update: { orden: i },
          create: { productId: producto.id, ingredientId: ingrediente.id, orden: i },
        });
      }

      // Generar la imagen placeholder SVG
      const rutaSvg = path.join("public", "images", "productos", `${p.slug}.svg`);
      fs.mkdirSync(path.dirname(rutaSvg), { recursive: true });
      fs.writeFileSync(rutaSvg, generarSvg(p.nombre, brand.nombre, p.categoria), "utf8");

      totalProductos++;
    }
    console.log(`   ✔ ${lote}: ${productos.length} productos`);
  }

  // Conserva pedidos e historial, pero oculta del catálogo los productos
  // retirados por no tener foto cargada o sustituidos por nuevos productos con foto.
  const productosExcluidos = JSON.parse(
    fs.readFileSync(path.join("prisma", "productos-excluidos.json"), "utf8")
  ) as string[];
  const excluidosDesactivados = await prisma.product.updateMany({
    where: { slug: { in: productosExcluidos } },
    data: { activo: false },
  });

  // 5. Resumen final
  const conteo = {
    marcas: await prisma.brand.count(),
    categorias: await prisma.category.count(),
    ingredientes: await prisma.ingredient.count(),
    productos: await prisma.product.count(),
    relacionesProductoIngrediente: await prisma.productIngredient.count(),
  };
  console.log("\n✅ Seed completado");
  console.log(`   Marcas: ${conteo.marcas}`);
  console.log(`   Categorías: ${conteo.categorias}`);
  console.log(`   Ingredientes: ${conteo.ingredientes}`);
  console.log(`   Productos: ${conteo.productos} (procesados: ${totalProductos})`);
  console.log(`   Productos retirados del catálogo: ${excluidosDesactivados.count}`);
  console.log(`   Relaciones producto-ingrediente: ${conteo.relacionesProductoIngrediente}`);
  console.log(`   Imágenes SVG generadas en public/images/productos/`);
}

main()
  .catch((e) => {
    console.error("❌ Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
