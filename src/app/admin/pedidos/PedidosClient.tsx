"use client";

import { useState } from "react";
import { formatearFecha } from "@/lib/format-client";
import { useFormatearPrecio } from "@/lib/useFormatearPrecio";
import { ESTADOS_PEDIDO } from "@/lib/constantes";

// Mapa de colores por estado del pedido
const COLORES_ESTADO: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-700",
  confirmado: "bg-blue-100 text-blue-700",
  enviado: "bg-violet-100 text-violet-700",
  entregado: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-stone-100 text-stone-500",
};

interface PedidoAdmin {
  id: number;
  numero: string;
  estado: string;
  total: number;
  costoEnvio: number;
  tipoEntrega: string;
  latitudEntrega: number | null;
  longitudEntrega: number | null;
  direccionEnvio: string | null;
  entregaEstimadaAt: Date | null;
  recibidoPorClienteAt: Date | null;
  createdAt: Date;
  customer: { id: number; nombre: string; email: string; telefono: string | null };
  items: Array<{ cantidad: number; producto: { nombre: string } }>;
}

interface Props {
  initialPedidos: PedidoAdmin[];
  initialFiltroEntrega?: string;
}

export function PedidosClient({ initialPedidos, initialFiltroEntrega = "" }: Props) {
  const [pedidos, setPedidos] = useState<PedidoAdmin[]>(initialPedidos);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroEntrega, setFiltroEntrega] = useState(initialFiltroEntrega);
  const [cambiandoId, setCambiandoId] = useState<number | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [mensaje, setMensaje] = useState("");
  const formatearPrecio = useFormatearPrecio();

  const estados = ESTADOS_PEDIDO.map((e) => e.valor);

  function enlaceWhatsApp(pedido: PedidoAdmin) {
    const digitos = (pedido.customer.telefono ?? "").replace(/\D/g, "");
    if (digitos.length < 8) return null;
    const telefono = digitos.startsWith("595") ? digitos : digitos.startsWith("0") ? `595${digitos.slice(1)}` : digitos.length <= 9 ? `595${digitos}` : digitos;
    const texto = `Hola ${pedido.customer.nombre}, te escribimos de Glasskin por tu pedido ${pedido.numero}. Su estado actual es ${pedido.estado}. ¿En qué podemos ayudarte?`;
    return `https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`;
  }

  const pedidosFiltrados = pedidos.filter((pedido) =>
    (!filtroEstado || pedido.estado === filtroEstado)
    && (!filtroEntrega || pedido.tipoEntrega === filtroEntrega),
  );

  function enlaceMapa(pedido: PedidoAdmin) {
    if (pedido.latitudEntrega == null || pedido.longitudEntrega == null) return null;
    return `https://www.openstreetmap.org/?mlat=${pedido.latitudEntrega}&mlon=${pedido.longitudEntrega}#map=17/${pedido.latitudEntrega}/${pedido.longitudEntrega}`;
  }

  async function alCambiarEstado(id: number) {
    setCambiandoId(id);
    try {
      const res = await fetch(`/api/admin/pedidos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!res.ok) throw new Error("Error al cambiar estado");
      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, estado: nuevoEstado } : p))
      );
      setMensaje("✅ Estado actualizado");
      setTimeout(() => setMensaje(""), 2000);
    } catch {
      setMensaje("❌ Error al actualizar");
      setTimeout(() => setMensaje(""), 2000);
    }
    setCambiandoId(null);
    setNuevoEstado("");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-stone-900">Pedidos</h2>
          <p className="mt-1 text-sm text-stone-500">
            {pedidos.length} pedidos totales · Cambia el estado desde la tabla
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={filtroEntrega} onChange={(e) => setFiltroEntrega(e.target.value)} aria-label="Filtrar por tipo de entrega" className="w-full max-w-xs rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-[#3f806e] focus:outline-none">
            <option value="">Todos los métodos</option><option value="delivery">Delivery</option><option value="retiro">Retiro en local</option>
          </select>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} aria-label="Filtrar por estado del pedido" className="w-full max-w-xs rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-[#3f806e] focus:outline-none">
            <option value="">Todos los estados</option>{estados.map((e) => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {mensaje && (
        <div className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{mensaje}</div>
      )}

      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs font-semibold text-stone-400 uppercase bg-stone-50">
              <th className="p-4">Pedido</th>
              <th className="p-4">Cliente</th>
              <th className="p-4">Fecha</th>
              <th className="p-4">Entrega</th>
              <th className="p-4">Total</th>
              <th className="p-4">Estado</th>
              <th className="p-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {pedidosFiltrados.map((p) => (
              <tr key={p.id} className={cambiandoId === p.id ? "bg-[#fbf8f1]" : ""}>
                <td className="p-4">
                  <p className="font-semibold text-stone-900">{p.numero}</p>
                  <p className="text-xs text-stone-400">{p.items.length} producto(s)</p>
                </td>
                <td className="p-4">
                  <p className="text-sm font-medium text-stone-900">{p.customer.nombre}</p>
                  <p className="text-xs text-stone-500">{p.customer.email}</p>
                </td>
                <td className="p-4 text-sm text-stone-500">{formatearFecha(p.createdAt)}</td>
                <td className="max-w-64 p-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.tipoEntrega === "retiro" ? "bg-sky-100 text-sky-800" : "bg-violet-100 text-violet-800"}`}>{p.tipoEntrega === "retiro" ? "Retiro" : "Delivery"}</span>
                  <p className="mt-2 text-xs leading-5 text-stone-600">{p.direccionEnvio || "Sin dirección registrada"}</p>
                  <p className="mt-1 text-xs text-stone-500">{p.tipoEntrega === "retiro" ? "Retiro sin costo" : `Envío: ${p.costoEnvio === 0 ? "gratis" : formatearPrecio(p.costoEnvio)}`}</p>
                  {p.tipoEntrega === "delivery" && p.latitudEntrega == null && p.longitudEntrega == null && <p className="mt-1 text-xs font-semibold text-amber-700">Dirección registrada; falta el pin exacto del mapa.</p>}
                  {p.entregaEstimadaAt && <p className="mt-1 text-xs font-medium text-violet-700">Estimada: {formatearFecha(p.entregaEstimadaAt)}</p>}
                  {p.recibidoPorClienteAt && <p className="mt-1 text-xs font-bold text-emerald-700">✓ Recibido confirmado por el cliente · {formatearFecha(p.recibidoPorClienteAt)}</p>}
                  {p.estado === "entregado" && !p.recibidoPorClienteAt && <p className="mt-1 text-xs font-semibold text-emerald-700">✓ Entrega marcada como realizada por la tienda</p>}
                  {enlaceMapa(p) && <a href={enlaceMapa(p)!} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-bold text-[#3f806e] hover:underline">Ver punto en el mapa ↗</a>}
                </td>
                <td className="p-4 font-semibold text-stone-900">{formatearPrecio(p.total)}</td>
                <td className="p-4">
                  {cambiandoId === p.id ? (
                    <select
                      value={nuevoEstado}
                      onChange={(e) => setNuevoEstado(e.target.value)}
                      className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-[#3f806e] focus:outline-none"
                    >
                      {estados.map((e) => (
                        <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        COLORES_ESTADO[p.estado] ?? "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
                    </span>
                  )}
                </td>
                <td className="p-4">
                  {cambiandoId === p.id ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => alCambiarEstado(p.id)}
                        disabled={!nuevoEstado || nuevoEstado === p.estado}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setCambiandoId(null)}
                        className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => { setCambiandoId(p.id); setNuevoEstado(p.estado); }}
                        className="rounded-xl bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-200"
                      >
                        Cambiar estado
                      </button>
                      {enlaceWhatsApp(p) && <a href={enlaceWhatsApp(p)!} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">WhatsApp</a>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pedidosFiltrados.length === 0 && (
          <div className="p-12 text-center text-stone-500">No hay pedidos con esos filtros</div>
        )}
      </div>
    </div>
  );
}
