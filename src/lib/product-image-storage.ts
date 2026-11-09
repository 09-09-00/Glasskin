import "server-only";

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const MAX_PRODUCT_IMAGES = 8;
export const MAX_PRODUCT_IMAGE_BYTES = 8 * 1024 * 1024;
const VALID_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const PRODUCTS_ROOT = path.join(process.cwd(), "public", "productos");
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "product-images";

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

function storageConfig() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (url && key) return { url, key };
  if (process.env.VERCEL) {
    throw new Error("Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para guardar imágenes en producción.");
  }
  return null;
}

function encodedObjectPath(value: string): string {
  return value.split("/").map(encodeURIComponent).join("/");
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

  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.webp`;
  const objectPath = `${slug}/${filename}`;
  const storage = storageConfig();
  let url: string;

  if (storage) {
    const response = await fetch(`${storage.url}/storage/v1/object/${encodeURIComponent(STORAGE_BUCKET)}/${encodedObjectPath(objectPath)}`, {
      method: "POST",
      headers: {
        apikey: storage.key,
        Authorization: `Bearer ${storage.key}`,
        "Content-Type": "image/webp",
        "x-upsert": "false",
      },
      body: optimized.data,
    });
    if (!response.ok) throw new Error("Supabase Storage no pudo guardar la imagen. Revisa el bucket y su configuración.");
    url = `${storage.url}/storage/v1/object/public/${encodeURIComponent(STORAGE_BUCKET)}/${encodedObjectPath(objectPath)}`;
  } else {
    const directory = path.join(PRODUCTS_ROOT, slug);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, filename), optimized.data);
    url = `/productos/${slug}/${filename}`;
  }

  return {
    url,
    width: optimized.info.width,
    height: optimized.info.height,
    mimeType: "image/webp",
    size: optimized.data.byteLength,
    blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
  };
}

export async function deleteStoredProductImage(url: string): Promise<void> {
  // Existing committed public images are immutable on Vercel and remain available.
  if (url.startsWith("/productos/") && process.env.VERCEL) return;
  if (url.startsWith("/productos/")) {
    const relative = url.replace(/^\/+/, "").replaceAll("/", path.sep);
    const target = path.resolve(process.cwd(), "public", relative);
    const root = path.resolve(PRODUCTS_ROOT) + path.sep;
    if (!target.startsWith(root)) return;
    await fs.rm(target, { force: true });
    return;
  }

  const storage = storageConfig();
  if (storage && url.startsWith(`${storage.url}/storage/v1/object/public/${encodeURIComponent(STORAGE_BUCKET)}/`)) {
    const prefix = `${storage.url}/storage/v1/object/public/${encodeURIComponent(STORAGE_BUCKET)}/`;
    const objectPath = url.slice(prefix.length).split("?")[0].split("/").map(decodeURIComponent).join("/");
    const response = await fetch(`${storage.url}/storage/v1/object/${encodeURIComponent(STORAGE_BUCKET)}`, {
      method: "DELETE",
      headers: {
        apikey: storage.key,
        Authorization: `Bearer ${storage.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: [objectPath] }),
    });
    if (!response.ok) throw new Error("Supabase Storage no pudo borrar la imagen.");
    return;
  }

}
