// ============================================================
//  Catálogo con filtros (marca, categoría, tipo de piel,
//  precio, preocupación, búsqueda y orden)
// ============================================================
import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { extraerPresupuestoConsulta, imagenPrincipalProducto, obtenerCalificacionesProductos, obtenerProductosConFiltros, obtenerRelacionadosDeBusqueda } from "@/lib/productos";
import { FiltrosCatalogo } from "@/components/FiltrosCatalogo";
import { TarjetaProducto } from "@/components/TarjetaProducto";
import { TIENDA } from "@/lib/config";
import { obtenerTasaServer } from "@/lib/format";
import { ImagenProducto } from "@/components/ImagenProducto";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Lee un parámetro de la URL como string simple
function primerValor(valor: string | string[] | undefined): string | undefined {
  if (Array.isArray(valor)) return valor[0];
  return valor || undefined;
}

export async function generateMetadata({ searchParams }: Props): Promise<import("next").Metadata> {
  const params = await searchParams;
  const q = primerValor(params.q);
  const marca = primerValor(params.marca);
  const categoria = primerValor(params.categoria);

  let title = `Catálogo | ${TIENDA.nombre}`;
  let description = `Explora el catálogo de ${TIENDA.nombre}: skincare seleccionado de Corea y marcas dermatológicas e internacionales.`;

  if (q) {
    title = `Resultados para "${q}" | ${TIENDA.nombre}`;
    description = `Resultados de búsqueda para "${q}" en ${TIENDA.nombre}.`;
  } else if (marca) {
    const brand = await prisma.brand.findUnique({ where: { slug: marca }, select: { nombre: true } });
    if (brand) {
      title = `${brand.nombre} | ${TIENDA.nombre}`;
      description = `Productos de ${brand.nombre} en ${TIENDA.nombre}. Cuidado de la piel seleccionado para una rutina simple y efectiva.`;
    }
  } else if (categoria) {
    const cat = await prisma.category.findUnique({ where: { slug: categoria }, select: { nombre: true, descripcion: true } });
    if (cat) {
      title = `${cat.nombre} | ${TIENDA.nombre}`;
      description = `${cat.descripcion || `Productos de ${cat.nombre}`} en ${TIENDA.nombre}.`;
    }
  }

  return { title, description };
}

