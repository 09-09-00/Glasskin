// ============================================================
//  Detalle de producto con galería de imágenes, videos,
//  ingredientes, modo de uso, productos relacionados
// ============================================================
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { imagenPrincipalProducto, obtenerCalificacionesProductos, obtenerProductoPorSlug, obtenerProductosRelacionados } from "@/lib/productos";
import { leerListaJson, etiquetaDe, TIPOS_PIEL, PREOCUPACIONES } from "@/lib/constantes";
import { formatearPrecioServer, obtenerMonedaServer } from "@/lib/format";
import { AgregarAlCarrito } from "@/components/AgregarAlCarrito";
import { TarjetaProducto } from "@/components/TarjetaProducto";
import { GaleriaProducto } from "@/components/GaleriaProducto";
import { TIENDA } from "@/lib/config";
import { ResenasProducto } from "@/components/ResenasProducto";
import { obtenerIdiomaServer } from "@/lib/idioma-server";
import { traducir } from "@/lib/idioma";

interface Props {
  params: Promise<{ slug: string }>;
}

function extraerVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

export async function generateMetadata({ params }: Props): Promise<import("next").Metadata> {
  const { slug } = await params;
  const producto = await obtenerProductoPorSlug(slug);

  if (!producto) {
    return { title: "Producto no encontrado" };
  }

  const title = `${producto.nombre} - ${producto.brand.nombre} | ${TIENDA.nombre}`;
  const description = `${producto.descripcion.slice(0, 155)}... | ${producto.brand.nombre} | Precio: $${producto.precio.toFixed(2)} USD`;

  const foto = imagenPrincipalProducto(producto);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: foto.url ? [`${process.env.NEXT_PUBLIC_BASE_URL || "https://tutienda.com"}${foto.url}`] : [],
    },
  };
}

