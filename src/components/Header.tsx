"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { TIENDA } from "@/lib/config";
import { useCarrito } from "./CarritoProvider";
import { useWishlist } from "./WishlistProvider";
import { useFormatearPrecio } from "@/lib/useFormatearPrecio";
import { useMoneda } from "@/lib/moneda-provider";
import { useIdioma } from "@/lib/idioma-provider";
import type { Idioma } from "@/lib/idioma";

const enlaces = [
  { href: "/catalogo", clave: "nav.catalog" },
  { href: "/diagnostico", clave: "nav.diagnosis" },
  { href: "/consejos", clave: "nav.tips" },
  { href: "/ia", clave: "nav.ai" },
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
  const { idioma, cambiarIdioma, t } = useIdioma();
  const { moneda, cambiarMoneda } = useMoneda();
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [envioGratisDesdeUsd, setEnvioGratisDesdeUsd] = useState(TIENDA.envioGratisDesde);
  const formatearPrecio = useFormatearPrecio();

  useEffect(() => {
    let activo = true;
    fetch("/api/configuracion/entrega", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (activo && data) setEnvioGratisDesdeUsd(data.envioGratisDesdeUsd); })
      .catch(() => undefined);
    return () => { activo = false; };
  }, []);

  const mensajeEnvio = envioGratisDesdeUsd > 0
    ? `${t("header.deliveryFrom")} ${formatearPrecio(envioGratisDesdeUsd)}`
    : `${t("header.freeDelivery")} · ${t("header.upTo3Days")}`;

  return (
    <>
      <div className="bg-[#203128] px-4 py-2 text-center text-[11px] font-semibold tracking-[0.14em] text-white uppercase">
        <span className="sm:hidden">{mensajeEnvio}</span>
        <span className="hidden sm:inline">{mensajeEnvio} · {t("header.smartAdvice")}</span>
      </div>
      <header className="sticky top-0 z-50 border-b border-[#203128]/10 bg-[#fbf8f1]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center gap-1 px-3 min-[380px]:gap-2 min-[380px]:px-4 sm:h-[72px] sm:gap-5 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Glasskin, inicio">
            <span className="grid h-8 w-8 place-items-center rounded-full border border-[#203128] bg-[#203128] font-display text-lg font-bold text-white sm:h-9 sm:w-9">G</span>
            <span className="font-display text-lg font-semibold text-[#203128] min-[380px]:text-xl sm:text-2xl">{TIENDA.nombre}</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
            {enlaces.map((enlace) => {
              const activo = pathname === enlace.href || pathname.startsWith(`${enlace.href}/`);
              return (
                <Link key={enlace.href} href={enlace.href} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activo ? "bg-[#e8f0e8] text-[#315141]" : "text-stone-600 hover:bg-white hover:text-[#203128]"}`}>
                  {t(enlace.clave)}
                </Link>
              );
            })}
            <Link href="/admin" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-stone-600 transition hover:bg-white hover:text-[#203128] xl:block">{t("nav.dashboard")}</Link>
          </nav>

          <form action="/catalogo" className="ml-auto hidden max-w-sm flex-1 md:flex">
            <label className="relative w-full">
              <span className="sr-only">{t("header.search")}</span>
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-stone-400"><IconoBuscar /></span>
              <input name="q" type="search" placeholder={t("header.searchPlaceholder")} className="h-11 w-full rounded-full border border-[#203128]/12 bg-white/80 pr-4 pl-11 text-sm outline-none transition placeholder:text-stone-400 focus:border-[#3f806e] focus:ring-4 focus:ring-[#3f806e]/10" />
            </label>
          </form>

          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={() => setBusquedaAbierta((valor) => !valor)} className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-white max-[359px]:hidden md:hidden sm:h-10 sm:w-10" aria-label={t("filters.search")}><IconoBuscar /></button>
            <select value={moneda} onChange={(evento) => cambiarMoneda(evento.target.value as "USD" | "PYG")} className="hidden h-10 rounded-full border border-[#203128]/12 bg-transparent px-3 text-xs font-bold outline-none sm:block" aria-label={t("header.currency")}>
              <option value="USD">USD</option><option value="PYG">PYG</option>
            </select>
            <select value={idioma} onChange={(evento) => cambiarIdioma(evento.target.value as Idioma)} className="h-9 w-[52px] rounded-full border border-[#203128]/12 bg-transparent px-1.5 text-xs font-bold outline-none sm:h-10 sm:w-[60px] sm:px-2" aria-label={t("header.language")}>
              <option value="es">ES</option><option value="en">EN</option>
            </select>
            <Link href="/favoritos" className="relative hidden h-10 w-10 place-items-center rounded-full transition hover:bg-white sm:grid" aria-label={t("nav.favorites")}>
              <span aria-hidden="true">♡</span>
              {cantidadWishlist > 0 && <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#3f806e] px-1 text-[9px] font-bold text-white">{cantidadWishlist}</span>}
            </Link>
            <Link href="/cuenta" className="hidden h-10 w-10 place-items-center rounded-full text-[#203128] transition hover:bg-white sm:grid" aria-label={t("header.profile")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-[19px] w-[19px]" aria-hidden="true"><circle cx="12" cy="8" r="3.5" strokeWidth="1.7" /><path d="M4.5 20c.6-3.4 3.3-5.3 7.5-5.3s6.9 1.9 7.5 5.3" strokeWidth="1.7" strokeLinecap="round" /></svg>
            </Link>
            <Link href="/carrito" className="relative grid h-10 min-w-10 place-items-center rounded-full bg-[#203128] px-3 text-white transition hover:bg-[#3f806e]" aria-label="Carrito">
              <span className="text-[10px] font-bold tracking-wide max-[359px]:sr-only" aria-hidden="true">{t("header.bag")}</span>
              <svg className="hidden h-4 w-4 max-[359px]:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M5 8h14l1 13H4L5 8Z" strokeWidth="1.7" strokeLinejoin="round"/><path d="M9 9V6a3 3 0 0 1 6 0v3" strokeWidth="1.7" strokeLinecap="round"/></svg>
              {cantidadTotal > 0 && <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#dfece4] px-1 text-[10px] font-bold text-[#203128]">{cantidadTotal}</span>}
            </Link>
            <button type="button" onClick={() => setMenuAbierto((valor) => !valor)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-white lg:hidden sm:h-10 sm:w-10" aria-label={menuAbierto ? t("header.closeMenu") : t("header.openMenu")} aria-expanded={menuAbierto}>{menuAbierto ? "×" : "☰"}</button>
          </div>
        </div>

        {busquedaAbierta && (
          <form action="/catalogo" className="border-t border-[#203128]/10 p-3 md:hidden">
            <label className="relative block">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-stone-400"><IconoBuscar /></span>
              <input name="q" type="search" autoFocus placeholder={t("header.mobileSearch")} className="h-12 w-full rounded-full border border-[#203128]/15 bg-white pr-4 pl-11 text-sm outline-none" />
            </label>
          </form>
        )}

        {menuAbierto && (
          <nav className="border-t border-[#203128]/10 bg-[#fbf8f1] p-4 lg:hidden">
            {[{ href: "/", clave: "nav.home" }, ...enlaces, { href: "/favoritos", clave: "nav.favorites" }, { href: "/cuenta", clave: "nav.orders" }, { href: "/admin", clave: "nav.dashboard" }].map((enlace) => (
              <Link key={enlace.href} href={enlace.href} onClick={() => setMenuAbierto(false)} className="block rounded-xl px-4 py-3 text-sm font-semibold text-[#203128] hover:bg-white">{t(enlace.clave)}</Link>
            ))}
            <div className="mt-3 border-t border-[#203128]/10 pt-3 sm:hidden">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-stone-500">{t("header.currency")}<select value={moneda} onChange={(e) => cambiarMoneda(e.target.value as "USD" | "PYG")} className="mt-1 h-11 w-full rounded-xl border border-[#203128]/15 bg-white px-3 text-sm font-semibold"><option value="USD">USD</option><option value="PYG">PYG</option></select></label>
                <label className="text-xs font-semibold text-stone-500">{t("header.language")}<select value={idioma} onChange={(e) => cambiarIdioma(e.target.value as Idioma)} className="mt-1 h-11 w-full rounded-xl border border-[#203128]/15 bg-white px-3 text-sm font-semibold"><option value="es">Español</option><option value="en">English</option></select></label>
              </div>
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
