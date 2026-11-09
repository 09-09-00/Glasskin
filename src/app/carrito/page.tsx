"use client";

// ============================================================
//  Carrito de compras: lista de productos, cantidades y total
// ============================================================
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCarrito } from "@/components/CarritoProvider";
import { useFormatearPrecio } from "@/lib/useFormatearPrecio";
import { TIENDA } from "@/lib/config";
import { ImagenProducto } from "@/components/ImagenProducto";

export default function Carrito() {
  const { items, cambiarCantidad, quitar, vaciar, total, cantidadTotal, listo } = useCarrito();
  const formatearPrecio = useFormatearPrecio();
  const [logistica, setLogistica] = useState({ costoDeliveryUsd: 0, envioGratisDesdeUsd: TIENDA.envioGratisDesde });

  useEffect(() => {
    let activo = true;
    fetch("/api/configuracion/entrega", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (activo && data) setLogistica({ costoDeliveryUsd: data.costoDeliveryUsd, envioGratisDesdeUsd: data.envioGratisDesdeUsd }); })
      .catch(() => undefined);
    return () => { activo = false; };
  }, []);

  const envioGratis = logistica.envioGratisDesdeUsd <= 0 || total >= logistica.envioGratisDesdeUsd;
  const costoEnvio = envioGratis ? 0 : logistica.costoDeliveryUsd;

  // Evitar parpadeo mientras el carrito se carga de localStorage
  if (!listo) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-stone-400">
        Cargando carrito...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-stone-900 sm:text-4xl">Tu carrito</h1>
          <p className="mt-2 text-sm text-stone-500">
            {cantidadTotal === 0
              ? "Todavía no tienes productos"
              : `${cantidadTotal} producto${cantidadTotal === 1 ? "" : "s"} en tu carrito`}
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={vaciar}
            className="text-sm font-medium text-stone-400 transition hover:text-red-600"
          >
            Vaciar carrito
          </button>
        )}
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center">
          <span className="text-4xl">🛒</span>
          <p className="mt-4 font-semibold text-stone-900">Tu carrito está vacío</p>
          <p className="mt-1 text-sm text-stone-500">
            Explora el catálogo y encuentra lo que tu piel necesita.
          </p>
          <Link
            href="/catalogo"
            className="mt-6 inline-block rounded-full bg-[#3f806e] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#2c5e50]"
          >
            Explorar catálogo
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* ---------- Lista de productos ---------- */}
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex gap-4 rounded-2xl border border-stone-200 bg-white p-4"
              >
                {/* Imagen */}
                <Link href={`/producto/${item.slug}`} className="shrink-0">
                  <ImagenProducto src={item.imagen} alt={item.nombre} width={80} height={80} className="h-20 w-20 rounded-xl bg-white object-contain p-1" />
                </Link>

                {/* Información */}
                <div className="flex flex-1 flex-col">
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
                      aria-label={`Quitar ${item.nombre}`}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Cantidad y subtotal */}
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="flex items-center rounded-full border border-stone-200">
                      <button
                        type="button"
                        onClick={() => cambiarCantidad(item.id, item.cantidad - 1)}
                        className="h-8 w-8 text-sm text-stone-500 hover:text-stone-900"
                        aria-label="Restar"
                      >
                        −
                      </button>
                      <span className="w-7 text-center text-sm font-semibold">
                        {item.cantidad}
                      </span>
                      <button
                        type="button"
                        onClick={() => cambiarCantidad(item.id, item.cantidad + 1)}
                        className="h-8 w-8 text-sm text-stone-500 hover:text-stone-900"
                        aria-label="Sumar"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-sm font-bold text-stone-900">
                      {formatearPrecio(item.precio * item.cantidad)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* ---------- Resumen ---------- */}
          <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="text-sm font-bold text-stone-900">Resumen</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-stone-600">
                <dt>Subtotal</dt>
                <dd>{formatearPrecio(total)}</dd>
              </div>
              <div className="flex justify-between text-stone-600">
                <dt>Envío</dt>
                <dd className={envioGratis ? "font-semibold text-emerald-600" : ""}>
                  {costoEnvio === 0 ? "Gratis" : formatearPrecio(costoEnvio)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-stone-200 pt-3 text-base font-bold text-stone-900">
                <dt>Total</dt>
                <dd>{formatearPrecio(total + costoEnvio)}</dd>
              </div>
            </dl>

            {!envioGratis && logistica.envioGratisDesdeUsd > total && (
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
                Te faltan {formatearPrecio(logistica.envioGratisDesdeUsd - total)} para el envío gratis.
              </p>
            )}

            <Link
              href="/checkout"
              className="mt-5 block rounded-full bg-[#3f806e] py-3 text-center text-sm font-semibold text-white transition hover:bg-[#2c5e50]"
            >
              Finalizar compra
            </Link>
            <Link
              href="/catalogo"
              className="mt-2 block rounded-full border border-stone-300 py-3 text-center text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              Seguir comprando
            </Link>
            <p className="mt-4 text-center text-[11px] text-stone-400">
              {TIENDA.nombre} · Sin pago real por ahora (FASE 1)
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
