import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const sources = [
  {
    slug: "cosrx-low-ph-good-morning-gel-limpiador",
    url: "/productos/cosrx-low-ph-good-morning-gel-limpiador/cosrx-low-ph-good-morning-gel-limpiador-original.png",
    sourceName: "Beauty Affairs",
    sourceUrl: "https://www.beautyaffairs.com.au/products/cosrx-low-ph-good-morning-gel-cleanser",
    mimeType: "image/png",
  },
  {
    slug: "loreal-revitalift-tonico-acido-glicolico",
    url: "/productos/loreal-revitalift-tonico-acido-glicolico/loreal-revitalift-tonico-acido-glicolico-original.jpg",
    sourceName: "Prostor",
    sourceUrl: "https://prostor.ua/ua/product/pilinh-tonik-dlia-oblychchia-l-oreal-revitalift-z-hlikolevoiu-kyslotoiu-180-ml/",
    mimeType: "image/jpeg",
  },
];

try {
  const updated: string[] = [];
  for (const source of sources) {
    const product = await prisma.product.findUnique({ where: { slug: source.slug }, include: { imagenes: true } });
    if (!product) continue;
    const localPath = path.join(process.cwd(), "public", source.url.replace(/^\//, ""));
    const metadata = await sharp(localPath).metadata();
    const primary = product.imagenes.find((image) => image.principal) ?? product.imagenes[0];
    const imageData = {
      url: source.url,
      alt: `${product.nombre} - imagen del producto`,
      principal: true,
      orden: 0,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      size: (await fs.stat(localPath)).size,
      mimeType: source.mimeType,
      blurDataUrl: null,
      sourceName: source.sourceName,
      sourceUrl: source.sourceUrl,
      license: null,
    };
    if (primary) await prisma.productImage.update({ where: { id: primary.id }, data: imageData });
    else await prisma.productImage.create({ data: { ...imageData, productId: product.id } });
    await prisma.productImage.updateMany({ where: { productId: product.id, id: { not: primary?.id ?? -1 } }, data: { principal: false, orden: { increment: 1 } } });
    await prisma.product.update({ where: { id: product.id }, data: { imagen: source.url } });
    updated.push(`${source.slug} ← ${source.sourceName}`);
  }
  console.log(JSON.stringify({ updated }, null, 2));
} finally {
  await prisma.$disconnect();
}
