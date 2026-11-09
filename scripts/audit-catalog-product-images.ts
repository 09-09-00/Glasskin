import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
try {
  const products = await prisma.product.findMany({
    where: { activo: true },
    include: { imagenes: { orderBy: [{ principal: "desc" }, { orden: "asc" }] } },
    orderBy: { slug: "asc" },
  });
  const primary = products.map((product) => ({ product, image: product.imagenes.find((image) => image.principal) ?? product.imagenes[0] }));
  const missingFiles = [];
  for (const row of primary) {
    if (!row.image || row.image.url.startsWith("http")) continue;
    const localPath = path.join(process.cwd(), "public", row.image.url.replace(/^\//, ""));
    try { await fs.access(localPath); } catch { missingFiles.push({ slug: row.product.slug, name: row.product.nombre, url: row.image.url }); }
  }
  console.log(JSON.stringify({
    active: products.length,
    withoutImages: products.filter((p) => p.imagenes.length === 0).map((p) => ({ slug: p.slug, name: p.nombre })),
    placeholderPrimaries: primary.filter(({ image }) => image?.url.endsWith(".svg")).map(({ product }) => ({ slug: product.slug, name: product.nombre })),
    missingFiles,
    lowResolution: primary.filter(({ image }) => image && image.width && image.width < 350).map(({ product, image }) => ({ slug: product.slug, name: product.nombre, width: image!.width, height: image!.height, url: image!.url })),
  }, null, 2));
} finally {
  await prisma.$disconnect();
}
