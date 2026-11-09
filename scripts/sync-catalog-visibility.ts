import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL no está configurada");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const excludedSlugs = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "prisma", "productos-excluidos.json"), "utf8")
  ) as string[];

  const result = await prisma.product.updateMany({
    where: { slug: { in: excludedSlugs } },
    data: { activo: false },
  });

  const activeProducts = await prisma.product.count({ where: { activo: true } });
  console.log(`Productos retirados del catálogo: ${result.count}`);
  console.log(`Productos activos en la base de datos: ${activeProducts}`);
}

main()
  .catch((error) => {
    console.error("No se pudo sincronizar el catálogo:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
