"use client";

// ============================================================
//  Tarjeta de producto usada en el inicio y el catálogo
// ============================================================
import Link from "next/link";
import { useCarrito } from "./CarritoProvider";
import { useWishlist } from "./WishlistProvider";
import { useFormatearPrecio } from "@/lib/useFormatearPrecio";
import { ImagenProducto } from "./ImagenProducto";

interface Props {
  producto: {
    id: number;
    slug: string;
    nombre: string;
    precio: number;
    stock: number;
    imagen: string | null;
    blurDataUrl?: string | null;
    brand: { nombre: string };
    category?: { nombre: string };
    rating?: { promedio: number; total: number };
  };
}

export function TarjetaProducto({ producto }: Props) {
  const { agregar } = useCarrito();
  const { alternar, tiene } = useWishlist();
  const formatearPrecio = useFormatearPrecio();
  const agotado = producto.stock <= 0;
  const enWishlist = tiene(producto.id);

  function alAgregar() {
    agregar({
      id: producto.id,
      slug: producto.slug,
      nombre: producto.nombre,
      marca: producto.brand.nombre,
      precio: producto.precio,
      imagen: producto.imagen,
    });
  }

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#203128]/10 bg-white transition duration-300 hover:-translate-y-1 hover:border-[#3f806e]/35 hover:shadow-[0_20px_50px_rgba(32,49,40,.11)]">
      {/* Imagen */}
      <Link href={`/producto/${producto.slug}`} className="image-shine relative block aspect-[4/5] overflow-hidden bg-white">
        <ImagenProducto
          src={producto.imagen}
          alt={producto.nombre}
          blurDataURL={producto.blurDataUrl}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="scale-[1.16] object-contain p-0 transition duration-700 group-hover:scale-[1.18]"
        />
        {agotado && (
          <span className="absolute top-3 right-3 rounded-full bg-[#203128]/90 px-3 py-1 text-[10px] font-semibold text-white">
            Agotado
          </span>
        )}
        {/* Wishlist button en la imagen */}
        <button
          type="button"
          onClick={() => alternar({
            id: producto.id,
            slug: producto.slug,
            nombre: producto.nombre,
            marca: producto.brand.nombre,
            precio: producto.precio,
            imagen: producto.imagen,
          })}
          className="absolute top-3 left-3 z-10 grid h-9 w-9 place-items-center rounded-full border border-black/5 bg-white/90 shadow-sm backdrop-blur transition hover:scale-105 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f806e]"
          aria-label={enWishlist ? "Quitar de favoritos" : "Añadir a favoritos"}
        >
          {enWishlist ? (
            <svg className="h-5 w-5 text-[#3f806e]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          ) : (
            <svg className="h-5 w-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
          )}
        </button>
      </Link>

      {/* Información */}
      <div className="flex flex-1 flex-col gap-1 p-4 sm:p-5">
        <div className="flex min-w-0 items-center justify-between gap-2 text-[10px] font-bold tracking-[0.12em] text-[#3f806e] uppercase"><span className="truncate">{producto.brand.nombre}</span>{producto.category && <span className="hidden truncate text-right text-stone-400 sm:block">{producto.category.nombre}</span>}</div>
        <Link
          href={`/producto/${producto.slug}`}
          className="mt-1 line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[#203128] hover:text-[#3f806e]"
        >
          {producto.nombre}
        </Link>
        {producto.rating && producto.rating.total > 0 && (
          <Link href={`/producto/${producto.slug}#resenas`} className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#fbf8f1] px-2 py-1 text-[11px] font-semibold text-stone-600 hover:bg-[#edf3ef]" aria-label={`${producto.rating.promedio.toFixed(1)} de 5 estrellas, ${producto.rating.total} reseñas verificadas`}>
            <span aria-hidden="true" className="tracking-tight text-amber-600">{"★".repeat(Math.round(producto.rating.promedio))}{"☆".repeat(5 - Math.round(producto.rating.promedio))}</span>
            <span>{producto.rating.promedio.toFixed(1)} <span className="text-stone-400">({producto.rating.total})</span></span>
          </Link>
        )}
        <p className="mt-auto pt-3 font-display text-lg font-bold text-[#203128]">
          {formatearPrecio(producto.precio)}
        </p>
        <button
          type="button"
          onClick={alAgregar}
          disabled={agotado}
          className="mt-2 rounded-full border border-[#203128] bg-[#203128] py-2.5 text-xs font-bold text-white transition hover:border-[#3f806e] hover:bg-[#3f806e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f806e] disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-200 disabled:text-stone-400"
        >
          {agotado ? "Sin stock" : "Añadir al carrito"}
        </button>
      </div>
    </article>
  );
}
