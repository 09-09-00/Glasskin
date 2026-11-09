"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useCarrito } from "@/components/CarritoProvider";

interface ProductoPedido {
  id: number;
  slug: string;
  nombre: string;
  marca: string;
  precio: number;
  imagen: string | null;
  stock: number;
  cantidad: number;
}

export function RecomprarPedido({ pedidoId }: { pedidoId: number }) {
  const { agregar, items, listo } = useCarrito();
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState("");
  const [carritoActualizado, setCarritoActualizado] = useState(false);
  const enCurso = useRef(false);

  async function repetir() {
    if (!listo || enCurso.current) return;
    enCurso.current = true;
    setCargando(true);
    setResultado("");
    setCarritoActualizado(false);
    try {
      const response = await fetch(`/api/cuenta/pedidos/${pedidoId}/recomprar`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo recuperar el pedido");

      const productos = data.productos as ProductoPedido[];
      let unidadesAgregadas = 0;
      let noAgregadasPorStock = 0;
      for (const producto of productos) {
        const cantidadEnCarrito = items.find((item) => item.id === producto.id)?.cantidad ?? 0;
        const espacioHastaStock = Math.max(0, producto.stock - cantidadEnCarrito);
        const espacioHastaLimite = Math.max(0, 20 - cantidadEnCarrito);
        const cantidad = Math.min(producto.cantidad, espacioHastaStock, espacioHastaLimite);
        if (cantidad > 0) {
          agregar(producto, cantidad);
          unidadesAgregadas += cantidad;
        }
        if (cantidad < producto.cantidad) noAgregadasPorStock += producto.cantidad - cantidad;
      }

      const faltantes = Array.isArray(data.faltantes) ? data.faltantes as Array<{ nombre: string; cantidadNoDisponible: number }> : [];
      const totalNoDisponible = faltantes.reduce((sum, producto) => sum + producto.cantidadNoDisponible, 0) + noAgregadasPorStock;
      const nombreFaltante = faltantes[0]?.nombre;
      const mensajes: string[] = [];
      if (unidadesAgregadas) mensajes.push(`${unidadesAgregadas} unidad${unidadesAgregadas === 1 ? "" : "es"} agregada${unidadesAgregadas === 1 ? "" : "s"} con precios actuales`);
      if (totalNoDisponible) mensajes.push(`${totalNoDisponible} unidad${totalNoDisponible === 1 ? "" : "es"} omitida${totalNoDisponible === 1 ? "" : "s"} por disponibilidad o límite del carrito${nombreFaltante ? ` (${nombreFaltante})` : ""}`);
      if (!mensajes.length) mensajes.push("Los productos de ese pedido ya están en tu carrito");
      setResultado(`${mensajes.join(". ")}.`);
      setCarritoActualizado(unidadesAgregadas > 0 || items.some((item) => productos.some((producto) => producto.id === item.id)));
    } catch (error) {
      setResultado(error instanceof Error ? error.message : "No se pudo repetir el pedido");
    } finally {
      enCurso.current = false;
      setCargando(false);
    }
  }

  return <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" onClick={() => void repetir()} disabled={!listo || cargando} className="rounded-full bg-[#203128] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#3f806e] disabled:opacity-50">{cargando ? "Revisando disponibilidad…" : "Volver a comprar"}</button>{carritoActualizado && <Link href="/carrito" className="rounded-full border border-[#203128]/15 px-4 py-2.5 text-xs font-bold text-[#203128] hover:bg-[#edf3ef]">Revisar carrito →</Link>}{resultado && <p role="status" className="basis-full text-xs leading-5 text-[#3f806e]">{resultado}</p>}</div>;
}
