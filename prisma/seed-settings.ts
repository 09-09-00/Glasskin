// Seed para settings (tasa de cambio)
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  await prisma.setting.upsert({
    where: { clave: "tasa_usd_pyg" },
    update: { valor: "7500" },
    create: { clave: "tasa_usd_pyg", valor: "7500" },
  });
  console.log("✅ Setting tasa_usd_pyg = 7500");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
