import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { imagenPrincipalProducto, obtenerCalificacionesProductos, obtenerDestacados } from "@/lib/productos";
import { TarjetaProducto } from "@/components/TarjetaProducto";
import { ImagenProducto } from "@/components/ImagenProducto";
import { traducir } from "@/lib/idioma";
import { obtenerIdiomaServer } from "@/lib/idioma-server";

export const dynamic = "force-dynamic";

const objetivos = [
  { nombre: "home.acne", slug: "acne", tono: "bg-[#e7f0eb]", detalle: "home.acneDetail", icono: "01" },
  { nombre: "home.spots", slug: "manchas", tono: "bg-[#eee2d6]", detalle: "home.spotsDetail", icono: "02" },
  { nombre: "home.dehydration", slug: "deshidratacion", tono: "bg-[#e8f0e8]", detalle: "home.dehydrationDetail", icono: "03" },
  { nombre: "home.lines", slug: "arrugas", tono: "bg-[#eee7d8]", detalle: "home.linesDetail", icono: "04" },
  { nombre: "home.pores", slug: "poros", tono: "bg-[#f2e4ba]", detalle: "home.poresDetail", icono: "05" },
  { nombre: "home.redness", slug: "rojez", tono: "bg-[#dfeadf]", detalle: "home.rednessDetail", icono: "06" },
];

