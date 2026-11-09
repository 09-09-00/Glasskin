"use client";

import { useState } from "react";

export function ConfirmarRecepcion({ pedidoId, recibidoInicial }: { pedidoId: number; recibidoInicial: string | null }) {
  const [recibido, setRecibido] = useState(Boolean(recibidoInicial));
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  async function confirmar() {
    setOcupado(true); setError("");
    try {
      const response = await fetch(`/api/cuenta/pedidos/${pedidoId}/recepcion`, { method: "PATCH" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo confirmar.");
      setRecibido(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo confirmar.");
    } finally { setOcupado(false); }
  }

  if (recibido) return <p role="status" className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">✓ Recepción confirmada. La tienda ya puede verlo en sus pedidos.</p>;
  return <div className="mt-3"><button type="button" onClick={() => void confirmar()} disabled={ocupado} className="rounded-full bg-[#3f806e] px-4 py-2 text-xs font-bold text-white hover:bg-[#2c5e50] disabled:opacity-50">{ocupado ? "Guardando…" : "Sí, ya recibí mi pedido"}</button>{error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}</div>;
}
