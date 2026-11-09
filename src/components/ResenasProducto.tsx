"use client";

import { useRef, useState } from "react";

export interface ResenaVisible { id: number; rating: number; comment: string; nombre: string; createdAt: string }

export function ResenasProducto({ slug, reseñas: iniciales, promedio, total }: { slug: string; reseñas: ResenaVisible[]; promedio: number | null; total: number }) {
  const [orden, setOrden] = useState("recientes");
  const [reseñas, setReseñas] = useState(iniciales);
  const [pagina, setPagina] = useState(0);
  const [hayMas, setHayMas] = useState(total > iniciales.length);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const solicitud = useRef(0);

  async function cambiarOrden(nuevoOrden: string) {
    setOrden(nuevoOrden);
    setCargando(true);
    setError("");
    const numeroSolicitud = ++solicitud.current;
    try {
      const response = await fetch(`/api/productos/${encodeURIComponent(slug)}/resenas?orden=${nuevoOrden}&pagina=0`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudieron ordenar las reseñas.");
      if (numeroSolicitud === solicitud.current) { setReseñas(data.reseñas); setPagina(0); setHayMas(data.hayMas); }
    } catch (cause) { if (numeroSolicitud === solicitud.current) setError(cause instanceof Error ? cause.message : "No se pudieron ordenar las reseñas."); }
    finally { if (numeroSolicitud === solicitud.current) setCargando(false); }
  }

  async function cargarMas() {
    if (cargando || !hayMas) return;
    setCargando(true); setError("");
    const numeroSolicitud = ++solicitud.current;
    const siguientePagina = pagina + 1;
    try {
      const response = await fetch(`/api/productos/${encodeURIComponent(slug)}/resenas?orden=${orden}&pagina=${siguientePagina}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar más reseñas.");
      if (numeroSolicitud === solicitud.current) { setReseñas((actuales) => [...actuales, ...data.reseñas]); setPagina(siguientePagina); setHayMas(data.hayMas); }
    } catch (cause) { if (numeroSolicitud === solicitud.current) setError(cause instanceof Error ? cause.message : "No se pudieron cargar más reseñas."); }
    finally { if (numeroSolicitud === solicitud.current) setCargando(false); }
  }

  const temas = [
    { nombre: "Hidratación", patrones: /hidrat|resequ|tirant/ },
    { nombre: "Textura", patrones: /textura|suave|liger|pegajos|absorbe/ },
    { nombre: "Uso diario", patrones: /diario|rutina|manana|noche|facil/ },
    { nombre: "Resultados percibidos", patrones: /result|funcion|mejor|cambio|ayud/ },
  ].map((tema) => ({ ...tema, menciones: reseñas.filter((resena) => tema.patrones.test(resena.comment.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())).length })).filter((tema) => tema.menciones >= 2).sort((a, b) => b.menciones - a.menciones).slice(0, 3);

  return <section id="resenas" className="mt-16 border-t border-[#203128]/10 pt-10">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#3f806e]">Experiencias verificadas</p><h2 className="mt-1 font-display text-3xl font-semibold text-[#203128]">Reseñas de clientes</h2></div>{total > 0 && <label className="text-xs font-semibold text-stone-500">Ordenar <select value={orden} onChange={(event) => void cambiarOrden(event.target.value)} className="ml-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700"><option value="recientes">Más recientes</option><option value="mejores">Mejor puntuadas</option><option value="peores">Menor puntuación</option></select></label>}</div>
    {total > 0 ? <div className="mt-5 grid gap-5 lg:grid-cols-[240px_1fr]"><aside className="h-fit rounded-2xl bg-[#edf3ef] p-5"><p className="font-display text-4xl font-bold text-[#203128]">{promedio?.toFixed(1)}<span className="ml-1 text-base text-stone-500">/ 5</span></p><p className="mt-1 text-amber-600" aria-label={`${promedio?.toFixed(1)} de 5 estrellas`}>{"★".repeat(Math.round(promedio ?? 0))}{"☆".repeat(5 - Math.round(promedio ?? 0))}</p><p className="mt-2 text-xs text-stone-600">{total} opinión{total === 1 ? "" : "es"} de compras recibidas</p>{temas.length > 0 && <div className="mt-5 border-t border-[#203128]/10 pt-4"><p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Lo más mencionado en las opiniones cargadas</p><ul className="mt-2 space-y-2">{temas.map((tema) => <li key={tema.nombre} className="flex justify-between gap-2 text-xs text-[#315141]"><span>{tema.nombre}</span><strong>{tema.menciones}</strong></li>)}</ul><p className="mt-2 text-[10px] leading-4 text-stone-500">Conteo de palabras; no es una conclusión clínica.</p></div>}</aside><div><div className="space-y-3">{reseñas.map((resena) => <article key={resena.id} className="rounded-2xl border border-[#203128]/10 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold text-[#203128]">{resena.nombre}</p><p className="text-amber-600" aria-label={`${resena.rating} de 5 estrellas`}>{"★".repeat(resena.rating)}{"☆".repeat(5 - resena.rating)}</p></div><time className="text-xs text-stone-400" dateTime={resena.createdAt}>{new Intl.DateTimeFormat("es-PY", { dateStyle: "medium", timeZone: "America/Asuncion" }).format(new Date(resena.createdAt))}</time></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-600">{resena.comment}</p><span className="mt-3 inline-flex rounded-full bg-[#edf3ef] px-2.5 py-1 text-[10px] font-bold text-[#315141]">✓ Compra verificada</span></article>)}</div>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}{(cargando || hayMas) && <button type="button" disabled={cargando} onClick={() => void cargarMas()} className="mt-4 w-full rounded-full border border-[#203128]/15 px-5 py-3 text-sm font-bold text-[#203128] disabled:opacity-50">{cargando ? "Cargando reseñas…" : "Ver más reseñas"}</button>}</div></div> : <div className="mt-5 rounded-2xl border border-dashed border-[#203128]/15 bg-white p-7 text-sm text-stone-500">Todavía no hay reseñas publicadas. Cuando alguien confirme que recibió este producto, podrá compartir su experiencia.</div>}
  </section>;
}
