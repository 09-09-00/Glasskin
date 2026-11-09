import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CategoriasClient } from "./CategoriasClient";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  const categorias = await prisma.category.findMany({
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    include: {
      products: { select: { activo: true, stock: true, precio: true } },
      _count: { select: { products: true } },
    },
  });
  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#3f806e]">Panel del dueño</p>
        <h2 className="mt-1 font-display text-2xl font-bold text-stone-900">Gestión por categoría</h2>
        <p className="mt-1 text-sm text-stone-500">Cada categoría tiene su propio resumen, alertas de inventario y acceso directo a sus productos.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {categorias.map((categoria) => {
          const activos = categoria.products.filter((producto) => producto.activo).length;
          const stockBajo = categoria.products.filter((producto) => producto.activo && producto.stock < 5).length;
          const valorInventario = categoria.products.reduce((total, producto) => total + producto.precio * producto.stock, 0);
          return (
            <Link key={categoria.id} href={`/admin/categorias/${categoria.slug}`} className="group rounded-3xl border border-stone-200 bg-white p-5 transition hover:border-[#3f806e] hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#fbf8f1] text-2xl">{categoria.icono ?? "🏷️"}</span><div><h3 className="font-display text-lg font-semibold text-stone-900">{categoria.nombre}</h3><p className="text-xs text-stone-500">{activos} activos de {categoria._count.products} productos</p></div></div>
                <span className="text-lg text-stone-400 transition group-hover:translate-x-1">→</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-stone-50 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Stock bajo</p><p className={`mt-1 text-xl font-bold ${stockBajo ? "text-amber-700" : "text-stone-800"}`}>{stockBajo}</p></div>
                <div className="rounded-2xl bg-stone-50 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Valor inventario</p><p className="mt-1 truncate text-lg font-bold text-stone-800">${valorInventario.toLocaleString("es-PY", { maximumFractionDigits: 0 })}</p></div>
              </div>
              <p className="mt-4 text-sm font-semibold text-[#3f806e]">Abrir panel de categoría →</p>
            </Link>
          );
        })}
      </div>
      <details className="rounded-2xl border border-stone-200 bg-white p-5">
        <summary className="cursor-pointer font-semibold text-stone-800">Crear, ordenar o editar categorías</summary>
        <div className="mt-5"><CategoriasClient initialCategorias={categorias} /></div>
      </details>
    </div>
  );
}
