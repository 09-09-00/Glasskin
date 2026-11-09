import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const root = process.cwd();
const publicRoot = path.join(root, "public");
const importRoot = path.join(root, "import-images");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

// Estas cuatro fuentes tienen un fondo gris/beige uniforme. Se crea una copia
// con el fondo blanco; las imágenes fuente permanecen intactas.
const coloredBackgrounds = new Set([
  "cosrx-advanced-snail-peptide-eye-cream",
  "cosrx-ultimate-nourishing-rice-overnight-mask",
  "medicube-hyaluronic-ceramide-jelly-cream",
  "torriden-dive-in-tonico-hialuronico",
]);
const productMasks: Record<string, string> = {
  "cosrx-advanced-snail-peptide-eye-cream": "M88 5 Q88 2 95 2 L155 2 Q162 3 162 9 L160 117 Q165 121 165 129 L162 160 L164 301 Q164 314 153 317 L96 317 Q86 314 86 304 L82 205 Q78 161 84 132 L88 119 Z",
  "cosrx-ultimate-nourishing-rice-overnight-mask": "M71 1 L171 1 L171 17 L166 56 L164 112 L160 229 Q160 237 157 240 L157 274 L87 274 L87 241 Q83 234 82 222 L77 115 L73 48 L71 17 Z",
  "medicube-hyaluronic-ceramide-jelly-cream": "M145 101 Q145 76 163 70 Q179 66 371 68 Q396 69 398 89 L398 294 Q396 315 377 322 Q359 327 165 323 Q146 320 144 304 Z",
  "torriden-dive-in-tonico-hialuronico": "M486 272 Q487 267 497 267 L617 267 Q627 268 628 278 L628 381 Q628 391 647 400 Q705 421 710 456 L710 1071 Q710 1097 689 1109 Q679 1115 665 1117 Q585 1127 456 1123 Q426 1122 414 1110 Q403 1098 403 1072 L403 457 Q407 420 465 400 Q484 392 485 381 Z",
};

function csvFields(line: string) {
  return [...line.matchAll(/"((?:[^"]|"")*)"/g)].map((match) => match[1].replaceAll('""', '"'));
}

async function whitenBorderBackground(source: string, output: string, slug: string) {
  const meta = await sharp(source).metadata();
  if (!meta.width || !meta.height || !productMasks[slug]) throw new Error(`Falta máscara para ${slug}`);
  const mask = Buffer.from(`<svg width="${meta.width}" height="${meta.height}" viewBox="0 0 ${meta.width} ${meta.height}" xmlns="http://www.w3.org/2000/svg"><path d="${productMasks[slug]}" fill="white" fill-rule="evenodd"/></svg>`);
  const cutout = await sharp(source).ensureAlpha().composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  await sharp({ create: { width: meta.width, height: meta.height, channels: 3, background: "#fff" } })
    .composite([{ input: cutout }]).png().toFile(output);
  return { width: meta.width, height: meta.height, size: (await fs.stat(output)).size };
}

