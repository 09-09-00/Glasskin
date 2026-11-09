"use client";

import { FormEvent, useState } from "react";

type Categoria = {
  id: number;
  slug: string;
  nombre: string;
  descripcion: string | null;
  icono: string | null;
  orden: number;
  _count: { products: number };
};

const vacio = { nombre: "", descripcion: "", icono: "🏷️", orden: 0 };

export function CategoriasClient({ initialCategorias }: { initialCategorias: Categoria[] }) {
  const [categorias, setCategorias] = useState(initialCategorias);
  const [form, setForm] = useState(vacio);
  const [editando, setEditando] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  function nueva() {
    setEditando(null);
    setForm(vacio);
  }

  function editar(categoria: Categoria) {
    setEditando(categoria.id);
    setForm({ nombre: categoria.nombre, descripcion: categoria.descripcion ?? "", icono: categoria.icono ?? "", orden: categoria.orden });
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGuardando(true);
    setMensaje("");
    try {
      const response = await fetch(editando ? `/api/admin/categorias/${editando}` : "/api/admin/categorias", {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar");
      setCategorias((actuales) =>
        editando
          ? actuales.map((item) => (item.id === editando ? data.categoria : item))
          : [...actuales, data.categoria],
      );
      setMensaje(editando ? "✅ Categoría actualizada" : "✅ Categoría creada");
      nueva();
    } catch (error) {
      setMensaje(error instanceof Error ? `❌ ${error.message}` : "❌ No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(categoria: Categoria) {
    if (!confirm(`¿Eliminar la categoría “${categoria.nombre}”?`)) return;
    const response = await fetch(`/api/admin/categorias/${categoria.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setMensaje(`❌ ${data.error ?? "No se pudo eliminar"}`);
      return;
    }
    setCategorias((actuales) => actuales.filter((item) => item.id !== categoria.id));
    setMensaje("✅ Categoría eliminada");
    if (editando === categoria.id) nueva();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-stone-900">Categorías</h2>
        <p className="mt-1 text-sm text-stone-500">Crea y organiza las secciones del catálogo.</p>
      </div>
      {mensaje && <div className="rounded-xl bg-stone-100 p-3 text-sm font-medium text-stone-700">{mensaje}</div>}
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <form onSubmit={guardar} className="h-fit space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
          <h3 className="font-semibold text-stone-900">{editando ? "Editar categoría" : "Nueva categoría"}</h3>
          <label className="block text-sm font-medium text-stone-700">Nombre<input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2" /></label>
          <label className="block text-sm font-medium text-stone-700">Descripción<textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={4} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-stone-700">Icono<input value={form.icono} onChange={(e) => setForm({ ...form, icono: e.target.value })} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2" /></label>
            <label className="block text-sm font-medium text-stone-700">Orden<input type="number" min="0" value={form.orden} onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2" /></label>
          </div>
          <div className="flex gap-2">
            <button disabled={guardando} className="rounded-xl bg-[#203128] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{guardando ? "Guardando…" : "Guardar"}</button>
            {editando && <button type="button" onClick={nueva} className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold">Cancelar</button>}
          </div>
        </form>
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500"><tr><th className="p-4">Categoría</th><th className="p-4">Productos</th><th className="p-4">Orden</th><th className="p-4">Acciones</th></tr></thead>
            <tbody className="divide-y divide-stone-100">
              {categorias.map((categoria) => <tr key={categoria.id}><td className="p-4"><span className="mr-2 text-xl">{categoria.icono}</span><strong>{categoria.nombre}</strong><p className="mt-1 text-xs text-stone-400">{categoria.slug}</p></td><td className="p-4">{categoria._count.products}</td><td className="p-4">{categoria.orden}</td><td className="p-4"><div className="flex gap-2"><button onClick={() => editar(categoria)} className="rounded-lg bg-stone-100 px-3 py-2 font-semibold">Editar</button><button onClick={() => eliminar(categoria)} className="rounded-lg bg-red-50 px-3 py-2 font-semibold text-red-700">Eliminar</button></div></td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
