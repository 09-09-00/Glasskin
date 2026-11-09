import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const ROOT = process.cwd();
const REPORTS = path.join(ROOT, "reports");
const PUBLIC_PRODUCTS = path.join(ROOT, "public", "productos");
const API = "https://world.openbeautyfacts.org/api/v2/search";
const USER_AGENT = "Glasskin/1.0 (product image matching; Presidente Franco, Paraguay)";
const REQUEST_DELAY_MS = 6_500;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

type ObfProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  image_front_url?: string;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const translations: Record<string, string> = {
  aceite: "oil", agua: "water", arcilla: "clay", calmante: "soothing",
  crema: "cream", espuma: "foam", gel: "gel", hidratante: "moisturizing",
  limpiador: "cleanser", limpiadora: "cleanser", mascarilla: "mask",
  protector: "sun", solar: "sunscreen", serum: "serum", tonico: "toner",
  cleansing: "cleanser", moisturizing: "moisturizer",
  hydrating: "moisturizer", sunblock: "sunscreen",
};

const ignored = new Set(["de", "del", "la", "el", "con", "para", "facial", "skin", "care"]);

function tokens(value: string, brand = "") {
  const brandTokens = new Set(normalize(brand).split(" "));
  return normalize(value).split(" ")
    .map((token) => translations[token] ?? token)
    .filter((token) => token.length > 1 && !ignored.has(token) && !brandTokens.has(token));
}

function confidence(localName: string, remoteName: string, brand: string) {
  const local = [...new Set(tokens(localName, brand))];
  const remote = new Set(tokens(remoteName, brand));
  const matches = local.filter((token) => remote.has(token));
  const distinctive = matches.filter((token) => token.length >= 4);
  const coverage = local.length ? matches.length / local.length : 0;
  const remoteCoverage = remote.size ? matches.length / remote.size : 0;
  const requiredForms = ["cleanser", "serum", "ampoule", "toner", "mask", "sunscreen", "oil"].filter((term) => local.includes(term));
  const formCompatible = requiredForms.every((term) => remote.has(term));
  const unexpectedSunscreen = (remote.has("sunscreen") || remote.has("spf")) && !local.includes("sunscreen") && !local.includes("spf");
  return {
    score: Math.round((coverage * 0.65 + remoteCoverage * 0.35) * 1000) / 1000,
    matches,
    accepted: distinctive.length >= 2 && coverage >= 0.72 && formCompatible && !unexpectedSunscreen,
  };
}

function csv(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

async function delay() {
  await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
}

async function fetchBrand(brand: string) {
  const url = new URL(API);
  url.searchParams.set("brands_tags", normalize(brand).replaceAll(" ", "-"));
  url.searchParams.set("fields", "code,product_name,brands,image_front_url");
  url.searchParams.set("page_size", "100");
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`Open Beauty Facts respondió ${response.status} para ${brand}`);
  const payload = await response.json() as { products?: ObfProduct[] };
  return (payload.products ?? []).filter((item) => item.product_name && item.image_front_url);
}

async function saveImage(product: { id: number; slug: string; nombre: string }, candidate: ObfProduct) {
  const response = await fetch(candidate.image_front_url!, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`No se pudo descargar ${candidate.image_front_url}: ${response.status}`);
  const source = Buffer.from(await response.arrayBuffer());
  const optimized = await sharp(source).rotate().resize(1400, 1400, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 86, effort: 5 }).toBuffer({ resolveWithObject: true });
  const blur = await sharp(optimized.data).resize(24, 24, { fit: "inside" }).webp({ quality: 32 }).toBuffer();
  const directory = path.join(PUBLIC_PRODUCTS, product.slug);
  await fs.mkdir(directory, { recursive: true });
  const filename = `${product.slug}-obf-${candidate.code || "foto"}.webp`;
  await fs.writeFile(path.join(directory, filename), optimized.data);
  const url = `/productos/${product.slug}/${filename}`;

  await prisma.productImage.updateMany({ where: { productId: product.id }, data: { principal: false } });
  await prisma.productImage.create({ data: {
      productId: product.id,
      url,
      alt: `${product.nombre} - fotografía del producto`,
      orden: 0,
      principal: true,
      blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
      width: optimized.info.width,
      height: optimized.info.height,
      mimeType: "image/webp",
      size: optimized.data.byteLength,
      sourceName: "Open Beauty Facts",
      sourceUrl: `https://world.openbeautyfacts.org/product/${candidate.code}`,
      license: "CC BY-SA",
    } });
  await prisma.product.update({ where: { id: product.id }, data: { imagen: url } });
  return url;
}