async function main() {
  const report = await fs.readFile(path.join(root, "reports", "imagenes-asociadas.csv"), "utf8");
  const sourceByUrl = new Map<string, string>();
  for (const line of report.split(/\r?\n/).slice(1)) {
    const [slug, , source, url] = csvFields(line);
    if (slug && source && url && !sourceByUrl.has(url)) sourceByUrl.set(url, source);
  }

  const products = await prisma.product.findMany({ where: { activo: true }, include: { imagenes: { orderBy: [{ principal: "desc" }, { orden: "asc" }] } }, orderBy: { slug: "asc" } });
  const updated: string[] = [];
  const missingOriginal: string[] = [];
  for (const product of products) {
    const primary = product.imagenes.find((image) => image.principal) ?? product.imagenes[0];
    if (!primary || (!primary.url.includes("-01.webp") && !primary.url.endsWith("-original-fondo-blanco.png"))) continue;
    let source = sourceByUrl.get(primary.url);
    if (!source) {
      const candidate = path.join(importRoot, `${product.slug}.png`);
      try { await fs.access(candidate); source = candidate; } catch { /* Sin archivo fuente asociado. */ }
    }
    if (!source) { missingOriginal.push(product.slug); continue; }
    try { await fs.access(source); } catch { missingOriginal.push(product.slug); continue; }

    const folder = path.join(publicRoot, "productos", product.slug);
    await fs.mkdir(folder, { recursive: true });
    const originalPath = path.join(folder, `${product.slug}-original.png`);
    const originalUrl = `/productos/${product.slug}/${product.slug}-original.png`;
    await fs.copyFile(source, originalPath);
    let finalPath = originalPath;
    let finalUrl = originalUrl;
    let meta: { width?: number; height?: number } = await sharp(originalPath).metadata();
    if (coloredBackgrounds.has(product.slug)) {
      finalPath = path.join(folder, `${product.slug}-original-fondo-blanco.png`);
      finalUrl = `/productos/${product.slug}/${product.slug}-original-fondo-blanco.png`;
      meta = await whitenBorderBackground(originalPath, finalPath, product.slug);
    }
    const size = (await fs.stat(finalPath)).size;
    await prisma.productImage.update({
      where: { id: primary.id },
      data: { url: finalUrl, width: meta.width ?? null, height: meta.height ?? null, size, mimeType: "image/png", blurDataUrl: null },
    });
    await prisma.product.update({ where: { id: product.id }, data: { imagen: finalUrl } });
    updated.push(`${product.slug}${coloredBackgrounds.has(product.slug) ? " (fondo blanco)" : " (original intacta)"}`);
  }

  // Recupera las cuatro referencias secundarias que se habían quitado de la
  // galería; sus archivos siempre se conservaron en disco.
  const secondary = [
    ["anua-heartleaf-quercetinol-espuma-limpiadora", "anua-heartleaf-quercetinol-espuma-limpiadora-obf-8809640735622-1200-framed.webp"],
    ["la-roche-posay-hyalu-b5-serum", "la-roche-posay-hyalu-b5-serum-obf-3337875583657-1200-framed.webp"],
    ["neutrogena-hydro-boost-water-gel", "neutrogena-hydro-boost-water-gel-obf-0070501110478-1200-framed.webp"],
    ["torriden-dive-in-serum-hialuronico", "torriden-dive-in-serum-hialuronico-obf-8809504741653-1200-framed.webp"],
  ];
  const restoredSecondary: string[] = [];
  for (const [slug, filename] of secondary) {
    const product = products.find((entry) => entry.slug === slug);
    if (!product) continue;
    const url = `/productos/${slug}/${filename}`;
    const fullPath = path.join(publicRoot, url.replace(/^\//, ""));
    try { await fs.access(fullPath); } catch { continue; }
    const exists = await prisma.productImage.findFirst({ where: { productId: product.id, url } });
    if (exists) continue;
    const meta = await sharp(fullPath).metadata();
    await prisma.productImage.create({
      data: {
        productId: product.id, url, alt: `${product.nombre} - fotografía adicional`, orden: product.imagenes.length,
        principal: false, width: meta.width ?? null, height: meta.height ?? null,
        size: (await fs.stat(fullPath)).size, mimeType: "image/webp",
        sourceName: "Open Beauty Facts", sourceUrl: `https://world.openbeautyfacts.org/product/${slug}`,
        license: "CC BY-SA",
      },
    });
    restoredSecondary.push(slug);
  }

  console.log(JSON.stringify({ activeProducts: products.length, primaryImagesRestored: updated.length, coloredBackgroundsWhitened: [...coloredBackgrounds].filter((slug) => updated.some((entry) => entry.startsWith(slug))), missingOriginal, restoredSecondary, updated }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
