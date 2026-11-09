import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  const root = process.cwd();
  const products = JSON.parse(fs.readFileSync(path.join(root, "prisma", "productos-05.json"), "utf8")) as Array<{
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
  }>;
  const nuevosSlugs = [
    "la-roche-posay-redermic-r-eyes-contorno-ojos",
    "la-roche-posay-redermic-hyalu-c-eyes-contorno-ojos",
  ];

  for (const slug of nuevosSlugs) {
    const product = products.find((item) => item.slug === slug);
    if (!product) throw new Error(`No se encontró ${slug} en productos-05.json`);
    const brand = await prisma.brand.findUnique({ where: { slug: product.marca } });
    const category = await prisma.category.findUnique({ where: { slug: product.categoria } });
    if (!brand || !category) throw new Error(`Falta la marca o categoría para ${slug}`);

    const common = {
      nombre: product.nombre,
      descripcion: product.descripcion,
      modoUso: product.modoUso,
      precio: product.precio,
      stock: product.stock,
      destacado: product.destacado,
      activo: true,
      imagen: `/images/productos/${slug}.svg`,
      tipoPiel: JSON.stringify(product.tipoPiel),
      preocupaciones: JSON.stringify(product.preocupaciones),
      brandId: brand.id,
      categoryId: category.id,
    };
    const saved = await prisma.product.upsert({
      where: { slug },
      update: common,
      create: { slug, ...common },
    });

    for (const [orden, nombre] of product.ingredientes.entries()) {
      const ingrediente = await prisma.ingredient.upsert({
        where: { slug: slugify(nombre) },
        update: {},
        create: { slug: slugify(nombre), nombre },
      });
      await prisma.productIngredient.upsert({
        where: { productId_ingredientId: { productId: saved.id, ingredientId: ingrediente.id } },
        update: { orden },
        create: { productId: saved.id, ingredientId: ingrediente.id, orden },
      });
    }
    console.log(`Producto agregado: ${product.nombre}`);
  }

  const excludedSlugs = JSON.parse(fs.readFileSync(path.join(root, "prisma", "productos-excluidos.json"), "utf8")) as string[];
  await prisma.product.updateMany({ where: { slug: { in: excludedSlugs } }, data: { activo: false } });
  const activeCount = await prisma.product.count({ where: { activo: true } });
  if (activeCount !== 70) throw new Error(`El catálogo quedó con ${activeCount} productos activos; se esperaban 70.`);
  console.log(`Productos activos en el catálogo: ${activeCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
