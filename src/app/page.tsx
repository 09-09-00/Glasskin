import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { imagenPrincipalProducto, obtenerCalificacionesProductos, obtenerDestacados } from "@/lib/productos";
import { TarjetaProducto } from "@/components/TarjetaProducto";
import { ImagenProducto } from "@/components/ImagenProducto";

export const dynamic = "force-dynamic";

const objetivos = [
  { nombre: "Acné e imperfecciones", slug: "acne", tono: "bg-[#e7f0eb]", detalle: "Purificar y calmar", icono: "01" },
  { nombre: "Manchas y tono desigual", slug: "manchas", tono: "bg-[#eee2d6]", detalle: "Iluminar y unificar", icono: "02" },
  { nombre: "Deshidratación", slug: "deshidratacion", tono: "bg-[#e8f0e8]", detalle: "Hidratar y reparar", icono: "03" },
  { nombre: "Líneas y firmeza", slug: "arrugas", tono: "bg-[#eee7d8]", detalle: "Alisar y fortalecer", icono: "04" },
  { nombre: "Poros y textura", slug: "poros", tono: "bg-[#f2e4ba]", detalle: "Refinar y equilibrar", icono: "05" },
  { nombre: "Sensibilidad y rojez", slug: "rojez", tono: "bg-[#dfeadf]", detalle: "Confortar y proteger", icono: "06" },
];

