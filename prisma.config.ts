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
    url: env('DATABASE_URL'),
  },
})
