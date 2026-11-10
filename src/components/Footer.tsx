"use client";

import Link from "next/link";
import { TIENDA } from "@/lib/config";
import { useIdioma } from "@/lib/idioma-provider";

export function Footer() {
  const { t } = useIdioma();
  return (
    <footer className="border-t border-white/10 bg-[#203128] text-white">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_.7fr_.7fr_1fr]">
          <div className="max-w-sm">
            <Link href="/" className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-full border border-white/50 font-display text-lg font-bold">G</span><span className="font-display text-2xl font-semibold">{TIENDA.nombre}</span></Link>
            <p className="mt-5 text-sm leading-6 text-white/60">{t("footer.description")}</p>
            <p className="mt-5 text-xs text-white/45">{t("footer.locationPrices")}</p>
          </div>
          <div><p className="text-xs font-bold tracking-[0.15em] text-white/45 uppercase">{t("footer.buy")}</p><ul className="mt-4 space-y-3 text-sm text-white/70"><li><Link href="/catalogo" className="hover:text-white">{t("footer.catalog")}</Link></li><li><Link href="/catalogo?categoria=serums" className="hover:text-white">{t("footer.serums")}</Link></li><li><Link href="/catalogo?categoria=protectores-solares" className="hover:text-white">{t("footer.sunscreen")}</Link></li><li><Link href="/favoritos" className="hover:text-white">{t("nav.favorites")}</Link></li></ul></div>
          <div><p className="text-xs font-bold tracking-[0.15em] text-white/45 uppercase">{t("footer.discover")}</p><ul className="mt-4 space-y-3 text-sm text-white/70"><li><Link href="/ia" className="hover:text-white">Skin AI</Link></li><li><Link href="/consejos" className="hover:text-white">{t("nav.tips")}</Link></li><li><Link href="/videos" className="hover:text-white">{t("footer.videos")}</Link></li><li><Link href="/cuenta" className="hover:text-white">{t("nav.orders")}</Link></li></ul></div>
          <div><p className="text-xs font-bold tracking-[0.15em] text-white/45 uppercase">{t("footer.help")}</p><p className="mt-4 text-sm leading-6 text-white/65">{t("footer.helpText")}</p><Link href="/ia" className="mt-5 inline-flex rounded-full bg-[#e7f0eb] px-5 py-2.5 text-xs font-bold text-[#203128]">{t("footer.routine")}</Link><Link href="/admin" className="mt-4 block text-xs text-white/65 transition hover:text-white">{t("footer.owner")}</Link><p className="mt-1 text-[10px] leading-4 text-white/35">{t("footer.ownerAccess")}</p></div>
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 text-[11px] text-white/40 sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} {TIENDA.nombre}. {t("footer.rights")}</p><p>{t("footer.disclaimer")}</p></div>
      </div>
    </footer>
  );
}