export default async function Inicio() {
  let destacados: Awaited<ReturnType<typeof obtenerDestacados>> = [];
  let categorias: Array<{
    slug: string;
    nombre: string;
    icono: string | null;
    _count: { products: number };
  }> = [];
  let marcas: Awaited<ReturnType<typeof prisma.brand.findMany>> = [];
  let totalProductos = 0;
  let totalCategorias = 0;
  let calificaciones: Record<number, { promedio: number; total: number }> = {};

  try {
    [destacados, categorias, marcas, totalProductos, totalCategorias] = await Promise.all([
      obtenerDestacados(8),
      prisma.category.findMany({
        orderBy: { orden: "asc" },
        include: { _count: { select: { products: { where: { activo: true } } } } },
        take: 5,
      }),
      prisma.brand.findMany({ orderBy: { nombre: "asc" } }),
      prisma.product.count({ where: { activo: true } }),
      prisma.category.count(),
    ]);
    calificaciones = await obtenerCalificacionesProductos(destacados.map((producto) => producto.id));
  } catch (error) {
    console.error("No se pudo cargar el catálogo de la portada:", error);
  }

  return (
    <div className="overflow-hidden">
      <section className="relative min-h-[630px] border-b border-[#203128]/10 bg-[#fbf8f1] lg:min-h-[700px]">
        <Image src="/images/brand/glasskin-hero.png" alt="Selección editorial de productos de skincare Glasskin" fill priority sizes="100vw" className="object-cover object-[68%_center]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#fbf8f1]/65 via-[#fbf8f1]/25 to-transparent" />
        <div className="relative mx-auto flex min-h-[630px] max-w-7xl items-center px-5 py-16 sm:px-8 lg:min-h-[700px]">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#3f806e]/20 bg-white/75 px-4 py-2 text-[10px] font-bold tracking-[0.14em] text-[#3f806e] uppercase shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-[#a9c8b5]" /> Curaduría consciente · Rutinas inteligentes
            </p>
            <h1 className="mt-5 max-w-full font-display text-5xl leading-[0.92] font-semibold text-[#203128] sm:text-7xl lg:text-[88px]">
              Tu piel.<br /><span className="italic font-medium text-[#3f806e]">Más luminosa.</span>
            </h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-[#405b4d] sm:text-lg">
              Descubre una rutina que realmente tenga sentido para vos. {totalProductos > 0 ? `${totalProductos} fórmulas seleccionadas` : "fórmulas seleccionadas"}, consejos claros y una asesora inteligente que entiende lo que buscás.
            </p>
            <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/catalogo" className="rounded-full bg-[#203128] px-7 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#3f806e]">Explorar productos</Link>
              <Link href="/diagnostico" className="rounded-full border border-[#203128]/25 bg-white/75 px-7 py-3.5 text-sm font-bold text-[#203128] backdrop-blur transition hover:bg-white">Diagnosticar mi piel →</Link>
            </div>
            <div className="mt-11 flex flex-wrap gap-x-7 gap-y-2 text-xs font-semibold text-[#405b4d]">
              <span>Selección por tipo de piel</span><span>Precios en USD y PYG</span><span>Compra segura</span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#203128] text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-white/10 px-4 py-7 sm:grid-cols-4">
          {[[String(totalProductos), 'productos seleccionados'], [String(marcas.length), 'marcas reconocidas'], [String(totalCategorias), 'categorías esenciales'], ['24/7', 'asesora Skin AI']].map(([valor, etiqueta]) => (
            <div key={etiqueta} className="px-4 py-2 text-center">
              <p className="font-display text-3xl font-semibold text-[#dfece4]">{valor}{valor !== '24/7' && '+'}</p>
              <p className="mt-1 text-[10px] tracking-[0.13em] text-white/70 uppercase">{etiqueta}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="max-w-2xl">
          <p className="eyebrow text-[#3f806e]">Encontrá tu fórmula</p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">¿Qué querés mejorar?</h2>
          <p className="mt-3 text-stone-500">Empezá por lo que ves y sentís. Te mostramos productos y consejos relacionados.</p>
        </div>
        <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {objetivos.map((objetivo) => (
            <Link key={objetivo.slug} href={`/catalogo?preocupacion=${objetivo.slug}`} className={`${objetivo.tono} group flex min-h-40 items-end justify-between overflow-hidden rounded-2xl border border-white/60 p-6 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#203128]/8`}>
              <div><span className="text-xs font-bold text-[#3f806e]">{objetivo.icono}</span><p className="mt-5 text-[10px] font-bold tracking-[.12em] text-[#3f806e] uppercase">{objetivo.detalle}</p><h3 className="mt-1 max-w-[15rem] font-display text-2xl font-semibold leading-tight">{objetivo.nombre}</h3></div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/75 transition group-hover:bg-[#203128] group-hover:text-white">↗</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-[#203128]/10 bg-white/50">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="flex items-end justify-between gap-5">
            <div><p className="eyebrow text-[#3f806e]">Favoritos de la comunidad</p><h2 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">Los esenciales</h2></div>
            <Link href="/catalogo" className="hidden text-sm font-bold underline decoration-[#3f806e]/40 underline-offset-8 sm:block">Ver catálogo completo</Link>
          </div>
          <div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {destacados.map((producto) => {
              const foto = imagenPrincipalProducto(producto);
              return <TarjetaProducto key={producto.id} producto={{ id: producto.id, slug: producto.slug, nombre: producto.nombre, precio: producto.precio, stock: producto.stock, imagen: foto.url, blurDataUrl: foto.blurDataUrl, brand: { nombre: producto.brand.nombre }, category: { nombre: producto.category.nombre }, rating: calificaciones[producto.id] }} />;
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <p className="eyebrow text-[#3f806e]">Una rutina, tres momentos</p>
            <h2 className="mt-3 max-w-xl font-display text-4xl font-semibold leading-tight sm:text-5xl">Limpiar. Tratar. Proteger.</h2>
            <p className="mt-5 max-w-lg leading-7 text-stone-600">No necesitás diez pasos para cuidar tu piel. Empezá con una base simple, elegí fórmulas compatibles y sumá activos de a poco.</p>
            <Link href="/diagnostico" className="mt-7 inline-flex rounded-full border border-[#203128] px-6 py-3 text-sm font-bold text-[#203128] transition hover:bg-[#203128] hover:text-white">Armar mi rutina →</Link>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-5">
            {destacados.slice(0, 3).map((producto, indice) => (
              <Link key={producto.id} href={`/producto/${producto.slug}`} className={`group overflow-hidden rounded-2xl border border-[#203128]/10 bg-white soft-shadow ${indice === 1 ? "translate-y-6" : ""}`}>
                <ImagenProducto src={imagenPrincipalProducto(producto).url} blurDataURL={imagenPrincipalProducto(producto).blurDataUrl} alt={producto.nombre} width={320} height={400} className="aspect-[4/5] w-full scale-[1.16] bg-white object-contain p-0 transition duration-500 group-hover:scale-[1.18]" />
                <div className="p-3 sm:p-4"><p className="text-[9px] font-bold tracking-[.1em] text-[#3f806e] uppercase">Paso 0{indice + 1}</p><p className="mt-1 line-clamp-2 text-xs font-semibold sm:text-sm">{producto.nombre}</p></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-20 sm:px-8 lg:grid-cols-[1.15fr_.85fr]">
        <div className="relative overflow-hidden rounded-3xl bg-[#e8f0e8] p-8 sm:p-12">
          <div className="absolute right-0 bottom-0 h-24 w-2/5 border-t border-l border-white/50 bg-white/20" />
          <p className="eyebrow text-[#3f806e]">Glasskin Skin AI</p>
          <h2 className="mt-4 max-w-xl font-display text-4xl font-semibold leading-none sm:text-6xl">Menos ensayo y error. Más claridad.</h2>
          <p className="mt-5 max-w-lg leading-7 text-[#385144]">Contanos cómo es tu piel, qué te preocupa y cuánto querés invertir. La asesora analiza únicamente el catálogo real y arma una rutina de mañana y noche.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/diagnostico" className="rounded-full bg-[#203128] px-7 py-3.5 text-sm font-bold text-white">Crear mi diagnóstico</Link><Link href="/consejos" className="rounded-full bg-white/70 px-7 py-3.5 text-sm font-bold text-[#203128]">Leer consejos</Link></div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-2xl bg-[#fbf8f1] p-8"><span className="text-2xl">01</span><h3 className="mt-8 font-display text-3xl font-semibold">Buscá con tus palabras</h3><p className="mt-2 text-sm leading-6 text-stone-600">“Necesito algo suave para manchas y piel sensible”. Encontramos fórmulas, ingredientes y alternativas relacionadas.</p></div>
          <div className="rounded-2xl bg-[#e8f0e8] p-8"><span className="text-2xl">02</span><h3 className="mt-8 font-display text-3xl font-semibold">Comprá por presupuesto</h3><p className="mt-2 text-sm leading-6 text-stone-600">Recibí una rutina equilibrada sin superar tu límite, con precios calculados desde el catálogo actual.</p></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="flex items-end justify-between"><div><p className="eyebrow text-[#3f806e]">Explorar</p><h2 className="mt-3 font-display text-4xl font-semibold">Categorías</h2></div></div>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categorias.map((categoria) => (
            <Link key={categoria.slug} href={`/catalogo?categoria=${categoria.slug}`} className="group rounded-[24px] border border-[#203128]/10 bg-white p-5 transition hover:border-[#3f806e] hover:shadow-lg hover:shadow-[#203128]/5">
              <span className="text-3xl">{categoria.icono}</span><h3 className="mt-7 font-display text-xl font-semibold group-hover:text-[#3f806e]">{categoria.nombre}</h3><p className="mt-1 text-xs text-stone-400">{categoria._count.products} productos</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-[#203128]/10 bg-white py-12">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-9 gap-y-4 px-5 text-sm font-semibold text-stone-400">
          {marcas.map((marca) => <Link key={marca.slug} href={`/catalogo?marca=${marca.slug}`} className="transition hover:text-[#203128]">{marca.nombre}</Link>)}
        </div>
      </section>
    </div>
  );
}