async function writeReport(name: string, headers: string[], rows: Array<Record<string, unknown>>) {
  const content = [headers.map(csv).join(","), ...rows.map((row) => headers.map((key) => csv(row[key])).join(","))].join("\r\n");
  await fs.writeFile(path.join(REPORTS, name), content, "utf8");
}

async function main() {
  await fs.mkdir(REPORTS, { recursive: true });
  const products = await prisma.product.findMany({
    where: { activo: true },
    include: { brand: true, imagenes: true },
    orderBy: [{ brand: { nombre: "asc" } }, { nombre: "asc" }],
  });
  const brands = [...new Set(products.map((product) => product.brand.nombre))];
  const byBrand = new Map<string, ObfProduct[]>();

  for (const [index, brand] of brands.entries()) {
    const found = await fetchBrand(brand);
    byBrand.set(brand, found);
    console.log(`[${index + 1}/${brands.length}] ${brand}: ${found.length} fotos candidatas`);
    if (index < brands.length - 1) await delay();
  }

  const imported: Array<Record<string, unknown>> = [];
  const missing: Array<Record<string, unknown>> = [];
  const rejected: Array<Record<string, unknown>> = [];
  for (const product of products) {
    const candidates = (byBrand.get(product.brand.nombre) ?? []).map((candidate) => ({
      candidate,
      ...confidence(product.nombre, candidate.product_name!, product.brand.nombre),
    })).sort((a, b) => b.score - a.score);
    const best = candidates[0];
    const selectedSourceUrl = best?.candidate.code ? `https://world.openbeautyfacts.org/product/${best.candidate.code}` : null;
    const existingObf = product.imagenes.filter((image) => image.sourceName === "Open Beauty Facts");

    if (existingObf.length && (!best?.accepted || !existingObf.some((image) => image.sourceUrl === selectedSourceUrl))) {
      for (const image of existingObf) {
        if (image.url.startsWith("/productos/")) await fs.rm(path.join(ROOT, "public", image.url), { force: true });
      }
      await prisma.productImage.deleteMany({ where: { id: { in: existingObf.map((image) => image.id) } } });
      const fallback = `/images/productos/${product.slug}.svg`;
      await prisma.product.update({ where: { id: product.id }, data: { imagen: fallback } });
      product.imagenes = product.imagenes.filter((image) => image.sourceName !== "Open Beauty Facts");
      rejected.push({ producto: product.nombre, marca: product.brand.nombre, coincidencia: existingObf[0]?.sourceUrl ?? "", motivo: "coincidencia descartada por revisión estricta" });
    }

    const hasUploadedPhoto = product.imagenes.some((image) => !image.sourceName);

    if (!hasUploadedPhoto && best?.accepted) {
      const existing = product.imagenes.find((image) => image.sourceUrl === `https://world.openbeautyfacts.org/product/${best.candidate.code}`);
      const url = existing?.url ?? await saveImage(product, best.candidate);
      imported.push({ producto: product.nombre, marca: product.brand.nombre, coincidencia: best.candidate.product_name, puntaje: best.score, url, fuente: best.candidate.image_front_url });
    } else if (product.imagenes.length === 0) {
      missing.push({ producto: product.nombre, marca: product.brand.nombre, mejorCandidato: best?.candidate.product_name ?? "", puntaje: best?.score ?? 0, motivo: hasUploadedPhoto ? "foto propia existente" : "sin coincidencia exacta" });
    }
  }

  await writeReport("imagenes-open-beauty-facts.csv", ["producto", "marca", "coincidencia", "puntaje", "url", "fuente"], imported);
  await writeReport("imagenes-reales-pendientes.csv", ["producto", "marca", "mejorCandidato", "puntaje", "motivo"], missing);
  await writeReport("imagenes-descartadas.csv", ["producto", "marca", "coincidencia", "motivo"], rejected);
  console.log(`Fotografías reales importadas: ${imported.length}`);
  console.log(`Productos pendientes de foto real: ${missing.length}`);
  console.log(`Asociaciones dudosas retiradas: ${rejected.length}`);
  console.log(`Reportes guardados en ${REPORTS}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
