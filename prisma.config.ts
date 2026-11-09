// ============================================================
//  Configuración de Prisma ORM 7
//  La URL de la base de datos se lee de la variable de entorno
//  DATABASE_URL (archivo .env), nunca se escribe en el código.
// ============================================================
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Prisma CLI/schema changes use the session-pooler URL when supplied.
    // The app runtime continues to use DATABASE_URL (transaction pooler on Vercel).
    url: process.env.DIRECT_URL?.trim() || env('DATABASE_URL'),
  },
})
