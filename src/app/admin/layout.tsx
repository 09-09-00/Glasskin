// ============================================================
//  Layout del panel de administración
// ============================================================
import Link from "next/link";
import { TIENDA } from "@/lib/config";
import { AdminLogoutButton } from "@/components/AdminLogoutButton";

const adminLinks = [
  { href: "/admin", etiqueta: "Dashboard ejecutivo", icono: "📊" },
  { href: "/admin/productos", etiqueta: "Productos", icono: "🧴" },
  { href: "/admin/clientes", etiqueta: "Clientes", icono: "👤" },
  { href: "/admin/pedidos", etiqueta: "Pedidos", icono: "📦" },
  { href: "/admin/consultas", etiqueta: "Consultas", icono: "💬" },
];

const herramientasLinks = [
  { href: "/admin/copiloto", etiqueta: "Copiloto IA", icono: "✦" },
  { href: "/admin/automatizaciones", etiqueta: "Automatizaciones", icono: "✦" },
];

const catalogoLinks = [
  { href: "/admin/resenas", etiqueta: "Reseñas", icono: "⭐" },
  { href: "/admin/categorias", etiqueta: "Categorías", icono: "🏷️" },
  { href: "/admin/videos", etiqueta: "Videos", icono: "🎬" },
  { href: "/admin/settings", etiqueta: "Configuración", icono: "⚙️" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 w-64 border-r border-stone-200 bg-white hidden lg:block">
        <div className="flex h-16 items-center gap-2 border-b border-stone-200 px-6">
          <span className="text-2xl">⚙️</span>
          <span className="font-display text-xl font-bold text-stone-900">
            {TIENDA.nombre} Dueño
          </span>
        </div>
        <nav aria-label="Navegación del dueño" className="space-y-5 p-4">
          <div className="space-y-1">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100 hover:text-stone-900"
            >
              <span>{link.icono}</span>
              {link.etiqueta}
            </Link>
          ))}
          </div>
          <details className="group rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
            <summary className="cursor-pointer list-none py-1 text-xs font-bold uppercase tracking-wide text-stone-500 marker:hidden">Herramientas <span className="float-right transition group-open:rotate-90">›</span></summary>
            <div className="mt-2 space-y-1">{herramientasLinks.map((link) => <Link key={link.href} href={link.href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-white hover:text-stone-900"><span>{link.icono}</span>{link.etiqueta}</Link>)}</div>
          </details>
          <details className="group rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
            <summary className="cursor-pointer list-none py-1 text-xs font-bold uppercase tracking-wide text-stone-500 marker:hidden">Tienda <span className="float-right transition group-open:rotate-90">›</span></summary>
            <div className="mt-2 space-y-1">{catalogoLinks.map((link) => <Link key={link.href} href={link.href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-white hover:text-stone-900"><span>{link.icono}</span>{link.etiqueta}</Link>)}</div>
          </details>
        </nav>
      </aside>

      {/* Contenido principal */}
      <main className="lg:ml-64">
        <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/85 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-6">
            <h1 className="text-lg font-semibold text-stone-900">Panel del dueño</h1>
            <div className="flex items-center gap-4">
              <Link href="/" className="text-sm font-medium text-[#3f806e] hover:text-[#2c5e50]">
                Ver tienda →
              </Link>
              <AdminLogoutButton />
            </div>
          </div>
          <nav aria-label="Navegación administrativa" className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
            {adminLinks.map((link) => (
              <Link key={link.href} href={link.href} className="shrink-0 rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:border-[#dfece4]">
                <span className="mr-1.5">{link.icono}</span>{link.etiqueta}
              </Link>
            ))}
            <details className="relative shrink-0">
              <summary className="cursor-pointer list-none rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700">Más opciones⌄</summary>
              <div className="absolute right-0 top-10 z-50 w-56 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl">{[...herramientasLinks, ...catalogoLinks].map((link) => <Link key={link.href} href={link.href} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-50"><span>{link.icono}</span>{link.etiqueta}</Link>)}</div>
            </details>
          </nav>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
