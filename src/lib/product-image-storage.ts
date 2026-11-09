import "server-only";

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const MAX_PRODUCT_IMAGES = 8;
export const MAX_PRODUCT_IMAGE_BYTES = 8 * 1024 * 1024;
const VALID_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const PRODUCTS_ROOT = path.join(process.cwd(), "public", "productos");

export interface StoredProductImage {
  url: string;
  width: number;
  height: number;
  mimeType: string;
  size: number;
  blurDataUrl: string;
}

function safeSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

export async function storeProductImage(file: File, productSlug: string): Promise<StoredProductImage> {
  if (!VALID_MIME_TYPES.has(file.type)) throw new Error("Formato no válido. Usa JPG, PNG, WebP o AVIF.");
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) throw new Error("La imagen supera el máximo de 8 MB.");

  const slug = safeSlug(productSlug);
  if (!slug) throw new Error("El producto no tiene un slug válido.");

  const input = Buffer.from(await file.arrayBuffer());
  const optimized = await sharp(input, { failOn: "error" })
    .rotate()
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84, effort: 5 })
    .toBuffer({ resolveWithObject: true });

  const blur = await sharp(optimized.data)
    .resize(24, 24, { fit: "inside" })
    .webp({ quality: 35 })
    .toBuffer();

  const directory = path.join(PRODUCTS_ROOT, slug);
  await fs.mkdir(directory, { recursive: true });
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.webp`;
  await fs.writeFile(path.join(directory, filename), optimized.data);

  return {
    url: `/productos/${slug}/${filename}`,
    width: optimized.info.width,
    height: optimized.info.height,
    mimeType: "image/webp",
    size: optimized.data.byteLength,
    blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
  };
}

export async function deleteStoredProductImage(url: string): Promise<void> {
  if (!url.startsWith("/productos/")) return;
  const relative = url.replace(/^\/+/, "").replaceAll("/", path.sep);
  const target = path.resolve(process.cwd(), "public", relative);
  const root = path.resolve(PRODUCTS_ROOT) + path.sep;
  if (!target.startsWith(root)) return;
  await fs.rm(target, { force: true });
}
