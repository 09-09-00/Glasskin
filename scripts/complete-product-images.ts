import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const ROOT = process.cwd();
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    connectionTimeoutMillis: 15_000,
    max: 10,
  }),
});

function rutaLocal(url: string) {
  if (!url.startsWith("/") || url.startsWith("//")) return null;
  return path.join(ROOT, "public", decodeURIComponent(url.slice(1)));
}

async function existeArchivo(url: string) {
  const file = rutaLocal(url);
  if (!file) return true;
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const products = await prisma.product.findMany({
    include: { imagenes: { orderBy: [{ principal: "desc" }, { orden: "asc" }] } },
    orderBy: { id: "asc" },
  });
  let added = 0;
  let repaired = 0;
  let preserved = 0;
  const pending: string[] = [];

  for (const product of products) {
    let principal: (typeof product.imagenes)[number] | undefined;
    for (const image of product.imagenes) {
      if (await existeArchivo(image.url)) {
        principal = image;
        break;
      }
    }

    if (!principal) {
      const fallback = `/images/productos/${product.slug}.svg`;
      if (!(await existeArchivo(fallback))) {
        pending.push(product.slug);
        continue;
      }
      if (product.imagenes.length) {
        await prisma.productImage.updateMany({
          where: { productId: product.id },
          data: { principal: false, orden: { increment: 1 } },
        });
      }
      const imagen = await prisma.productImage.create({
        data: {
          productId: product.id,
          url: fallback,
          alt: `${product.nombre} - ilustración del producto`,
          orden: 0,
          principal: true,
          sourceName: "Glasskin — ilustración de catálogo",
        },
      });
      principal = imagen;
      added += 1;
    } else if (!principal.principal) {
      await prisma.productImage.updateMany({ where: { productId: product.id }, data: { principal: false } });
      await prisma.productImage.update({ where: { id: principal.id }, data: { principal: true, orden: 0 } });
      repaired += 1;
    } else {
      preserved += 1;
    }

    if (product.imagen !== principal.url) {
      await prisma.product.update({ where: { id: product.id }, data: { imagen: principal.url } });
    }
  }

  console.log(`Productos revisados: ${products.length}`);
  console.log(`Imágenes principales añadidas: ${added}`);
  console.log(`Imágenes principales reparadas: ${repaired}`);
  console.log(`Imágenes existentes conservadas: ${preserved}`);
  console.log(`Productos sin archivo disponible: ${pending.length}`);
  if (pending.length) console.log(`Pendientes: ${pending.join(", ")}`);
}

main().catch((error) => {
  console.error("No se pudo completar el catálogo de imágenes:", error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
