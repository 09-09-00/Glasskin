"use client";

// ============================================================
//  Página de Videos - Buscador por producto, marca, categoría, tema
// ============================================================
import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

interface Video {
  id: number;
  titulo: string;
  url: string;
  descripcion: string | null;
  tema: string | null;
  createdAt: string;
  producto: { id: number; slug: string; nombre: string; brand: { nombre: string }; category: { slug: string; nombre: string } } | null;
  brand: { id: number; slug: string; nombre: string } | null;
}

function extraerVideoId(url: string): string | null {
  // youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
  const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function Thumbnail({ url }: { url: string }) {
  const id = extraerVideoId(url);
  if (!id) return <div className="aspect-video bg-stone-100 flex items-center justify-center text-4xl">🎬</div>;
  return (
    <Image
      src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
      alt="Video thumbnail"
      width={480}
      height={270}
      unoptimized
      className="aspect-video w-full object-cover"
    />
  );
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtros, setFiltros] = useState({ q: "", producto: "", marca: "", tema: "", categoria: "" });
  const [categorias, setCategorias] = useState<Array<{ slug: string; nombre: string }>>([]);

  async function cargarCategorias() {
    try {
      const res = await fetch("/api/categorias");
      const data = await res.json();
      if (res.ok) setCategorias(data.categorias);
    } catch {}
  }

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filtros.q) params.set("q", filtros.q);
      if (filtros.producto) params.set("producto", filtros.producto);
      if (filtros.marca) params.set("marca", filtros.marca);
      if (filtros.tema) params.set("tema", filtros.tema);
      if (filtros.categoria) params.set("categoria", filtros.categoria);
      const res = await fetch(`/api/videos?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error cargando videos");
      setVideos(data.videos);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setCargando(false);
    }
  }

  async function alBuscar(e: FormEvent) {
    e.preventDefault();
    cargar();
  }

  async function alCambiarFiltro(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFiltros((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function limpiarFiltros() {
    setFiltros({ q: "", producto: "", marca: "", tema: "", categoria: "" });
    cargar();
  }

  // Cargar la lista y categorías una sola vez al entrar; los filtros se aplican al enviar.
  useEffect(() => {
    void cargarCategorias();
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold text-stone-900 sm:text-4xl">🎬 Videos de Skincare</h1>
        <p className="mt-2 text-sm text-stone-500">
          Tutoriales, reseñas y rutinas. Filtra por producto, marca, categoría o tema.
        </p>
      </header>

      {/* Filtros */}
      <form onSubmit={alBuscar} className="mb-8 rounded-2xl border border-stone-200 bg-white p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500" htmlFor="filtro-q">
              Buscar
            </label>
            <input
              id="filtro-q"
              name="q"
              type="search"
              value={filtros.q}
              onChange={alCambiarFiltro}
              placeholder="Término, producto, ingrediente..."
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-[#3f806e] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500" htmlFor="filtro-tema">
              Tema
            </label>
            <input
              id="filtro-tema"
              name="tema"
              type="search"
              value={filtros.tema}
              onChange={alCambiarFiltro}
              placeholder="Ej: rutina, reseña, acné..."
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-[#3f806e] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500" htmlFor="filtro-categoria">
              Categoría
            </label>
            <select
              id="filtro-categoria"
              name="categoria"
              value={filtros.categoria}
              onChange={alCambiarFiltro}
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-[#3f806e] focus:outline-none"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((cat) => (
                <option key={cat.slug} value={cat.slug}>{cat.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500" htmlFor="filtro-producto">
              ID Producto (opcional)
            </label>
            <input
              id="filtro-producto"
              name="producto"
              type="number"
              min="1"
              value={filtros.producto}
              onChange={alCambiarFiltro}
              placeholder="Ej: 15"
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-[#3f806e] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500" htmlFor="filtro-marca">
              ID Marca (opcional)
            </label>
            <input
              id="filtro-marca"
              name="marca"
              type="number"
              min="1"
              value={filtros.marca}
              onChange={alCambiarFiltro}
              placeholder="Ej: 3"
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-[#3f806e] focus:outline-none"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={limpiarFiltros} className="rounded-xl border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50">
            Limpiar
          </button>
          <button type="submit" disabled={cargando} className="rounded-full bg-[#3f806e] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2c5e50] disabled:opacity-50">
            {cargando ? "Buscando..." : "Buscar"}
          </button>
        </div>
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </form>

      {/* Resultados */}
      {cargando ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-stone-200 bg-white p-4 animate-pulse">
              <div className="aspect-video bg-stone-200 rounded-xl mb-3" />
              <div className="h-4 bg-stone-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-stone-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center">
          <span className="text-4xl">🎬</span>
          <p className="mt-4 font-semibold text-stone-900">No hay videos</p>
          <p className="mt-1 text-sm text-stone-500">Prueba cambiando los filtros o añade videos desde el panel admin.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video) => (
            <article key={video.id} className="group rounded-2xl border border-stone-200 bg-white overflow-hidden transition hover:border-[#dfece4] hover:shadow-lg">
              <Link href={video.url} target="_blank" rel="noopener noreferrer" className="block relative aspect-video overflow-hidden bg-stone-100">
                <Thumbnail url={video.url} />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <svg className="h-12 w-12 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </Link>
              <div className="p-4 space-y-2">
                <h3 className="font-semibold text-stone-900 line-clamp-2 group-hover:text-[#3f806e] transition">
                  {video.titulo}
                </h3>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {video.producto && (
                    <Link
                      href={`/producto/${video.producto.slug}`}
                      className="rounded-full bg-[#fbf8f1] px-2.5 py-0.5 text-[#2c5e50] hover:bg-[#e7f0eb]"
                    >
                      {video.producto.nombre}
                    </Link>
                  )}
                  {video.brand && (
                    <Link
                      href={`/catalogo?marca=${video.brand.slug}`}
                      className="rounded-full bg-violet-50 px-2.5 py-0.5 text-violet-700 hover:bg-violet-100"
                    >
                      {video.brand.nombre}
                    </Link>
                  )}
                  {video.tema && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700">
                      {video.tema}
                    </span>
                  )}
                </div>
                {video.descripcion && (
                  <p className="text-xs text-stone-500 line-clamp-2">{video.descripcion}</p>
                )}
                <p className="text-[10px] text-stone-400">
                  {new Date(video.createdAt).toLocaleDateString("es-ES")}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
