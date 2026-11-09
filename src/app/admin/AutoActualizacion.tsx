"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function AutoActualizacion({ actualizado }: { actualizado: string }) {
  const router = useRouter();
  const [actualizando, setActualizando] = useState(false);
  const hora = new Date(actualizado).toLocaleTimeString("es-PY", {
    hour: "2-digit", minute: "2-digit", timeZone: "America/Asuncion",
  });

  useEffect(() => {
    const intervalo = window.setInterval(() => router.refresh(), 60_000);
    return () => window.clearInterval(intervalo);
  }, [router]);

  function actualizarAhora() {
    setActualizando(true);
    router.refresh();
    window.setTimeout(() => setActualizando(false), 900);
  }

  return (
    <div aria-label="Dashboard con actualización automática cada minuto" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-stone-200 bg-white px-3 py-2">
      <span aria-hidden="true" className="grid h-2 w-2 place-items-center"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /></span>
      <span className="text-xs font-semibold text-emerald-800">En vivo · cada 1 min</span>
      <span aria-live="polite" className="text-xs text-stone-500">Actualizado {hora}</span>
      <button type="button" aria-label="Actualizar el dashboard ahora" onClick={actualizarAhora} disabled={actualizando} className="text-xs font-bold text-[#3f806e] disabled:opacity-50">
        {actualizando ? "Actualizando…" : "Actualizar"}
      </button>
    </div>
  );
}
