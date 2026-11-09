import Link from "next/link";
import { notFound } from "next/navigation";
import { ImagenProducto } from "@/components/ImagenProducto";
import { formatearPrecio } from "@/lib/format-client";
import { imagenPrincipalProducto } from "@/lib/productos";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CategoriaAdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const categoria = await prisma.category.findUnique({
    where: { slug },
    include: {
      products: {
        orderBy: [{ activo: "desc" }, { nombre: "asc" }],
        include: {
          brand: true,
          imagenes: { orderBy: [{ principal: "desc" }, { orden: "asc" }], take: 1 },
        },
      },
    },
  });
  if (!categoria) notFound();

  const activos = categoria.products.filter((producto) => producto.activo).length;
  const ocultos = categoria.products.length - activos;
  const sinStock = categoria.products.filter((producto) => producto.activo && producto.stock === 0).length;
  const stockBajo = categoria.products.filter((producto) => producto.activo && producto.stock > 0 && producto.stock < 5).length;
  const unidades = categoria.products.reduce((total, producto) => total + producto.stock, 0);
  const valorInventario = categoria.products.reduce((total, producto) => total + producto.precio * producto.stock, 0);

  const metricas = [
    { label: "Productos activos", value: activos, detail: `${ocultos} ocultos`, icon: "✦", tone: "bg-[#e7f0eb]" },
    { label: "Unidades disponibles", value: unidades, detail: "en inventario", icon: "▤", tone: "bg-[#eee7d8]" },
    { label: "Stock por revisar", value: sinStock + stockBajo, detail: `${sinStock} agotados · ${stockBajo} bajos`, icon: "!", tone: sinStock + stockBajo ? "bg-[#f2e4ba]" : "bg-[#e8f0e8]" },
    { label: "Valor en inventario", value: formatearPrecio(valorInventario), detail: "precio × unidades", icon: "$", tone: "bg-[#e8f0e8]" },
  ];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[30px] border border-[#203128]/10 bg-gradient-to-br from-[#e7f0eb] via-[#fbf8f1] to-[#eee7d8] p-6 sm:p-9">
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border-[36px] border-white/30" aria-hidden="true" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <Link href="/admin/categorias" className="text-sm font-semibold text-[#3f806e] hover:underline">← Todas las categorías</Link>
            <div className="mt-5 flex items-center gap-4">
              <span className="grid h-16 w-16 place-items-center rounded-2xl border border-white/70 bg-white/75 text-3xl shadow-sm">{categoria.icono ?? "🏷️"}</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[.14em] text-[#577565]">Panel del dueño · Categoría</p>
                <h2 className="mt-1 font-display text-3xl font-bold text-[#203128] sm:text-4xl">{categoria.nombre}</h2>
              </div>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#405b4d]">{categoria.descripcion || `Controlá el catálogo, el inventario y la disponibilidad de ${categoria.nombre.toLowerCase()} desde este espacio.`}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/admin/productos?categoria=${categoria.slug}`} className="rounded-full bg-[#203128] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#3f806e]">Gestionar productos →</Link>
            <Link href={`/catalogo?categoria=${categoria.slug}`} target="_blank" className="rounded-full border border-[#203128]/15 bg-white/75 px-5 py-3 text-sm font-bold text-[#203128] transition hover:bg-white">Ver categoría en la tienda ↗</Link>
          </div>
        </div>
      </section>

      <section aria-label="Indicadores de la categoría" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricas.map((item) => (
          <article key={item.label} className="rounded-2xl border border-[#203128]/10 bg-white p-5 shadow-sm shadow-[#203128]/[.03]">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-wide text-stone-500">{item.label}</p><p className="mt-3 font-display text-3xl font-bold text-[#203128]">{item.value}</p><p className="mt-1 text-xs text-stone-500">{item.detail}</p></div>
              <span className={`grid h-10 w-10 place-items-center rounded-xl font-display text-xl font-bold text-[#315141] ${item.tone}`}>{item.icon}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#203128]/10 bg-white shadow-sm shadow-[#203128]/[.03]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#203128]/10 px-5 py-5 sm:px-6">
          <div><p className="text-xs font-bold uppercase tracking-[.13em] text-[#3f806e]">Control de catálogo</p><h3 className="mt-1 font-display text-2xl font-semibold text-[#203128]">Productos de {categoria.nombre}</h3><p className="mt-1 text-sm text-stone-500">Revisá fotos, precios, disponibilidad y stock de cada producto.</p></div>
          <Link href={`/admin/productos?categoria=${categoria.slug}`} className="rounded-full border border-[#3f806e]/25 px-4 py-2.5 text-sm font-bold text-[#315141] transition hover:bg-[#e8f0e8]">Editar esta categoría</Link>
        </div>

        {categoria.products.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e8f0e8] text-2xl">🧴</span>
            <h4 className="mt-4 font-display text-xl font-semibold text-[#203128]">Todavía no hay productos</h4>
            <p className="mt-1 text-sm text-stone-500">Agregá el primer producto para completar esta categoría.</p>
            <Link href={`/admin/productos?categoria=${categoria.slug}`} className="mt-5 inline-flex rounded-full bg-[#203128] px-5 py-3 text-sm font-bold text-white hover:bg-[#3f806e]">Agregar producto →</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#fbf8f1] text-[11px] uppercase tracking-wide text-stone-500"><tr><th className="px-5 py-3 font-bold">Producto</th><th className="px-4 py-3 font-bold">Marca</th><th className="px-4 py-3 font-bold">Precio</th><th className="px-4 py-3 font-bold">Unidades</th><th className="px-4 py-3 font-bold">Estado</th><th className="px-5 py-3 text-right font-bold">Vista</th></tr></thead>
              <tbody className="divide-y divide-[#203128]/[.07]">
                {categoria.products.map((producto) => {
                  const foto = imagenPrincipalProducto(producto);
                  const alertaStock = producto.activo && producto.stock < 5;
                  return (
                    <tr key={producto.id} className="transition hover:bg-[#fbf8f1]/70">
                      <td className="px-5 py-3"><div className="flex items-center gap-3"><span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#203128]/[.07] bg-white"><ImagenProducto src={foto.url} blurDataURL={foto.blurDataUrl} alt={producto.nombre} width={56} height={56} className="h-full w-full object-contain p-1" /></span><div><p className="max-w-[280px] font-semibold text-[#203128]">{producto.nombre}</p><p className="mt-1 text-xs text-stone-500">{producto.sku || producto.slug}{producto.destacado ? " · Destacado" : ""}</p></div></div></td>
                      <td className="px-4 py-3 text-stone-600">{producto.brand.nombre}</td>
                      <td className="px-4 py-3 font-semibold text-[#203128]">{formatearPrecio(producto.precio)}</td>
                      <td className={`px-4 py-3 font-bold ${alertaStock ? "text-amber-700" : "text-stone-700"}`}>{producto.stock}{alertaStock && <span className="ml-2 text-[10px] font-bold uppercase">{producto.stock === 0 ? "Agotado" : "Bajo"}</span>}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${producto.activo ? "bg-[#e7f0eb] text-[#315141]" : "bg-stone-100 text-stone-500"}`}>{producto.activo ? "Activo" : "Oculto"}</span></td>
                      <td className="px-5 py-3 text-right"><Link href={`/producto/${producto.slug}`} target="_blank" className="font-semibold text-[#3f806e] hover:underline">Ver ↗</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
