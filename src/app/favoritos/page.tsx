"use client";

// ============================================================
//  Página de Favoritos (Wishlist)
// ============================================================
import Link from "next/link";
import { useWishlist } from "@/components/WishlistProvider";
import { useFormatearPrecio } from "@/lib/useFormatearPrecio";
import { useCarrito } from "@/components/CarritoProvider";
import { ImagenProducto } from "@/components/ImagenProducto";

export default function WishlistPage() {
  const { items, quitar, vaciar, listo } = useWishlist();
  const { agregar } = useCarrito();
  const formatearPrecio = useFormatearPrecio();

  function alAgregarAlCarrito(producto: ProductoWishlist) {
    agregar({
      id: producto.id,
      slug: producto.slug,
      nombre: producto.nombre,
      marca: producto.marca,
      precio: producto.precio,
      imagen: producto.imagen,
    });
  }

  if (!listo) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-stone-400">
        Cargando favoritos...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-stone-900 sm:text-4xl">Mis favoritos</h1>
          <p className="mt-2 text-sm text-stone-500">
            {items.length === 0
              ? "Todavía no tienes productos guardados"
              : `${items.length} producto${items.length === 1 ? "" : "s"} en tu lista`}
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={vaciar}
            className="text-sm font-medium text-stone-400 transition hover:text-red-600"
          >
            Vaciar lista
          </button>
        )}
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center">
          <span className="text-4xl">🤍</span>
          <p className="mt-4 font-semibold text-stone-900">Tu lista de favoritos está vacía</p>
          <p className="mt-1 text-sm text-stone-500">
            Explora el catálogo y guarda productos para tu próxima compra.
          </p>
          <Link
            href="/catalogo"
            className="mt-6 inline-block rounded-full bg-[#3f806e] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#2c5e50]"
          >
            Explorar catálogo
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <article key={item.id} className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white transition hover:border-[#dfece4] hover:shadow-lg hover:shadow-[#e8f0e8]">
              <Link href={`/producto/${item.slug}`} className="relative block aspect-[4/4.55] overflow-hidden bg-white">
                <ImagenProducto src={item.imagen} alt={item.nombre} fill sizes="(max-width: 640px) 100vw, 25vw" className="scale-[1.16] object-contain p-0 transition duration-300" />
              </Link>
              <div className="flex flex-1 flex-col gap-1 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold tracking-wide text-stone-400 uppercase">
                      {item.marca}
                    </p>
                    <Link
                      href={`/producto/${item.slug}`}
                      className="text-sm font-semibold text-stone-900 hover:text-[#3f806e]"
                    >
                      {item.nombre}
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={() => quitar(item.id)}
                    className="text-stone-300 transition hover:text-red-500"
                    aria-label={`Quitar ${item.nombre} de favoritos`}
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                  </button>
                </div>
                <p className="mt-auto pt-2 text-base font-bold text-stone-900">
                  {formatearPrecio(item.precio)}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => alAgregarAlCarrito(item)}
                    className="flex-1 rounded-full bg-[#203128] py-2 text-sm font-semibold text-white transition hover:bg-[#3f806e]"
                  >
                    Añadir al carrito
                  </button>
                  <button
                    type="button"
                    onClick={() => quitar(item.id)}
                    className="rounded-full border border-stone-300 py-2 px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

interface ProductoWishlist {
  id: number;
  slug: string;
  nombre: string;
  marca: string;
  precio: number;
  imagen: string | null;
}
