import Link from "next/link";
import { TIENDA } from "@/lib/config";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#203128] text-white">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_.7fr_.7fr_1fr]">
          <div className="max-w-sm">
            <Link href="/" className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-full border border-white/50 font-display text-lg font-bold">G</span><span className="font-display text-2xl font-semibold">{TIENDA.nombre}</span></Link>
            <p className="mt-5 text-sm leading-6 text-white/60">{TIENDA.descripcion}</p>
            <p className="mt-5 text-xs text-white/45">{TIENDA.ubicacion} · Precios en USD y PYG</p>
          </div>
          <div><p className="text-xs font-bold tracking-[0.15em] text-white/45 uppercase">Comprar</p><ul className="mt-4 space-y-3 text-sm text-white/70"><li><Link href="/catalogo" className="hover:text-white">Todo el catálogo</Link></li><li><Link href="/catalogo?categoria=serums" className="hover:text-white">Sérums</Link></li><li><Link href="/catalogo?categoria=protectores-solares" className="hover:text-white">Protectores solares</Link></li><li><Link href="/favoritos" className="hover:text-white">Favoritos</Link></li></ul></div>
          <div><p className="text-xs font-bold tracking-[0.15em] text-white/45 uppercase">Descubrir</p><ul className="mt-4 space-y-3 text-sm text-white/70"><li><Link href="/ia" className="hover:text-white">Skin AI</Link></li><li><Link href="/consejos" className="hover:text-white">Consejos</Link></li><li><Link href="/videos" className="hover:text-white">Videos</Link></li><li><Link href="/cuenta" className="hover:text-white">Mis pedidos</Link></li></ul></div>
          <div><p className="text-xs font-bold tracking-[0.15em] text-white/45 uppercase">Te ayudamos</p><p className="mt-4 text-sm leading-6 text-white/65">¿No sabés por dónde empezar? Contale a nuestra asesora qué necesita tu piel.</p><Link href="/ia" className="mt-5 inline-flex rounded-full bg-[#e7f0eb] px-5 py-2.5 text-xs font-bold text-[#203128]">Crear una rutina →</Link><Link href="/propietario/login" className="mt-4 block text-xs text-white/45 transition hover:text-white">Acceso del propietario</Link></div>
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 text-[11px] text-white/40 sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} {TIENDA.nombre}. Todos los derechos reservados.</p><p>La información del sitio es educativa y no sustituye consejo médico.</p></div>
      </div>
    </footer>
  );
}
