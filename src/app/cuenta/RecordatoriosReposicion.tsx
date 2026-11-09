"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useCarrito } from "@/components/CarritoProvider";

export interface RecordatorioReposicion {
  id: number;
  producto: string;
  frecuenciaDias: number;
  estado: string;
  proximaEntrega: string;
}

export function RecordatoriosReposicion({ recordatorios }: { recordatorios: RecordatorioReposicion[] }) {
  const router = useRouter();
  const { agregar, items, listo } = useCarrito();
  const [procesando, setProcesando] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [reponiendo, setReponiendo] = useState<number | null>(null);
  const [mensajeReposicion, setMensajeReposicion] = useState("");

  async function cambiar(id: number, accion: "pausar" | "reactivar" | "cancelar") {
    setProcesando(id);
    setMensaje("");
    try {
      const response = await fetch("/api/cuenta/recordatorios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, accion }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo actualizar el recordatorio");
      setMensaje("Preferencia actualizada.");
      router.refresh();
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo actualizar el recordatorio");
    } finally {
      setProcesando(null);
    }
  }

  async function agregarReposicion(id: number) {
    if (!listo || reponiendo !== null) return;
    setReponiendo(id);
    setMensajeReposicion("");
    try {
      const response = await fetch(`/api/cuenta/recordatorios/${id}/recomprar`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo revisar la disponibilidad");
      const producto = data.producto as { id: number; slug: string; nombre: string; marca: string; precio: number; imagen: string | null; stock: number };
      const cantidadEnCarrito = items.find((item) => item.id === producto.id)?.cantidad ?? 0;
      if (cantidadEnCarrito >= producto.stock) throw new Error("Ya tienes en el carrito todas las unidades disponibles.");
      agregar(producto, 1);
      setMensajeReposicion(`${producto.nombre} se añadió al carrito con el precio y stock actuales.`);
    } catch (error) {
      setMensajeReposicion(error instanceof Error ? error.message : "No se pudo preparar la reposición");
    } finally {
      setReponiendo(null);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-[#203128]/10 bg-white p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-[#3f806e]">Tu rutina, a tiempo</p>
      <h2 className="mt-1 font-display text-2xl font-semibold text-[#203128]">Recordatorios de reposición</h2>
      <p className="mt-2 text-sm leading-6 text-stone-500">Cuando llegue la fecha, revisa el stock actual y añade el producto al carrito. No se generan pedidos ni cobros sin tu confirmación.</p>
      {recordatorios.length === 0 ? <p className="mt-4 rounded-xl bg-[#fbf8f1] p-4 text-sm text-stone-600">No tienes recordatorios activos. Puedes elegirlos al finalizar una compra.</p> : (
        <ul className="mt-4 space-y-3">{recordatorios.map((recordatorio) => {
          const vencido = recordatorio.estado === "activa" && new Date(recordatorio.proximaEntrega).getTime() <= Date.now();
          return <li key={recordatorio.id} className="rounded-xl border border-[#203128]/10 p-4"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-semibold text-[#203128]">{recordatorio.producto}</p><p className="mt-1 text-xs text-stone-500">Cada {recordatorio.frecuenciaDias} días · Próximo aviso: {new Date(recordatorio.proximaEntrega).toLocaleDateString("es-PY", { timeZone: "America/Asuncion" })} · {recordatorio.estado === "activa" ? "Activo" : "Pausado"}</p>{vencido && <p className="mt-2 text-xs font-semibold text-[#3f806e]">Tu recordatorio ya está listo. Revisa si necesitas reponerlo.</p>}</div><div className="flex flex-wrap gap-2">{recordatorio.estado === "activa" ? <button type="button" disabled={procesando === recordatorio.id} onClick={() => void cambiar(recordatorio.id, "pausar")} className="rounded-full border border-[#203128]/15 px-3 py-2 text-xs font-bold text-[#315141] disabled:opacity-50">Pausar</button> : <button type="button" disabled={procesando === recordatorio.id} onClick={() => void cambiar(recordatorio.id, "reactivar")} className="rounded-full border border-[#203128]/15 px-3 py-2 text-xs font-bold text-[#315141] disabled:opacity-50">Reactivar</button>}<button type="button" disabled={procesando === recordatorio.id} onClick={() => void cambiar(recordatorio.id, "cancelar")} className="rounded-full border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50">Cancelar</button></div></div>{vencido && <div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" disabled={!listo || reponiendo !== null} onClick={() => void agregarReposicion(recordatorio.id)} className="rounded-full bg-[#203128] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#3f806e] disabled:opacity-50">{reponiendo === recordatorio.id ? "Revisando stock…" : "Añadir al carrito"}</button>{items.some((item) => item.nombre === recordatorio.producto) && <Link href="/carrito" className="rounded-full border border-[#203128]/15 px-4 py-2.5 text-xs font-bold text-[#203128]">Revisar carrito →</Link>}</div>}</li>;
        })}</ul>
      )}
      {mensaje && <p role="status" className="mt-3 text-xs font-semibold text-[#3f806e]">{mensaje}</p>}
      {mensajeReposicion && <p role="status" className="mt-3 rounded-xl bg-[#edf3ef] p-3 text-xs font-semibold text-[#315141]">{mensajeReposicion} {mensajeReposicion.includes("se añadió") && <Link href="/carrito" className="ml-1 underline">Revisar carrito →</Link>}</p>}
    </section>
  );
}
