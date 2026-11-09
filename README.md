# Glasskin — Tienda de Skincare con Asistente Inteligente

E-commerce de cuidado facial (skincare) con marcas coreanas y dermatológicas, asistente de IA para recomendaciones, rutinas personalizadas y automatización.

## Experiencia Glasskin

- Identidad visual premium y responsive con portada editorial propia.
- Catálogo de 70 productos, 13 marcas y 10 categorías.
- Búsqueda por producto, marca, categoría, descripción e ingrediente.
- Sugerencias relacionadas según categoría, marca y preocupación de piel.
- Guías de cuidado para acné, manchas, deshidratación, líneas, poros y rojez.
- Skin AI con buscador, rutina mañana/noche y rutina por presupuesto.
- Modo inteligente local cuando no existe `NVIDIA_API_KEY`; con clave configurada usa el modelo externo.
- Panel de propietario con login, sesión firmada y CRUD de productos/categorías.
- Consulta de pedidos protegida por correo + número de pedido.

## Stack
- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **PostgreSQL persistente** con **Prisma ORM 7** y driver `pg`
- **NVIDIA API** (formato OpenAI) para el asistente IA
- **better-sqlite3** como driver nativo

## Requisitos
- Node.js 20 o 22 recomendado (Node 24 también está contemplado por la configuración local)
- npm 10+

## Instalación

```bash
# 1. Clonar e instalar dependencias
git clone <repo>
cd sistema
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Edita .env: configura DATABASE_URL. En una instalación local, el acceso de propietario se crea desde /propietario/login.

# 3. Base de datos
# Este proyecto ya tiene PostgreSQL y un catálogo de 70 productos. No ejecutes seed sobre
# una base con información propia salvo que quieras reimportar el catálogo.

# 4. Apertura recomendada (elige un puerto libre y comprueba la base)
npm run open         # o doble clic en ABRIR-GLASSKIN.cmd

# 5. Producción
npm run build
npm start
```

