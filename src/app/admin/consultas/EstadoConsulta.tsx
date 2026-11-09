"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EstadoConsulta({ id, estado }: { id: number; estado: string }) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const siguiente = estado === "abierta" ? "resuelta" : "abierta";

  async function cambiar() {
    setGuardando(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/consultas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado: siguiente }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo actualizar");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar");
    } finally {
      setGuardando(false);
    }
  }

  return <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" disabled={guardando} onClick={() => void cambiar()} className="rounded-full bg-[#203128] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{guardando ? "Guardando…" : estado === "abierta" ? "Marcar como resuelta" : "Reabrir consulta"}</button>{error && <span role="alert" className="text-xs text-rose-700">{error}</span>}</div>;
}