export default async function Catalogo({ searchParams }: Props) {
  const params = await searchParams;
  const q = primerValor(params.q);
  const presupuesto = extraerPresupuestoConsulta(q);
  const tasa = presupuesto?.moneda === "PYG" ? await obtenerTasaServer() : 1;
  const precioMaxConsulta = presupuesto ? (presupuesto.moneda === "PYG" ? presupuesto.importe / tasa : presupuesto.importe) : undefined;

  // Filtros recibidos por URL
  const filtros = {
    q,
    marca: primerValor(params.marca),
    categoria: primerValor(params.categoria),
    piel: primerValor(params.piel),
    preocupacion: primerValor(params.preocupacion),
    orden: primerValor(params.orden),
    precioMax: (() => {
      const bruto = primerValor(params.precioMax);
      const numero = bruto ? Number(bruto) : Number.NaN;
      // Valida el filtro manual y aplica siempre el presupuesto de la consulta.
      const manual = Number.isFinite(numero) && numero > 0 ? numero : undefined;
      return manual !== undefined && precioMaxConsulta !== undefined ? Math.min(manual, precioMaxConsulta) : manual ?? precioMaxConsulta;
    })(),
  };

  // Productos filtrados + listas para los selectores (en paralelo)
  const [productos, marcas, categorias] = await Promise.all([
    obtenerProductosConFiltros(filtros),
    prisma.brand.findMany({ orderBy: { nombre: "asc" }, select: { slug: true, nombre: true } }),
    prisma.category.findMany({
      orderBy: { orden: "asc" },
      select: { slug: true, nombre: true, icono: true },
    }),
  ]);

  // Etiqueta amable con el estado actual de los filtros
  const nombreCategoria = categorias.find((c) => c.slug === filtros.categoria)?.nombre;
  const nombreMarca = marcas.find((m) => m.slug === filtros.marca)?.nombre;
  const hayFiltros = Object.values(filtros).some((v) => v !== undefined && v !== "");
  const relacionados = filtros.q && productos[0]
    ? await obtenerRelacionadosDeBusqueda(productos[0], productos.map((producto) => producto.id), 4, filtros.precioMax)
    : [];
  const calificaciones = await obtenerCalificacionesProductos([...productos, ...relacionados].map((producto) => producto.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Encabezado */}
      <header className="relative mb-10 overflow-hidden rounded-3xl border border-[#203128]/10 bg-[#e7f0eb] px-6 py-9 sm:px-10 sm:py-12">
        <div className="absolute inset-y-0 right-0 hidden w-2/5 border-l border-white/50 bg-[#e8f0e8] lg:block" />
        {productos[0] && <ImagenProducto src={imagenPrincipalProducto(productos[0]).url} alt="" blurDataURL={imagenPrincipalProducto(productos[0]).blurDataUrl} width={220} height={220} className="absolute top-1/2 right-[8%] hidden h-48 w-44 -translate-y-1/2 object-contain lg:block" />}
        <div className="relative">
        <p className="eyebrow text-[#3f806e]">Selección Glasskin</p>
        <h1 className="mt-2 max-w-3xl font-display text-4xl font-semibold text-[#203128] sm:text-6xl">
          {filtros.q ? `Resultados para “${filtros.q}”` : nombreCategoria ?? nombreMarca ?? "Todo el catálogo"}
        </h1>
        <p className="mt-3 text-sm text-stone-600">
          {productos.length} producto{productos.length === 1 ? "" : "s"}
          {hayFiltros ? " con tus filtros aplicados" : " disponibles"}
          {presupuesto && <span className="ml-2 font-semibold text-[#315141]">· Dentro de tu presupuesto ({presupuesto.moneda === "PYG" ? "Gs. " : "USD "}{presupuesto.importe.toLocaleString("es-PY")})</span>}
        </p></div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[250px_1fr]">
        {/* Filtros (con Suspense por useSearchParams) */}
        <aside>
          <Suspense fallback={<div className="text-sm text-stone-400">Cargando filtros...</div>}>
            <FiltrosCatalogo marcas={marcas} categorias={categorias} />
          </Suspense>
        </aside>

        {/* Resultados */}
        <div>
          {productos.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-[#203128]/20 bg-white p-12 text-center">
              <span className="text-4xl">🔍</span>
              <p className="mt-4 font-semibold text-stone-900">No encontramos productos</p>
              <p className="mt-1 text-sm text-stone-500">
                Prueba quitando algunos filtros o buscando otro término.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {productos.map((producto) => {
                const foto = imagenPrincipalProducto(producto);
                return (
                <TarjetaProducto
                  key={producto.id}
                  producto={{
                    id: producto.id,
                    slug: producto.slug,
                    nombre: producto.nombre,
                    precio: producto.precio,
                    stock: producto.stock,
                    imagen: foto.url,
                    blurDataUrl: foto.blurDataUrl,
                    brand: { nombre: producto.brand.nombre },
                    category: { nombre: producto.category.nombre },
                    rating: calificaciones[producto.id],
                  }}
                />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {relacionados.length > 0 && (
        <section className="mt-20 border-t border-[#203128]/10 pt-12">
          <p className="eyebrow text-[#3f806e]">Descubrí alternativas</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">Relacionado con tu búsqueda</h2>
            <Link href="/ia" className="text-sm font-bold text-[#3f806e] hover:underline">Pedir una recomendación a Skin AI →</Link>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-stone-500">Opciones de la misma categoría, marca o necesidad de piel que el resultado más relevante.</p>
          <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {relacionados.map((producto) => {
              const foto = imagenPrincipalProducto(producto);
              return <TarjetaProducto key={producto.id} producto={{ id: producto.id, slug: producto.slug, nombre: producto.nombre, precio: producto.precio, stock: producto.stock, imagen: foto.url, blurDataUrl: foto.blurDataUrl, brand: { nombre: producto.brand.nombre }, category: { nombre: producto.category.nombre }, rating: calificaciones[producto.id] }} />;
            })}
          </div>
        </section>
      )}
    </div>
  );
}
