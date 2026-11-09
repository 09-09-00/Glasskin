import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const root = process.cwd();
const importRoot = path.join(root, "import-images");
const publicRoot = path.join(root, "public", "productos");
const reportsRoot = path.join(root, "reports");
const validExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const cropOverrides: Record<string, { left: number; top: number; width: number; height: number; removeBackground?: boolean; autoCrop?: boolean }> = {
  // Envases blancos que se confundían con el fondo al recortarlos por píxeles.
  "cosrx-ultimate-nourishing-rice-overnight-mask": { left: 53, top: 0, width: 132, height: 275, autoCrop: false },
  "round-lab-1025-dokdo-mascarilla-water-gel": { left: 35, top: 42, width: 155, height: 168, removeBackground: false, autoCrop: false },
};

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function listImages(directory: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.map((entry) => {
      const fullPath = path.join(directory, entry.name);
      return entry.isDirectory() ? listImages(fullPath) : Promise.resolve(validExtensions.has(path.extname(entry.name).toLowerCase()) ? [fullPath] : []);
    }));
    return nested.flat();
  } catch {
    return [];
  }
}

function matchesProduct(filePath: string, product: { slug: string; sku: string | null; nombre: string }) {
  const stem = normalize(path.basename(filePath, path.extname(filePath)));
  const folder = normalize(path.basename(path.dirname(filePath)));
  const keys = [product.slug, product.sku ? normalize(product.sku) : "", normalize(product.nombre)].filter(Boolean);
  return keys.some((key) => folder === key || stem === key || stem.startsWith(`${key}-`) || stem.startsWith(`${key}_`));
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

async function createFramedImage(source: string, slug?: string) {
  const side = 1080;
  const crop = slug ? cropOverrides[slug] : undefined;
  // Aplana la transparencia y elimina el fondo uniforme conectado a los bordes.
  let input = sharp(source).rotate();
  if (crop) input = input.extract({ left: crop.left, top: crop.top, width: crop.width, height: crop.height });
  const flattened = await input.flatten({ background: "#fff" }).png().toBuffer();
  const { data, info } = await sharp(flattened).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const points = [
    [0, 0], [info.width - 1, 0], [0, info.height - 1], [info.width - 1, info.height - 1],
  ];
  const samples = points.map(([x, y]) => {
    const offset = (y * info.width + x) * info.channels;
    return [data[offset], data[offset + 1], data[offset + 2]];
  });
  const average = [0, 1, 2].map((channel) => Math.round(samples.reduce((sum, sample) => sum + sample[channel], 0) / samples.length));
  const uniformBorder = [0, 1, 2].every((channel) => Math.max(...samples.map((sample) => sample[channel])) - Math.min(...samples.map((sample) => sample[channel])) <= 20);
  const background = uniformBorder ? average : [255, 255, 255];
  const isBackground = (pixel: number) => {
    const offset = pixel * info.channels;
    return [0, 1, 2].every((channel) => Math.abs(data[offset + channel] - background[channel]) <= 16);
  };
  let minX = 0;
  let minY = 0;
  let maxX = info.width - 1;
  let maxY = info.height - 1;
  if (crop?.removeBackground !== false) {
    const total = info.width * info.height;
    const visited = new Uint8Array(total);
    const queue = new Uint32Array(total);
    let head = 0;
    let tail = 0;
    const enqueue = (pixel: number) => {
      if (!visited[pixel] && isBackground(pixel)) {
        visited[pixel] = 1;
        queue[tail++] = pixel;
      }
    };
    for (let x = 0; x < info.width; x++) {
      enqueue(x);
      enqueue((info.height - 1) * info.width + x);
    }
    for (let y = 0; y < info.height; y++) {
      enqueue(y * info.width);
      enqueue(y * info.width + info.width - 1);
    }
    while (head < tail) {
      const pixel = queue[head++];
      const x = pixel % info.width;
      const y = Math.floor(pixel / info.width);
      if (x > 0) enqueue(pixel - 1);
      if (x + 1 < info.width) enqueue(pixel + 1);
      if (y > 0) enqueue(pixel - info.width);
      if (y + 1 < info.height) enqueue(pixel + info.width);
    }

    minX = info.width;
    minY = info.height;
    maxX = -1;
    maxY = -1;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const pixel = y * info.width + x;
        const offset = pixel * info.channels;
        if (visited[pixel]) {
          data[offset] = 255;
          data[offset + 1] = 255;
          data[offset + 2] = 255;
        } else {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    if (maxX < minX || maxY < minY) {
      minX = 0;
      minY = 0;
      maxX = info.width - 1;
      maxY = info.height - 1;
    }
  }
  if (crop?.autoCrop === false) {
    minX = 0;
    minY = 0;
    maxX = info.width - 1;
    maxY = info.height - 1;
  }
  const marginX = Math.round((maxX - minX + 1) * 0.04);
  const marginY = Math.round((maxY - minY + 1) * 0.04);
  minX = Math.max(0, minX - marginX);
  minY = Math.max(0, minY - marginY);
  maxX = Math.min(info.width - 1, maxX + marginX);
  maxY = Math.min(info.height - 1, maxY + marginY);
  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;
  const trimmed = await sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } })
    .extract({ left: minX, top: minY, width: cropWidth, height: cropHeight })
    .resize(side, side, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer({ resolveWithObject: true });
  // Mantiene el formato vertical u horizontal de la foto. Un lienzo cuadrado
  // encogía los envases altos dentro de las tarjetas del catálogo.
  const x = Math.max(10, Math.round(trimmed.info.width * 0.05));
  const y = Math.max(10, Math.round(trimmed.info.height * 0.05));
  return sharp(trimmed.data)
    .extend({ left: x, right: x, top: y, bottom: y, background: "#fff" })
    .webp({ quality: 88, effort: 5 })
    .toBuffer({ resolveWithObject: true });
}

