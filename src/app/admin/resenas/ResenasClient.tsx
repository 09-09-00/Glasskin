"use client";

import Link from "next/link";
import { useState } from "react";

interface Resena { id: number; rating: number; comment: string; estado: string; createdAt: string; producto: { nombre: string; slug: string }; customer: { nombre: string }; order: { numero: string } }

export function AdminResenasClient({ reseñas: iniciales, total, visibles }: { reseñas: Resena[]; total: number; visibles: number }) {
  const [reseñas, setReseñas] = useState(iniciales);
  const [visiblesCount, setVisiblesCount] = useState(visibles);
  const [cambiando, setCambiando] = useState<number | null>(null);
  const [error, setError] = useState("");
  async function cambiarEstado(id: number, estado: "visible" | "oculta") {
    setCambiando(id); setError("");
    try {
      const response = await fetch(`/api/admin/resenas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo actualizar.");
      const estadoAnterior = reseñas.find((resena) => resena.id === id)?.estado;
      if (estadoAnterior && estadoAnterior !== estado) setVisiblesCount((actual) => actual + (estado === "visible" ? 1 : -1));
      setReseñas((actuales) => actuales.map((resena) => resena.id === id ? { ...resena, estado } : resena));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo actualizar."); }
    finally { setCambiando(null); }
  }
  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#3f806e]">Voz de clientes</p><h2 className="mt-1 font-display text-3xl font-bold text-stone-900">Reseñas de productos</h2><p className="mt-2 text-sm text-stone-500">Cada opinión está vinculada a un pedido marcado como entregado y a un cliente.</p></div><Link href="/admin/productos" className="rounded-full border border-[#203128]/15 px-4 py-2 text-sm font-bold text-[#203128]">Revisar catálogo →</Link></header>
    <div className="grid gap-3 sm:grid-cols-3"><article className="rounded-2xl bg-[#e7f0eb] p-5"><p className="text-xs font-bold uppercase text-stone-500">Reseñas recibidas</p><p className="mt-2 font-display text-3xl font-bold">{total}</p></article><article className="rounded-2xl bg-white p-5"><p className="text-xs font-bold uppercase text-stone-500">Visibles en la tienda</p><p className="mt-2 font-display text-3xl font-bold">{visiblesCount}</p></article><article className="rounded-2xl bg-[#f3ead7] p-5"><p className="text-xs font-bold uppercase text-stone-500">Ocultas</p><p className="mt-2 font-display text-3xl font-bold">{total - visiblesCount}</p></article></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {reseñas.length ? <div className="space-y-3">{reseñas.map((resena) => <article key={resena.id} className="rounded-2xl border border-stone-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={`/producto/${resena.producto.slug}`} className="font-semibold text-[#203128] hover:underline">{resena.producto.nombre}</Link><p className="mt-1 text-xs text-stone-500">{resena.customer.nombre} · {resena.order.numero} · {new Intl.DateTimeFormat("es-PY", { dateStyle: "medium", timeZone: "America/Asuncion" }).format(new Date(resena.createdAt))}</p><p className="mt-2 text-amber-600">{"★".repeat(resena.rating)}{"☆".repeat(5 - resena.rating)} <span className="text-xs font-semibold text-stone-500">{resena.rating}/5</span></p></div><div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${resena.estado === "visible" ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"}`}>{resena.estado === "visible" ? "Visible" : "Oculta"}</span><button type="button" disabled={cambiando === resena.id} onClick={() => void cambiarEstado(resena.id, resena.estado === "visible" ? "oculta" : "visible")} className="rounded-full border border-stone-200 px-3 py-2 text-xs font-bold text-stone-700 disabled:opacity-50">{cambiando === resena.id ? "Guardando…" : resena.estado === "visible" ? "Ocultar" : "Mostrar"}</button></div></div><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-stone-600">{resena.comment}</p></article>)}</div> : <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center text-sm text-stone-500">Aún no hay opiniones. Aparecerán cuando una compra marcada como entregada reciba una reseña.</div>}
    {reseñas.length >= 100 && <p className="text-center text-xs text-stone-400">Se muestran las 100 opiniones más recientes.</p>}
  </div>;
}
