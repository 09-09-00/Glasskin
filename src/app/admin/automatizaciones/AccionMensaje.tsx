"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AccionMensaje({ id }: { id: number }) {
  const router = useRouter();
  const [estado, setEstado] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function reenviar() {
    setEnviando(true);
    setEstado("");
    try {
      const response = await fetch(`/api/admin/automatizaciones/${id}/enviar`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo enviar");
      setEstado("Correo enviado");
      router.refresh();
    } catch (error) {
      setEstado(error instanceof Error ? error.message : "No se pudo enviar");
    } finally {
      setEnviando(false);
    }
  }

  return <div className="mt-3 flex flex-wrap items-center gap-3"><button type="button" onClick={() => void reenviar()} disabled={enviando} className="rounded-full border border-[#3f806e]/30 px-3 py-1.5 text-xs font-bold text-[#315141] transition hover:bg-[#edf3ef] disabled:opacity-50">{enviando ? "Enviando…" : "Enviar o reintentar correo"}</button>{estado && <span role="status" className="text-xs text-stone-500">{estado}</span>}</div>;
}