## Comandos útiles
| Comando | Descripción |
|---------|-------------|
| `npm run open` | Iniciador recomendado: puerto libre + chequeo real de BD |
| `npm run stop` | Detiene el servidor iniciado por `npm run open` |
| `npm run dev` | Servidor de desarrollo estable |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npm run db:push` | Sincroniza el esquema Prisma con PostgreSQL |
| `npm run db:seed` | Puebla la BD con 72 fichas y mantiene 70 productos activos |
| `npm run db:add-eye-products` | Agrega los dos contornos La Roche-Posay y aplica las sustituciones |
| `npm run db:catalog-sync` | Retira del catálogo los productos listados en `prisma/productos-excluidos.json` sin borrar pedidos ni historial |
| `npm run db:studio` | Abre Prisma Studio (GUI para la BD) |

## Estructura del proyecto
```
src/
├── app/                    # App Router (páginas y APIs)
│   ├── api/
│   │   ├── productos/      # GET catálogo para IA
│   │   ├── pedidos/        # POST crear orden (checkout)
│   │   ├── admin/          # Login + CRUD productos/categorías/pedidos
│   │   ├── categorias/     # GET categorías para filtros
│   │   └── ia/             # POST buscar, rutina, rutina-presupuesto
│   ├── admin/              # Panel protegido (productos, categorías, pedidos, videos, settings)
│   ├── propietario/login/  # Inicio de sesión del propietario
│   ├── catalogo/           # Catálogo con filtros + SEO
│   ├── carrito/            # Carrito persistente (localStorage)
│   ├── checkout/           # Formulario + crear orden
│   ├── cuenta/             # Consultar pedidos por email
│   ├── favoritos/          # Lista de deseos (wishlist)
│   ├── ia/                 # Asistente IA (buscar, rutina, presupuesto)
│   ├── marca/[slug]/       # Páginas de marca
│   ├── producto/[slug]/    # Detalle producto (galería, videos, ingredientes) + SEO
│   └── videos/             # Buscador de videos por producto/marca/categoría/tema
├── components/             # Componentes React (Client)
│   ├── CarritoProvider.tsx # Contexto + localStorage
│   ├── WishlistProvider.tsx # Contexto favoritos + localStorage
│   ├── MonedaProvider.tsx  # Contexto moneda (cookie)
│   ├── Header.tsx          # Navegación + carrito + wishlist + selector moneda
│   ├── Footer.tsx
│   ├── TarjetaProducto.tsx # Con botón wishlist + precio formateado
│   ├── AgregarAlCarrito.tsx
│   ├── GaleriaProducto.tsx # Lightbox + zoom + miniaturas
│   └── FiltrosCatalogo.tsx
├── lib/                    # Utilidades compartidas
│   ├── prisma.ts           # Cliente Prisma singleton (adapter PostgreSQL)
│   ├── productos.ts        # Consultas de catálogo
│   ├── config.ts           # Configuración tienda
│   ├── constantes.ts       # Enums: tipos piel, preocupaciones, estados pedido
│   ├── format-client.ts    # Formateo precios/fechas (client-safe)
│   ├── format.ts           # Formateo server-side (lee tasa de BD)
│   ├── useFormatearPrecio.ts # Hook formateo precio cliente
│   ├── moneda.ts           # Sistema moneda USD/PYG + tasa
│   ├── moneda-provider.tsx # Contexto moneda cliente
│   ├── cookie.ts           # Helpers cookie moneda
│   └── imagen-placeholder.ts # Generador SVG por categoría
└── generated/prisma/       # Cliente Prisma generado
prisma/
├── schema.prisma           # Modelos: Brand, Category, Product, Ingredient, Video, Customer, Order, OrderItem, Subscription, Setting
├── marcas.json             # 13 marcas reales
├── categorias.json         # 10 categorías
├── productos-01..05.json   # 72 fichas; 70 activas
├── productos-excluidos.json # productos retirados del catálogo
└── seed.ts                 # Script de seed + generador SVG
```

## Marcas incluidas (13)
**Dermatológicas:** La Roche-Posay, Neutrogena, L'Oréal Paris
**Coreanas (K-Beauty):** Medicube, COSRX, Beauty of Joseon, Anua, Round Lab, Skin1004, Innisfree, Laneige, Isntree, Torriden

## Categorías (10)
Limpiadores, Tónicos/Esencias, Sérums, Hidratantes, Protectores Solares, Mascarillas, Exfoliantes, Contornos de Ojos, Tratamientos Acné, Tratamientos Antiedad

## Variables de entorno (.env)
```env
DATABASE_URL="postgresql://usuario:clave@host:5432/glasskin?sslmode=require"
NVIDIA_API_KEY=""           # Clave de https://build.nvidia.com (para IA)
NVIDIA_BASE_URL="https://integrate.api.nvidia.com/v1"
NVIDIA_MODELO="meta/llama-3.1-70b-instruct"
RESEND_API_KEY=""          # Opcional: envío automático de confirmaciones y cambios de pedido
EMAIL_FROM="Glasskin <pedidos@tu-dominio.com>" # Remitente verificado en Resend
EMAIL_REPLY_TO="hola@glasskin.com"             # Opcional
ADMIN_USER=""               # Usuario elegido por el propietario
ADMIN_PASSWORD=""           # Contraseña robusta elegida por el propietario
ADMIN_SESSION_SECRET=""     # Cadena aleatoria larga para firmar la sesión
```

## Despliegue académico en Vercel y Supabase

- En Supabase crea una base nueva para la demo. Usa `DATABASE_URL` con el Shared Transaction Pooler (puerto 6543) para las funciones de Vercel y `DIRECT_URL` con el Session Pooler (puerto 5432) para comandos Prisma desde tu computadora.
- Antes de publicar, crea el esquema con `npm run db:push` y carga las marcas, categorías y catálogo base con `npm run db:seed`. Ejecuta el seed solo en esta base nueva; los pedidos y demás datos locales no se copian automáticamente.
- En Vercel configura `DATABASE_URL`, `DIRECT_URL`, `ADMIN_USER`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` y `CRON_SECRET` como variables privadas del proyecto.
- Para subir fotos desde el panel, crea en Supabase Storage un bucket público llamado `product-images` y configura `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en Vercel. Esa clave se usa solo desde el servidor y nunca debe ponerse en una variable `NEXT_PUBLIC_`.
- En Vercel Hobby, los recordatorios automáticos se ejecutan una vez al día. Desde el servidor local se revisan cada hora; en ambos casos también pueden procesarse manualmente desde el panel.
- Los avisos por correo quedan como borradores mientras no se configuren las credenciales de Resend.

## Funcionalidades implementadas

### ✅ Moneda PYG/USD (completa)
- Selector en header (3 ubicaciones: desktop, mobile nav, mobile menu)
- Tasa editable en `/admin/settings` con UI, ejemplos de conversión y reset a default
- Lectura pública `/api/configuracion/tasa` y escritura protegida `/api/admin/settings/tasa`
- Formateo correcto en **todas las pantallas**: catálogo, filtros precio, detalle, carrito, checkout, pedidos, cuenta, admin, IA
- Guaraníes sin decimales, con punto de miles (Gs. 7.500)
- Rutina por presupuesto respeta moneda elegida

### ✅ Fotos (completa)
- Subida hasta 5 fotos por producto en `/admin/productos` (URL + archivo + sincronizar carpeta)
- Archivo se guarda en `public/productos/<slug>/` vía API upload (`/api/admin/productos/[id]/imagenes/upload`)
- Foto principal marcada con badge
- Galería con zoom (lightbox) en detalle de producto
- Carga masiva: `public/productos/<slug>/` se asocia por slug
- Placeholder limpio con marca si no hay foto
- No descarga imágenes de internet

### ✅ Descripciones (completa)
- 70 productos activos con descripción completa
- Beneficios, ingredientes clave, modo de uso, tipos de piel, preocupaciones, precauciones
- Todo mostrado en `/producto/[slug]`

### ✅ Videos (completa)
- Videos relacionados en detalle de producto
- `/videos`: buscador por producto, marca, **categoría**, tema
- `/videos`: miniatura, título, descripción
- `/admin/videos`: alta pegando URL YouTube real (extrae y valida ID)
- Asociación a producto y/o marca
- Edición y borrado
- Sin videos de ejemplo con IDs inventados

### ✅ Tienda completa
- Checkout con validaciones
- Página de confirmación de pedido (`/checkout/exito`)
- Cuenta del cliente con historial (`/cuenta?email=`)
- Estados de pedido editables en admin
- Alertas de stock bajo (dashboard admin + card "Stock bajo (<5)")
- **Favoritos / lista de deseos** (`/favoritos`, botón ♡ en tarjetas, header con contador)
- **Páginas de marca** (`/marca/[slug]` con filtro por categoría)
- **SEO básico**: `generateMetadata` en catálogo, producto, marca con Open Graph

### ✅ Panel de propietario
- Login en `/propietario/login` con cookie `HttpOnly`, firma HMAC y expiración de 8 horas
- Primera configuración del usuario y contraseña desde la computadora local cuando faltan credenciales
- Productos: crear, editar, eliminar, activar/desactivar, stock, precio, descripción, marca, categoría e imágenes
- Categorías: crear, editar, ordenar y eliminar; se impide borrar una categoría que todavía tenga productos
- Resumen e inventario separado por categoría en `/admin/categorias`
- Pedidos: acceso directo a WhatsApp con mensaje preparado si el cliente dejó su teléfono

El enlace de WhatsApp abre la conversación y deja el mensaje listo para revisar y enviar. El envío totalmente automático requiere credenciales y configuración de la API oficial de WhatsApp Business.
- Los cambios usan la misma base que la tienda y aparecen automáticamente en el catálogo

### Avisos de pedidos por correo
- Al crear un pedido o cambiar su estado se prepara un mensaje en `/admin/automatizaciones`.
- Para enviarlo automáticamente, configura `RESEND_API_KEY` y `EMAIL_FROM`; verifica el dominio/remitente en Resend antes de usarlo con clientes.
- Sin esas variables, los mensajes quedan como borradores. Si un envío falla, queda marcado como error y puede reintentarse desde la bandeja.
- El chat puede consultar los últimos pedidos solo cuando el cliente inició sesión en su cuenta Glasskin.
- Los clientes pueden pedir seguimiento humano desde el chat. Solo al enviarlo se guarda su consulta y contacto; se clasifica en `/admin/consultas` con la última respuesta sugerida por la IA.

### Memoria de rutina y reposición sugerida
- En `/cuenta`, cada cliente puede dar o retirar consentimiento para guardar su tipo de piel y prioridades; retirar el consentimiento elimina también las preferencias y la rutina guardada.
- Skin AI precarga esas preferencias y permite guardar una rutina de mañana/noche en el perfil. El chat puede mostrarla después; las preferencias se incluyen en consultas a la IA externa solo mientras el consentimiento esté activo.
- El copiloto estima la reposición para 30 días usando ventas recientes no canceladas y un margen de 20%. La recomendación es informativa y nunca genera una compra automáticamente.
- El copiloto también destaca pedidos pendientes que llevan más de 24 horas sin actualizar.
- Después de cambios de esquema, sincroniza la base con `npm run db:push` y regenera el cliente Prisma con `npx prisma generate`.

### Recordatorios automáticos de reposición

- El cliente debe aceptar expresamente el aviso durante el checkout; puede pausarlo o cancelarlo desde Mi perfil.
- El servidor local persistente inicia un trabajador que revisa vencimientos cada 60 minutos por defecto. Ajusta `RECORDATORIOS_INTERVALO_MINUTOS` (mínimo 5) para cambiar el intervalo.
- Para enviar los avisos por correo, configura `RESEND_API_KEY` y `EMAIL_FROM`. Sin correo configurado, los avisos se guardan en Automatizaciones como borradores para reintentar.
- El botón de Automatizaciones permite ejecutar el proceso manualmente sin esperar al próximo ciclo.

## Notas técnicas
- **Imágenes**: placeholders SVG generados automáticamente por categoría (color degradado). Reemplaza con imágenes reales en `public/images/productos/<slug>.svg` o cambia a URLs externas.
- **Precios**: son de ejemplo (editables en Admin o BD).
- **Carrito/Wishlist**: viven en `localStorage` del navegador; precios se recalculan en servidor al crear la orden.
- **Stock**: se descuenta atómicamente en la transacción del pedido.
- **IA**: el proveedor está aislado en `src/lib/ia/` para poder cambiar proveedor.
- **Moneda**: sistema dual USD/PYG con tasa editable en BD, cookie de 1 año, recarga automática al cambiar.
- **OneDrive/Windows**: la salida temporal de Next se enlaza a `%LOCALAPPDATA%\\Glasskin` para evitar bloqueos `EPERM`; no contiene datos de negocio.

## Licencia
MIT — Uso libre para proyectos propios y comerciales.
