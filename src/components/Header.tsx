"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { TIENDA } from "@/lib/config";
import { useCarrito } from "./CarritoProvider";
import { useWishlist } from "./WishlistProvider";
import { leerMonedaCookie, escribirMonedaCookie, type Moneda } from "@/lib/cookie";
import { useFormatearPrecio } from "@/lib/useFormatearPrecio";

const enlaces = [
  { href: "/catalogo", etiqueta: "Catálogo" },
  { href: "/diagnostico", etiqueta: "Diagnóstico" },
  { href: "/consejos", etiqueta: "Consejos" },
  { href: "/ia", etiqueta: "Skin AI" },
];

function IconoBuscar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4" aria-hidden="true">
      <circle cx="11" cy="11" r="7" strokeWidth="1.8" />
      <path d="m20 20-4-4" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Header() {
  const { cantidadTotal } = useCarrito();
  const { cantidad: cantidadWishlist } = useWishlist();
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [moneda, setMoneda] = useState<Moneda>("USD");
  const [envioGratisDesdeUsd, setEnvioGratisDesdeUsd] = useState(TIENDA.envioGratisDesde);
  const formatearPrecio = useFormatearPrecio();

  useEffect(() => setMoneda(leerMonedaCookie()), []);
  useEffect(() => {
    let activo = true;
    fetch("/api/configuracion/entrega", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (activo && data) setEnvioGratisDesdeUsd(data.envioGratisDesdeUsd); })
      .catch(() => undefined);
    return () => { activo = false; };
  }, []);

  const mensajeEnvio = envioGratisDesdeUsd > 0
    ? `Delivery gratis desde ${formatearPrecio(envioGratisDesdeUsd)}`
    : "Delivery gratis · entrega estimada de hasta 3 días";

  function cambiarMoneda(nueva: Moneda) {
    setMoneda(nueva);
    escribirMonedaCookie(nueva);
    window.location.reload();
  }

  return (
    <>
      <div className="bg-[#203128] px-4 py-2 text-center text-[11px] font-semibold tracking-[0.14em] text-white uppercase">
        <span className="sm:hidden">{mensajeEnvio}</span>
        <span className="hidden sm:inline">{mensajeEnvio} · Asesoría inteligente incluida</span>
      </div>
      <header className="sticky top-0 z-50 border-b border-[#203128]/10 bg-[#fbf8f1]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-2 px-4 sm:gap-5 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Glasskin, inicio">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-[#203128] bg-[#203128] font-display text-lg font-bold text-white">G</span>
            <span className="font-display text-xl font-semibold text-[#203128] sm:text-2xl">{TIENDA.nombre}</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
            {enlaces.map((enlace) => {
              const activo = pathname === enlace.href || pathname.startsWith(`${enlace.href}/`);
              return (
                <Link key={enlace.href} href={enlace.href} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activo ? "bg-[#e8f0e8] text-[#315141]" : "text-stone-600 hover:bg-white hover:text-[#203128]"}`}>
                  {enlace.etiqueta}
                </Link>
              );
            })}
          </nav>

          <form action="/catalogo" className="ml-auto hidden max-w-sm flex-1 md:flex">
            <label className="relative w-full">
              <span className="sr-only">Buscar productos, marcas o ingredientes</span>
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-stone-400"><IconoBuscar /></span>
              <input name="q" type="search" placeholder="Producto, marca o ingrediente" className="h-11 w-full rounded-full border border-[#203128]/12 bg-white/80 pr-4 pl-11 text-sm outline-none transition placeholder:text-stone-400 focus:border-[#3f806e] focus:ring-4 focus:ring-[#3f806e]/10" />
            </label>
          </form>

          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={() => setBusquedaAbierta((valor) => !valor)} className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-white md:hidden" aria-label="Buscar"><IconoBuscar /></button>
            <select value={moneda} onChange={(evento) => cambiarMoneda(evento.target.value as Moneda)} className="hidden h-10 rounded-full border border-[#203128]/12 bg-transparent px-3 text-xs font-bold outline-none sm:block" aria-label="Seleccionar moneda">
              <option value="USD">USD</option><option value="PYG">PYG</option>
            </select>
            <Link href="/favoritos" className="relative hidden h-10 w-10 place-items-center rounded-full transition hover:bg-white sm:grid" aria-label="Favoritos">
              <span aria-hidden="true">♡</span>
              {cantidadWishlist > 0 && <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#3f806e] px-1 text-[9px] font-bold text-white">{cantidadWishlist}</span>}
            </Link>
            <Link href="/cuenta" className="hidden h-10 w-10 place-items-center rounded-full text-[#203128] transition hover:bg-white sm:grid" aria-label="Mi perfil y mis pedidos">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-[19px] w-[19px]" aria-hidden="true"><circle cx="12" cy="8" r="3.5" strokeWidth="1.7" /><path d="M4.5 20c.6-3.4 3.3-5.3 7.5-5.3s6.9 1.9 7.5 5.3" strokeWidth="1.7" strokeLinecap="round" /></svg>
            </Link>
            <Link href="/carrito" className="relative grid h-10 min-w-10 place-items-center rounded-full bg-[#203128] px-3 text-white transition hover:bg-[#3f806e]" aria-label="Carrito">
              <span className="text-[10px] font-bold tracking-wide" aria-hidden="true">BOLSA</span>
              {cantidadTotal > 0 && <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#dfece4] px-1 text-[10px] font-bold text-[#203128]">{cantidadTotal}</span>}
            </Link>
            <button type="button" onClick={() => setMenuAbierto((valor) => !valor)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white lg:hidden" aria-label="Abrir menú" aria-expanded={menuAbierto}>{menuAbierto ? "×" : "☰"}</button>
          </div>
        </div>

        {busquedaAbierta && (
          <form action="/catalogo" className="border-t border-[#203128]/10 p-3 md:hidden">
            <label className="relative block">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-stone-400"><IconoBuscar /></span>
              <input name="q" type="search" autoFocus placeholder="¿Qué necesita tu piel?" className="h-12 w-full rounded-full border border-[#203128]/15 bg-white pr-4 pl-11 text-sm outline-none" />
            </label>
          </form>
        )}

        {menuAbierto && (
          <nav className="border-t border-[#203128]/10 bg-[#fbf8f1] p-4 lg:hidden">
            {[{ href: "/", etiqueta: "Inicio" }, ...enlaces, { href: "/favoritos", etiqueta: "Favoritos" }, { href: "/cuenta", etiqueta: "Mis pedidos" }].map((enlace) => (
              <Link key={enlace.href} href={enlace.href} onClick={() => setMenuAbierto(false)} className="block rounded-xl px-4 py-3 text-sm font-semibold text-[#203128] hover:bg-white">{enlace.etiqueta}</Link>
            ))}
            <div className="mt-3 border-t border-[#203128]/10 pt-3 sm:hidden">
              <select value={moneda} onChange={(e) => cambiarMoneda(e.target.value as Moneda)} className="h-11 w-full rounded-xl border border-[#203128]/15 bg-white px-4 text-sm font-semibold">
                <option value="USD">Precios en USD</option><option value="PYG">Precios en guaraníes</option>
              </select>
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
