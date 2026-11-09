import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CONSEJOS_PIEL } from "@/lib/consejos";
import { prisma } from "@/lib/prisma";
import { imagenPrincipalProducto } from "@/lib/productos";
import { ImagenProducto } from "@/components/ImagenProducto";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Consejos para cuidar tu piel",
  description: "Guías simples de Glasskin para construir una rutina según acné, manchas, hidratación, textura, sensibilidad o líneas.",
};

export default async function ConsejosPage() {
  const productosCatalogo = await prisma.product.findMany({
    where: {
      activo: true,
      OR: CONSEJOS_PIEL.map((consejo) => ({ preocupaciones: { contains: `"${consejo.slug}"` } })),
    },
    include: {
      brand: true,
      imagenes: { orderBy: [{ principal: "desc" }, { orden: "asc" }], take: 1 },
    },
    orderBy: [{ destacado: "desc" }, { nombre: "asc" }],
  });

  const productosPorConsejo = Object.fromEntries(
    CONSEJOS_PIEL.map((consejo) => [
      consejo.slug,
      productosCatalogo
        .filter((producto) => {
          try {
            return (JSON.parse(producto.preocupaciones) as string[]).includes(consejo.slug);
          } catch {
            return false;
          }
        })
        .filter((producto) => imagenPrincipalProducto(producto).url)
        .slice(0, 2),
    ]),
  );

  return (
    <div>
      <section className="relative isolate overflow-hidden border-b border-[#203128]/10 bg-[#fbf8f1]">
        <div className="absolute inset-y-0 right-0 w-full md:w-[61%]">
          <Image src="/images/brand/glasskin-hero.png" alt="Productos Glasskin en una composición de skincare" fill priority sizes="(max-width: 768px) 100vw, 61vw" className="object-cover object-[76%_center]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#fbf8f1] via-[#fbf8f1]/85 to-[#fbf8f1]/10 md:via-[#fbf8f1]/60" />
        </div>
        <div className="relative mx-auto grid min-h-[480px] max-w-7xl items-center gap-8 px-5 py-16 sm:px-8 md:grid-cols-[1.05fr_.95fr] md:py-20">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#3f806e]/20 bg-white/80 px-4 py-2 text-[10px] font-bold tracking-[0.14em] text-[#3f806e] uppercase shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-[#a9c8b5]" /> Glasskin Journal
            </p>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">Cuidar tu piel puede ser <span className="text-[#3f806e] italic">simple.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#385144]">Guías prácticas para elegir mejor, combinar activos con criterio y construir una rutina que puedas sostener. Sin promesas mágicas ni pasos innecesarios.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#guias" className="rounded-full bg-[#203128] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#3f806e]">Explorar las guías ↓</a>
              <Link href="/diagnostico" className="rounded-full border border-[#203128]/20 bg-white/75 px-6 py-3 text-sm font-bold text-[#203128] transition hover:bg-white">Encontrar mi rutina</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-2 text-xs font-semibold text-[#577565]">
              <span className="rounded-full bg-[#e7f0eb] px-3 py-1.5">06 guías prácticas</span>
              <span className="rounded-full bg-[#e8f0e8] px-3 py-1.5">Productos del catálogo real</span>
            </div>
          </div>
          <div className="hidden md:block" aria-hidden="true" />
        </div>
      </section>

      <section id="guias" className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><p className="eyebrow text-[#3f806e]">Elegí por objetivo</p><h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Una guía para cada piel</h2></div>
          <span className="rounded-full border border-[#203128]/10 bg-white/75 px-4 py-2 text-xs font-semibold text-[#577565]">Consejos claros, rutinas posibles</span>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {CONSEJOS_PIEL.map((consejo) => (
            <article key={consejo.slug} id={consejo.slug} className={`${consejo.tono} scroll-mt-32 relative overflow-hidden rounded-[32px] border border-white/70 p-6 shadow-[0_18px_45px_rgba(32,49,40,.06)] sm:p-8`}>
              <div className="pointer-events-none absolute -top-16 -right-12 h-44 w-44 rounded-full border border-white/50 bg-white/20" />
              <div className="relative flex items-start justify-between gap-5"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/70 font-display text-xl font-bold text-[#3f806e] shadow-sm">{consejo.icono}</span><Link href={`/catalogo?preocupacion=${consejo.slug}`} className="rounded-full bg-white/80 px-4 py-2 text-xs font-bold text-[#203128] shadow-sm transition hover:-translate-y-0.5 hover:bg-white">Ver productos →</Link></div>
              <h2 className="relative mt-6 font-display text-3xl font-semibold sm:text-4xl">{consejo.titulo}</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">{consejo.resumen}</p>
              {productosPorConsejo[consejo.slug]?.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-[10px] font-bold tracking-[0.12em] text-[#577565] uppercase">Del catálogo Glasskin</p>
                  <div className="grid grid-cols-2 gap-2">
                    {productosPorConsejo[consejo.slug].map((producto) => {
                      const imagen = imagenPrincipalProducto(producto);
                      return (
                        <Link key={producto.id} href={`/producto/${producto.slug}`} className="group flex min-w-0 items-center gap-2 rounded-2xl border border-white/70 bg-white/80 p-2 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
                          <span className="relative h-[68px] w-[58px] shrink-0 overflow-hidden rounded-xl bg-[#fbf8f1]">
                            <ImagenProducto src={imagen.url} blurDataURL={imagen.blurDataUrl} alt={producto.nombre} fill sizes="58px" className="object-contain p-1.5" />
                          </span>
                          <span className="min-w-0"><span className="block truncate text-[9px] font-bold tracking-wide text-[#3f806e] uppercase">{producto.brand.nombre}</span><span className="mt-1 block line-clamp-2 text-xs font-semibold leading-4 text-[#203128] group-hover:text-[#3f806e]">{producto.nombre}</span></span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="mt-7 grid gap-6 sm:grid-cols-2">
                <div><h3 className="text-xs font-bold tracking-wider uppercase">Rutina base</h3><ol className="mt-3 space-y-2 text-sm text-stone-700">{consejo.pasos.map((paso, i) => <li key={paso} className="flex gap-2"><span className="font-bold text-[#3f806e]">{i + 1}.</span>{paso}</li>)}</ol></div>
                <div><h3 className="text-xs font-bold tracking-wider uppercase">Buscá estos ingredientes</h3><div className="mt-3 flex flex-wrap gap-2">{consejo.ingredientes.map((ingrediente) => <Link key={ingrediente} href={`/catalogo?q=${encodeURIComponent(ingrediente)}`} className="rounded-full border border-[#203128]/10 bg-white/60 px-3 py-1.5 text-xs font-semibold hover:bg-white">{ingrediente}</Link>)}</div><p className="mt-5 text-xs leading-5 text-stone-600"><strong>Evitá:</strong> {consejo.evitar}</p></div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="rounded-[36px] bg-[#203128] p-8 text-white sm:p-12">
          <p className="eyebrow text-[#dfece4]">Regla Glasskin</p><h2 className="mt-3 max-w-2xl font-display text-4xl font-semibold sm:text-5xl">Introducí un producto a la vez.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65">Hacé una prueba de parche, observá tu piel y aumentá la frecuencia de forma gradual. El protector solar es esencial cuando usás exfoliantes, vitamina C o retinoides.</p>
          <div className="mt-7 flex flex-wrap gap-3"><Link href="/ia" className="rounded-full bg-white px-6 py-3 text-sm font-bold text-[#203128]">Crear mi rutina con IA</Link><Link href="/catalogo" className="rounded-full border border-white/20 px-6 py-3 text-sm font-bold">Explorar catálogo</Link></div>
        </div>
        <p className="mt-6 text-center text-xs leading-5 text-stone-400">Contenido educativo general. No sustituye una consulta dermatológica ni diagnostica condiciones de la piel.</p>
      </section>
    </div>
  );
}