export default async function DetalleProducto({ params }: Props) {
  const { slug } = await params;
  const [producto, moneda, idioma] = await Promise.all([
    obtenerProductoPorSlug(slug),
    obtenerMonedaServer(),
    obtenerIdiomaServer(),
  ]);
  const t = (clave: string) => traducir(idioma, clave);

  // Si el producto no existe, página 404
  if (!producto || !producto.activo) notFound();
  const fotoPrincipal = imagenPrincipalProducto(producto);

  const tiposPiel = leerListaJson(producto.tipoPiel).map((v) => etiquetaDe(TIPOS_PIEL, v));
  const preocupacionesValores = leerListaJson(producto.preocupaciones);
  const preocupaciones = preocupacionesValores.map((v) =>
    etiquetaDe(PREOCUPACIONES, v)
  );
  const [relacionados, videos, precioFormateado, reseñas, resumenReseñas] = await Promise.all([
    obtenerProductosRelacionados(producto.categoryId, producto.id, 4),
    prisma.video.findMany({
      where: { productId: producto.id },
      orderBy: { createdAt: "desc" },
      include: { producto: true, brand: true },
    }),
    formatearPrecioServer(producto.precio, moneda, prisma),
    prisma.productReview.findMany({ where: { productId: producto.id, estado: "visible" }, orderBy: { createdAt: "desc" }, take: 24, select: { id: true, rating: true, comment: true, createdAt: true, customer: { select: { nombre: true } } } }),
    prisma.productReview.aggregate({ where: { productId: producto.id, estado: "visible" }, _avg: { rating: true }, _count: { _all: true } }),
  ]);
  const calificacionesRelacionados = await obtenerCalificacionesProductos(relacionados.map((relacionado) => relacionado.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Migas de pan */}
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-stone-400">
        <Link href="/" className="hover:text-[#3f806e]">{t("product.home")}</Link>
        <span>/</span>
        <Link href="/catalogo" className="hover:text-[#3f806e]">{t("product.catalog")}</Link>
        <span>/</span>
        <Link href={`/catalogo?categoria=${producto.category.slug}`} className="hover:text-[#3f806e]">
          {producto.category.nombre}
        </Link>
        <span>/</span>
        <span className="text-stone-600">{producto.nombre}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        {/* ---------- Galería de imágenes ---------- */}
        <div>
          <GaleriaProducto imagenes={producto.imagenes} marca={producto.brand.nombre} imagenFallback={producto.imagen} />
        </div>

        {/* ---------- Información ---------- */}
        <div>
          <Link
            href={`/catalogo?marca=${producto.brand.slug}`}
            className="text-xs font-semibold tracking-wide text-[#3f806e] uppercase hover:text-[#203128]"
          >
            {producto.brand.nombre}
          </Link>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-[#203128] sm:text-5xl">
            {producto.nombre}
          </h1>
          {resumenReseñas._count._all > 0 && <a href="#resenas" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#315141] hover:underline"><span className="text-amber-600">★ {resumenReseñas._avg.rating?.toFixed(1)}</span><span>({resumenReseñas._count._all} {t("product.verifiedReviews")})</span></a>}
          <p className="mt-3 text-3xl font-bold text-stone-900">{precioFormateado}</p>

          {/* Estado del stock */}
          <p className="mt-2 text-sm">
            {producto.stock > 0 ? (
              <span className="font-semibold text-emerald-600">✓ {t("product.inStock")}</span>
            ) : (
              <span className="font-semibold text-stone-400">✕ {t("product.outOfStock")}</span>
            )}
          </p>

          <p className="mt-5 leading-relaxed text-stone-600">{producto.descripcion}</p>

          {/* Beneficios */}
          <div className="mt-6 rounded-2xl border border-[#3f806e]/10 bg-[#fbf8f1] p-5">
            <p className="text-sm font-bold text-[#385144]">{t("product.benefits")}</p>
            <p className="mt-2 text-sm leading-relaxed text-[#547565]">
              {producto.descripcion.slice(0, 300)}{producto.descripcion.length > 300 ? "..." : ""}
            </p>
          </div>

          {/* Compra */}
          <div className="mt-6 border-t border-stone-200 pt-6">
            <AgregarAlCarrito
              producto={{
                id: producto.id,
                slug: producto.slug,
                nombre: producto.nombre,
                marca: producto.brand.nombre,
                precio: producto.precio,
                imagen: fotoPrincipal.url,
              }}
              stock={producto.stock}
            />
          </div>

          {/* Modo de uso */}
          <div className="mt-6 rounded-2xl bg-[#fbf8f1] p-5">
            <p className="text-sm font-bold text-stone-900">{t("product.howToUse")}</p>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">{producto.modoUso}</p>
          </div>

          {/* Ingredientes clave */}
          {producto.ingredientes.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-bold text-stone-900">{t("product.keyIngredients")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {producto.ingredientes.map((relacion) => (
                  <span
                    key={relacion.ingrediente.id}
                    title={relacion.ingrediente.descripcion ?? undefined}
                    className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-600"
                  >
                    {relacion.ingrediente.nombre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tipos de piel */}
          {tiposPiel.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-bold text-stone-900">{t("product.suitableFor")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {tiposPiel.map((tipo) => (
                  <span
                    key={tipo}
                    className="rounded-full bg-[#fbf8f1] px-3 py-1 text-xs font-medium text-[#547565]"
                  >
                    Piel {tipo.toLowerCase()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Preocupaciones que trata */}
          {preocupaciones.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-bold text-stone-900">{t("product.treats")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {preocupaciones.map((p) => (
                  <Link
                    key={p}
                    href={`/catalogo?preocupacion=${
                      PREOCUPACIONES.find((x) => x.etiqueta === p)?.valor ?? ""
                    }`}
                    className="rounded-full bg-[#e8f0e8] px-3 py-1 text-xs font-medium text-[#547565] transition hover:bg-[#e8f0e8]"
                  >
                    {p}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Precauciones */}
          <div className="mt-6 rounded-2xl bg-amber-50/50 p-4">
            <p className="text-sm font-bold text-amber-800">⚠️ {t("product.precautions")}</p>
            <ul className="mt-2 space-y-1 text-sm text-amber-700">
              <li>• {t("product.externalUse")}</li>
              <li>• {t("product.stopIrritation")}</li>
              <li>• {t("product.children")}</li>
              <li>• {t("product.storage")}</li>
              <li>• {t("product.medical")}</li>
            </ul>
          </div>

          {preocupacionesValores[0] && (
            <Link href={`/consejos#${preocupacionesValores[0]}`} className="mt-4 flex items-center justify-between rounded-2xl border border-[#203128]/10 bg-[#e7f0eb] p-5 transition hover:border-[#3f806e]">
              <div><p className="text-xs font-bold tracking-wider text-[#3f806e] uppercase">{t("product.learnBefore")}</p><p className="mt-1 font-display text-xl font-semibold text-[#203128]">{t("product.guideFor")} {preocupaciones[0]?.toLowerCase()}</p></div><span className="grid h-9 w-9 place-items-center rounded-full bg-white">→</span>
            </Link>
          )}
        </div>
      </div>

      <ResenasProducto slug={producto.slug} reseñas={reseñas.map((resena) => ({ id: resena.id, rating: resena.rating, comment: resena.comment, nombre: resena.customer.nombre.trim().split(/\s+/)[0] || "Cliente Glasskin", createdAt: resena.createdAt.toISOString() }))} promedio={resumenReseñas._avg.rating} total={resumenReseñas._count._all} />

      {/* ---------- Videos ---------- */}
      {videos.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold text-stone-900">🎬 Videos de este producto</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <article key={video.id} className="rounded-2xl border border-stone-200 bg-white overflow-hidden group">
                <Link href={video.url} target="_blank" rel="noopener noreferrer" className="block relative aspect-video overflow-hidden bg-stone-100">
                  {(() => {
                    const id = extraerVideoId(video.url);
                    if (!id) return <div className="aspect-video bg-stone-100 flex items-center justify-center text-4xl">🎬</div>;
                    return (
                      <Image
                        src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
                        alt={video.titulo}
                        width={640}
                        height={360}
                        unoptimized
                        className="aspect-video w-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                    );
                  })()}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <svg className="h-12 w-12 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </Link>
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-stone-900 line-clamp-2 transition group-hover:text-[#3f806e]">
                    {video.titulo}
                  </h3>
                  {video.descripcion && <p className="text-sm text-stone-600 line-clamp-2">{video.descripcion}</p>}
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {video.tema && (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700">
                        {video.tema}
                      </span>
                    )}
                    {video.brand && (
                      <Link
                        href={`/catalogo?marca=${video.brand.slug}`}
                        className="rounded-full bg-[#e8f0e8] px-2.5 py-0.5 text-[#547565] hover:bg-[#e8f0e8]"
                      >
                        {video.brand.nombre}
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ---------- Productos relacionados ---------- */}
      {relacionados.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold text-stone-900">
            {t("product.related")}
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {relacionados.map((relacionado) => {
              const foto = imagenPrincipalProducto(relacionado);
              return <TarjetaProducto
                key={relacionado.id}
                producto={{
                  id: relacionado.id,
                  slug: relacionado.slug,
                  nombre: relacionado.nombre,
                  precio: relacionado.precio,
                  stock: relacionado.stock,
                  imagen: foto.url,
                  blurDataUrl: foto.blurDataUrl,
                  brand: { nombre: relacionado.brand.nombre },
                  rating: calificacionesRelacionados[relacionado.id],
                }}
              />;
            })}
          </div>
        </section>
      )}
    </div>
  );
}
