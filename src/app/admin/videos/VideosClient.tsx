"use client";

import { useState } from "react";
import Image from "next/image";

interface VideoAdmin {
  id: number;
  titulo: string;
  url: string;
  descripcion: string | null;
  tema: string | null;
  createdAt: Date;
  producto: { id: number; nombre: string } | null;
  brand: { id: number; nombre: string } | null;
}

interface Props {
  initialVideos: VideoAdmin[];
}

export function VideosClient({ initialVideos }: Props) {
  const [videos, setVideos] = useState<VideoAdmin[]>(initialVideos);
  const [filtro, setFiltro] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [creando, setCreando] = useState(false);
  const [datosEdit, setDatosEdit] = useState({ titulo: "", url: "", descripcion: "", tema: "" });
  const [datosNuevo, setDatosNuevo] = useState({ titulo: "", url: "", descripcion: "", tema: "", productId: "", brandId: "" });
  const [guardando, setGuardando] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState("");

  const videosFiltrados = videos.filter(
    (v) =>
      v.titulo.toLowerCase().includes(filtro.toLowerCase()) ||
      v.tema?.toLowerCase().includes(filtro.toLowerCase()) ||
      v.producto?.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
      v.brand?.nombre.toLowerCase().includes(filtro.toLowerCase())
  );

  async function alCrear() {
    if (!datosNuevo.titulo.trim() || !datosNuevo.url.trim()) {
      setMensaje("❌ Título y URL son obligatorios");
      setTimeout(() => setMensaje(""), 3000);
      return;
    }
    setGuardando(-1);
    try {
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: datosNuevo.titulo.trim(),
          url: datosNuevo.url.trim(),
          descripcion: datosNuevo.descripcion.trim() || undefined,
          tema: datosNuevo.tema.trim() || undefined,
          productId: datosNuevo.productId ? Number(datosNuevo.productId) : undefined,
          brandId: datosNuevo.brandId ? Number(datosNuevo.brandId) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Error al crear");
      const data = await res.json();
      setVideos((prev) => [data.video, ...prev]);
      setDatosNuevo({ titulo: "", url: "", descripcion: "", tema: "", productId: "", brandId: "" });
      setCreando(false);
      setMensaje("✅ Video creado");
      setTimeout(() => setMensaje(""), 3000);
    } catch {
      setMensaje("❌ Error al crear video");
      setTimeout(() => setMensaje(""), 3000);
    }
    setGuardando(null);
  }

  async function alGuardar(id: number) {
    setGuardando(id);
    try {
      const res = await fetch(`/api/videos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosEdit),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setVideos((prev) =>
        prev.map((v) => (v.id === id ? { ...v, ...datosEdit } : v))
      );
      setMensaje("✅ Guardado");
      setTimeout(() => setMensaje(""), 2000);
    } catch {
      setMensaje("❌ Error al guardar");
      setTimeout(() => setMensaje(""), 2000);
    }
    setGuardando(null);
    setEditandoId(null);
  }

  async function alBorrar(id: number) {
    if (!confirm("¿Borrar este video?")) return;
    try {
      const res = await fetch(`/api/videos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al borrar");
      setVideos((prev) => prev.filter((v) => v.id !== id));
      setMensaje("🗑️ Eliminado");
      setTimeout(() => setMensaje(""), 2000);
    } catch {
      setMensaje("❌ Error al borrar");
      setTimeout(() => setMensaje(""), 2000);
    }
  }

  function iniciarEdicion(v: VideoAdmin) {
    setEditandoId(v.id);
    setDatosEdit({ titulo: v.titulo, url: v.url, descripcion: v.descripcion ?? "", tema: v.tema ?? "" });
  }

  function extraerVideoId(url: string): string | null {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-stone-900">Videos</h2>
          <p className="mt-1 text-sm text-stone-500">{videos.length} videos · Edita, borra o añade desde la API</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <input
            type="search"
            placeholder="Buscar por título, tema, producto, marca..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="flex-1 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-[#3f806e] focus:outline-none"
          />
          <button
            onClick={() => setCreando(true)}
            disabled={creando}
            className="rounded-xl bg-[#3f806e] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2c5e50] disabled:opacity-50"
          >
            + Nuevo video
          </button>
        </div>
      </div>

      {mensaje && (
        <div className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{mensaje}</div>
      )}

      {/* Formulario crear video */}
      {creando && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-4">
          <h3 className="font-semibold text-stone-900">Nuevo video (pega URL de YouTube)</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Título *</label>
              <input
                value={datosNuevo.titulo}
                onChange={(e) => setDatosNuevo({ ...datosNuevo, titulo: e.target.value })}
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-[#3f806e] focus:outline-none"
                placeholder="Título del video"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">URL YouTube *</label>
              <input
                value={datosNuevo.url}
                onChange={(e) => setDatosNuevo({ ...datosNuevo, url: e.target.value })}
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-[#3f806e] focus:outline-none"
                placeholder="https://youtube.com/watch?v=... o youtu.be/..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Tema (opcional)</label>
              <input
                value={datosNuevo.tema}
                onChange={(e) => setDatosNuevo({ ...datosNuevo, tema: e.target.value })}
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-[#3f806e] focus:outline-none"
                placeholder="Ej: rutina, reseña, acné..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">ID Producto (opcional)</label>
              <input
                type="number"
                min="1"
                value={datosNuevo.productId}
                onChange={(e) => setDatosNuevo({ ...datosNuevo, productId: e.target.value })}
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-[#3f806e] focus:outline-none"
                placeholder="Ej: 15"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-600 mb-1">Descripción (opcional)</label>
              <textarea
                value={datosNuevo.descripcion}
                onChange={(e) => setDatosNuevo({ ...datosNuevo, descripcion: e.target.value })}
                rows={2}
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-[#3f806e] focus:outline-none"
                placeholder="Descripción corta del video..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">ID Marca (opcional)</label>
              <input
                type="number"
                min="1"
                value={datosNuevo.brandId}
                onChange={(e) => setDatosNuevo({ ...datosNuevo, brandId: e.target.value })}
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-[#3f806e] focus:outline-none"
                placeholder="Ej: 3"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setCreando(false); setDatosNuevo({ titulo: "", url: "", descripcion: "", tema: "", productId: "", brandId: "" }); }}
              className="rounded-xl border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              Cancelar
            </button>
            <button
              onClick={alCrear}
              disabled={guardando === -1}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {guardando === -1 ? "Creando..." : "Crear video"}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs font-semibold text-stone-400 uppercase bg-stone-50">
              <th className="p-4">Video</th>
              <th className="p-4 hidden md:table-cell">Título</th>
              <th className="p-4 hidden lg:table-cell">Tema</th>
              <th className="p-4">Producto / Marca</th>
              <th className="p-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {videosFiltrados.map((v) => (
              <tr key={v.id} className={editandoId === v.id ? "bg-[#fbf8f1]" : ""}>
                <td className="p-4">
                  <Thumbnail url={v.url} />
                </td>
                <td className="p-4 hidden md:table-cell">
                  <p className="font-semibold text-stone-900 line-clamp-1">{v.titulo}</p>
                  <p className="text-xs text-stone-400">{v.url}</p>
                </td>
                <td className="p-4 hidden lg:table-cell text-sm text-stone-600">{v.tema ?? "—"}</td>
                <td className="p-4">
                  <div className="space-y-1">
                    {v.producto && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#fbf8f1] px-2.5 py-0.5 text-xs text-[#2c5e50]">
                        📦 {v.producto.nombre}
                      </span>
                    )}
                    {v.brand && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs text-violet-700">
                        🏷️ {v.brand.nombre}
                      </span>
                    )}
                    {!v.producto && !v.brand && <span className="text-xs text-stone-400">General</span>}
                  </div>
                </td>
                <td className="p-4">
                  {editandoId === v.id ? (
                    <div className="flex flex-col gap-2">
                      <input
                        value={datosEdit.titulo}
                        onChange={(e) => setDatosEdit({ ...datosEdit, titulo: e.target.value })}
                        className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-[#3f806e] focus:outline-none"
                        placeholder="Título"
                      />
                      <input
                        value={datosEdit.url}
                        onChange={(e) => setDatosEdit({ ...datosEdit, url: e.target.value })}
                        className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-[#3f806e] focus:outline-none"
                        placeholder="URL YouTube"
                      />
                      <input
                        value={datosEdit.tema}
                        onChange={(e) => setDatosEdit({ ...datosEdit, tema: e.target.value })}
                        className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-[#3f806e] focus:outline-none"
                        placeholder="Tema (opcional)"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => alGuardar(v.id)}
                          disabled={guardando === v.id}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {guardando === v.id ? "Guardando..." : "Guardar"}
                        </button>
                        <button
                          onClick={() => setEditandoId(null)}
                          className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => iniciarEdicion(v)}
                        className="rounded-xl bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-200"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => alBorrar(v.id)}
                        className="rounded-xl bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-200"
                      >
                        Borrar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {videosFiltrados.length === 0 && (
          <div className="p-12 text-center text-stone-500">No hay videos con ese filtro</div>
        )}
      </div>
    </div>
  );
}