export default async function Inicio() {
  const idioma = await obtenerIdiomaServer();
  const t = (clave: string) => traducir(idioma, clave);
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
              <span className="h-2 w-2 rounded-full bg-[#a9c8b5]" /> {t("home.curated")}
            </p>
            <h1 className="mt-5 max-w-full font-display text-5xl leading-[0.92] font-semibold text-[#203128] sm:text-7xl lg:text-[88px]">
              {idioma === "en" ? <>Your skin.<br /><span className="italic font-medium text-[#3f806e]">{t("home.luminous")}</span></> : <>Tu piel.<br /><span className="italic font-medium text-[#3f806e]">{t("home.luminous")}</span></>}
            </h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-[#405b4d] sm:text-lg">
              {t("home.intro")} {totalProductos > 0 ? `${totalProductos} ` : ""}{t("home.selected")}
            </p>
            <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/catalogo" className="rounded-full bg-[#203128] px-7 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#3f806e]">{t("home.explore")}</Link>
              <Link href="/diagnostico" className="rounded-full border border-[#203128]/25 bg-white/75 px-7 py-3.5 text-sm font-bold text-[#203128] backdrop-blur transition hover:bg-white">{t("home.diagnosis")}</Link>
            </div>
            <div className="mt-11 flex flex-wrap gap-x-7 gap-y-2 text-xs font-semibold text-[#405b4d]">
              <span>{t("home.skinTypes")}</span><span>{t("home.currency")}</span><span>{t("home.secure")}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#203128] text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-white/10 px-4 py-7 sm:grid-cols-4">
          {[[String(totalProductos), t("home.products")], [String(marcas.length), t("home.brands")], [String(totalCategorias), t("home.categories")], ['24/7', t("home.advisor")]].map(([valor, etiqueta]) => (
            <div key={etiqueta} className="px-4 py-2 text-center">
              <p className="font-display text-3xl font-semibold text-[#dfece4]">{valor}{valor !== '24/7' && '+'}</p>
              <p className="mt-1 text-[10px] tracking-[0.13em] text-white/70 uppercase">{etiqueta}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="max-w-2xl">
          <p className="eyebrow text-[#3f806e]">{t("home.discover")}</p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{t("home.improve")}</h2>
          <p className="mt-3 text-stone-500">{t("home.startFeeling")}</p>
        </div>
        <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {objetivos.map((objetivo) => (
            <Link key={objetivo.slug} href={`/catalogo?preocupacion=${objetivo.slug}`} className={`${objetivo.tono} group flex min-h-40 items-end justify-between overflow-hidden rounded-2xl border border-white/60 p-6 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#203128]/8`}>
              <div><span className="text-xs font-bold text-[#3f806e]">{objetivo.icono}</span><p className="mt-5 text-[10px] font-bold tracking-[.12em] text-[#3f806e] uppercase">{t(objetivo.detalle)}</p><h3 className="mt-1 max-w-[15rem] font-display text-2xl font-semibold leading-tight">{t(objetivo.nombre)}</h3></div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/75 transition group-hover:bg-[#203128] group-hover:text-white">↗</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-[#203128]/10 bg-white/50">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="flex items-end justify-between gap-5">
            <div><p className="eyebrow text-[#3f806e]">{t("home.community")}</p><h2 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">{t("home.essentials")}</h2></div>
            <Link href="/catalogo" className="hidden text-sm font-bold underline decoration-[#3f806e]/40 underline-offset-8 sm:block">{t("home.fullCatalog")}</Link>
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
            <p className="eyebrow text-[#3f806e]">{t("home.threeMoments")}</p>
            <h2 className="mt-3 max-w-xl font-display text-4xl font-semibold leading-tight sm:text-5xl">{t("home.cleanTreatProtect")}</h2>
            <p className="mt-5 max-w-lg leading-7 text-stone-600">{t("home.simpleRoutine")}</p>
            <Link href="/diagnostico" className="mt-7 inline-flex rounded-full border border-[#203128] px-6 py-3 text-sm font-bold text-[#203128] transition hover:bg-[#203128] hover:text-white">{t("home.buildRoutine")}</Link>
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
          <h2 className="mt-4 max-w-xl font-display text-4xl font-semibold leading-none sm:text-6xl">{t("home.lessTrial")}</h2>
          <p className="mt-5 max-w-lg leading-7 text-[#385144]">{t("home.aiText")}</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/diagnostico" className="rounded-full bg-[#203128] px-7 py-3.5 text-sm font-bold text-white">{t("home.createDiagnosis")}</Link><Link href="/consejos" className="rounded-full bg-white/70 px-7 py-3.5 text-sm font-bold text-[#203128]">{t("home.readTips")}</Link></div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-2xl bg-[#fbf8f1] p-8"><span className="text-2xl">01</span><h3 className="mt-8 font-display text-3xl font-semibold">{t("home.wordSearchTitle")}</h3><p className="mt-2 text-sm leading-6 text-stone-600">{t("home.wordSearchText")}</p></div>
          <div className="rounded-2xl bg-[#e8f0e8] p-8"><span className="text-2xl">02</span><h3 className="mt-8 font-display text-3xl font-semibold">{t("home.budgetTitle")}</h3><p className="mt-2 text-sm leading-6 text-stone-600">{t("home.budgetText")}</p></div>
        </div>
      </section>

      <section className="border-y border-[#203128]/10 bg-[#203128] text-white">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl"><p className="eyebrow text-[#b8d2c0]">Glasskin · Business</p><h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">{t("home.dashboardTitle")}</h2><p className="mt-3 text-sm leading-6 text-white/70">{t("home.dashboardText")}</p></div>
            <Link href="/admin" className="rounded-full bg-[#e7f0eb] px-6 py-3 text-sm font-bold text-[#203128] transition hover:bg-white">{t("home.dashboardCta")}</Link>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[ ["↗", "home.dashboardSales", "home.dashboardSalesText"], ["▤", "home.dashboardStock", "home.dashboardStockText"], ["✦", "home.dashboardAutomation", "home.dashboardAutomationText"] ].map(([icon, title, detail]) => <article key={title} className="rounded-2xl border border-white/15 bg-white/5 p-4"><p className="text-xl text-[#b8d2c0]">{icon}</p><h3 className="mt-3 text-sm font-bold">{t(title)}</h3><p className="mt-1 text-xs leading-5 text-white/60">{t(detail)}</p></article>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="flex items-end justify-between"><div><p className="eyebrow text-[#3f806e]">{t("home.explore")}</p><h2 className="mt-3 font-display text-4xl font-semibold">{t("home.categoriesTitle")}</h2></div></div>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categorias.map((categoria) => (
            <Link key={categoria.slug} href={`/catalogo?categoria=${categoria.slug}`} className="group rounded-[24px] border border-[#203128]/10 bg-white p-5 transition hover:border-[#3f806e] hover:shadow-lg hover:shadow-[#203128]/5">
              <span className="text-3xl">{categoria.icono}</span><h3 className="mt-7 font-display text-xl font-semibold group-hover:text-[#3f806e]">{categoria.nombre}</h3><p className="mt-1 text-xs text-stone-400">{categoria._count.products} {t("home.productCount")}</p>
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
