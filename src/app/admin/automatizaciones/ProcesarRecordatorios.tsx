"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProcesarRecordatorios({ vencidos }: { vencidos: number }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [resultado, setResultado] = useState("");

  async function procesar() {
    setOcupado(true);
    setResultado("");
    try {
      const response = await fetch("/api/admin/automatizaciones/recordatorios", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudieron procesar los avisos");
      setResultado(data.enviados > 0 ? `${data.enviados} correo(s) enviado(s). ${data.borradores} guardado(s) para revisar.` : `${data.preparados} aviso(s) guardado(s) en la bandeja.`);
      router.refresh();
    } catch (error) {
      setResultado(error instanceof Error ? error.message : "No se pudieron procesar los avisos");
    } finally {
      setOcupado(false);
    }
  }

  return <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => void procesar()} disabled={ocupado || vencidos === 0} className="rounded-full bg-[#203128] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#3f806e] disabled:cursor-not-allowed disabled:opacity-50">{ocupado ? "Procesando…" : `Procesar avisos vencidos (${vencidos})`}</button>{resultado && <p role="status" className="text-xs font-semibold text-[#315141]">{resultado}</p>}</div>;
}
