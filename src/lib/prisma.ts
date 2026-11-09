// ============================================================
//  Cliente único de Prisma para toda la aplicación
//  Prisma 7 usa driver adapters: aquí conectamos con PostgreSQL.
// ============================================================
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Obtiene la conexión persistente configurada en el entorno.
 */
function urlBaseDatos(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL no está configurada");

  // pg advierte que `sslmode=require` cambiará de semántica en su
  // próxima versión. Prisma Postgres ya entrega certificados verificables,
  // así que hacemos explícito el comportamiento seguro actual.
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.get("sslmode") === "require") {
      parsed.searchParams.set("sslmode", "verify-full");
    }
    return parsed.toString();
  } catch {
    throw new Error("DATABASE_URL no tiene un formato PostgreSQL válido");
  }
}

// Guardamos la instancia en globalThis para que el hot-reload de
// desarrollo no cree una conexión nueva en cada recarga.
const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalParaPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: urlBaseDatos(),
      connectionTimeoutMillis: 15_000,
      idleTimeoutMillis: 30_000,
      max: 10,
    }),
  });

if (process.env.NODE_ENV !== "production") {
  globalParaPrisma.prisma = prisma;
}