async function optimize(source: string, slug: string, index: number) {
  const directory = path.join(publicRoot, slug);
  await fs.mkdir(directory, { recursive: true });
  const output = path.join(directory, `${slug}-${String(index + 1).padStart(2, "0")}.webp`);
  const optimized = await createFramedImage(source, slug);
  const blur = await sharp(optimized.data).resize(24, 24, { fit: "inside" }).webp({ quality: 35 }).toBuffer();
  await fs.writeFile(output, optimized.data);
  return {
    url: `/productos/${slug}/${path.basename(output)}`,
    width: optimized.info.width,
    height: optimized.info.height,
    size: optimized.data.byteLength,
    mimeType: "image/webp",
    blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
  };
}

async function main() {
  await fs.mkdir(importRoot, { recursive: true });
  await fs.mkdir(reportsRoot, { recursive: true });
  const files = await listImages(importRoot);
  const products = await prisma.product.findMany({ include: { brand: true, imagenes: { orderBy: [{ principal: "desc" }, { orden: "asc" }] } } });
  const associated: Array<Record<string, unknown>> = [];
  const missing: Array<Record<string, unknown>> = [];

  for (const product of products) {
    const candidates = files.filter((file) => matchesProduct(file, product)).slice(0, 8);
    let currentCount = product.imagenes.length;
    let tieneFotoReal = product.imagenes.some((imagen) => !imagen.url.toLowerCase().endsWith(".svg"));
    for (const [index, source] of candidates.entries()) {
      tieneFotoReal = true;
      const stored = await optimize(source, product.slug, index);
      const exists = await prisma.productImage.findFirst({ where: { productId: product.id, url: stored.url } });
      if (!exists) {
        // La primera foto importada debe ser la principal, aunque antes
        // existiera una ilustración o una imagen provisional.
        const principal = currentCount === 0 || index === 0;
        if (principal) {
          await prisma.productImage.updateMany({
            where: { productId: product.id, principal: true },
            data: { principal: false, orden: { increment: 1 } },
          });
        }
        await prisma.productImage.create({ data: { ...stored, productId: product.id, alt: `${product.nombre} - foto ${index + 1}`, orden: currentCount, principal } });
        if (principal) await prisma.product.update({ where: { id: product.id }, data: { imagen: stored.url } });
        currentCount += 1;
        associated.push({ slug: product.slug, marca: product.brand.nombre, archivo: source, url: stored.url });
      } else {
        await prisma.productImage.update({
          where: { id: exists.id },
          data: {
            width: stored.width,
            height: stored.height,
            size: stored.size,
            mimeType: stored.mimeType,
            blurDataUrl: stored.blurDataUrl,
          },
        });
        associated.push({ slug: product.slug, marca: product.brand.nombre, archivo: source, url: stored.url });
      }
    }

    if (product.activo && !tieneFotoReal) missing.push({ slug: product.slug, sku: product.sku ?? "", producto: product.nombre, marca: product.brand.nombre });
  }

  // También normaliza las fotografías previas que no llegaron desde import-images.
  // Los SVG del catálogo ya escalan de forma vectorial y no necesitan conversión.
  let assetsNormalizados = 0;
  const publicImages = await listImages(publicRoot);
  for (const file of publicImages.filter((image) => path.extname(image).toLowerCase() === ".webp")) {
    // Las fotos de import-images ya se procesaron con el encuadre vertical.
    if (/-\d{2}\.webp$/i.test(file) || /-framed\.webp$/i.test(file)) continue;

    const normalized = await createFramedImage(file);
    const normalizedFile = file.replace(/\.webp$/i, "-framed.webp");
    let normalizedFileExists = false;
    try {
      await fs.access(normalizedFile);
      normalizedFileExists = true;
    } catch {
      // La versión optimizada todavía no existe.
    }
    if (!normalizedFileExists) await fs.writeFile(normalizedFile, normalized.data);

    const blur = await sharp(normalized.data).resize(24, 24, { fit: "inside" }).webp({ quality: 35 }).toBuffer();
    const oldUrl = `/${path.relative(path.join(root, "public"), file).split(path.sep).join("/")}`;
    const url = `/${path.relative(path.join(root, "public"), normalizedFile).split(path.sep).join("/")}`;
    await prisma.productImage.updateMany({
      where: { url: oldUrl },
      data: {
        url,
        width: normalized.info.width,
        height: normalized.info.height,
        size: normalized.data.byteLength,
        mimeType: "image/webp",
        blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
      },
    });
    await prisma.product.updateMany({ where: { imagen: oldUrl }, data: { imagen: url } });
    assetsNormalizados += 1;
  }

  const writeReport = async (name: string, rows: Array<Record<string, unknown>>, headers: string[]) => {
    const heading = headers.map(csvCell).join(",");
    const freshRows = rows.map((row) => headers.map((header) => csvCell(row[header])).join(","));
    let previousRows: string[] = [];
    if (name === "imagenes-asociadas.csv") {
      try {
        previousRows = (await fs.readFile(path.join(reportsRoot, name), "utf8"))
          .split(/\r?\n/)
          .filter((line) => line && line !== heading);
      } catch {
        // El reporte se crea en la primera importación.
      }
    }
    const content = [heading, ...new Set([...previousRows, ...freshRows])].join("\r\n");
    await fs.writeFile(path.join(reportsRoot, name), content, "utf8");
  };
  await writeReport("imagenes-asociadas.csv", associated, ["slug", "marca", "archivo", "url"]);
  await writeReport("imagenes-faltantes.csv", missing, ["slug", "sku", "producto", "marca"]);

  console.log(`Productos revisados: ${products.length}`);
  console.log(`Imágenes asociadas: ${associated.length}`);
  console.log(`Productos sin fotografía real: ${missing.length}`);
  console.log(`Fotografías anteriores normalizadas: ${assetsNormalizados}`);
  console.log(`Reportes: ${reportsRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
