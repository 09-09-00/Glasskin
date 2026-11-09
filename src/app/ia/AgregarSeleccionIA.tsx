"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useCarrito } from "@/components/CarritoProvider";
import { useFormatearPrecio } from "@/lib/useFormatearPrecio";

interface ProductoSeleccion {
  id: number;
  slug: string;
  nombre: string;
  marca: string;
  precio: number;
  imagen?: string | null;
}

type ProductoVerificado = Omit<ProductoSeleccion, "imagen"> & { imagen: string | null; stock: number };

export function AgregarSeleccionIA({ productos, presupuestoMax, etiqueta }: { productos: ProductoSeleccion[]; presupuestoMax?: number; etiqueta: string }) {
  const { agregar, items, listo } = useCarrito();
  const formatearPrecio = useFormatearPrecio();
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [agregado, setAgregado] = useState(false);
  const ejecucionActiva = useRef(false);
  const unicos = [...new Map(productos.map((producto) => [producto.id, producto])).values()];

  async function agregarSeleccion() {
    if (!listo || ejecucionActiva.current || unicos.length === 0) return;
    ejecucionActiva.current = true;
    setProcesando(true);
    setMensaje("");
    setAgregado(false);
    try {
      const response = await fetch("/api/carrito/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: unicos.map((producto) => producto.id), ...(presupuestoMax !== undefined ? { presupuestoMax } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo verificar la selección");
      if (data.presupuestoCambiado) {
        setMensaje("Los precios cambiaron y la selección supera tu presupuesto. Genera otra recomendación antes de agregarla.");
        return;
      }
      const verificados = data.productos as ProductoVerificado[];
      const existentes = new Set(items.map((item) => item.id));
      let cantidadAgregada = 0;
      let yaEnCarrito = 0;
      for (const producto of verificados) {
        if (existentes.has(producto.id)) {
          yaEnCarrito += 1;
          continue;
        }
        agregar(producto, 1);
        cantidadAgregada += 1;
      }
      const sinStock = Number(data.noDisponibles ?? 0);
      const partes = [`${cantidadAgregada} agregado${cantidadAgregada === 1 ? "" : "s"}`];
      if (yaEnCarrito) partes.push(`${yaEnCarrito} ya estaba${yaEnCarrito === 1 ? "" : "n"} en el carrito`);
      if (sinStock) partes.push(`${sinStock} sin stock, omitido${sinStock === 1 ? "" : "s"}`);
      setMensaje(`${partes.join(" · ")}. Total verificado: ${formatearPrecio(Number(data.total))}.`);
      setAgregado(cantidadAgregada > 0 || yaEnCarrito > 0);
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo agregar la selección");
    } finally {
      ejecucionActiva.current = false;
      setProcesando(false);
    }
  }

  if (!unicos.length) return null;
  return <div className="mt-6 rounded-2xl border border-[#203128]/10 bg-white p-4 sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-5"><div><p className="font-semibold text-[#203128]">{etiqueta}</p><p className="mt-1 text-xs leading-5 text-stone-500">{unicos.length} producto{unicos.length === 1 ? "" : "s"} único{unicos.length === 1 ? "" : "s"}. Se vuelve a comprobar stock y precio antes de agregarlos.</p>{mensaje && <p role="status" className="mt-2 text-xs font-semibold text-[#3f806e]">{mensaje}</p>}</div><div className="mt-3 flex shrink-0 flex-wrap gap-2 sm:mt-0"><button type="button" onClick={() => void agregarSeleccion()} disabled={!listo || procesando} className="min-h-10 rounded-full bg-[#203128] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#3f806e] disabled:opacity-50">{procesando ? "Verificando…" : agregado ? "Actualizar selección" : `Agregar ${unicos.length} al carrito`}</button>{agregado && <Link href="/carrito" className="inline-flex min-h-10 items-center rounded-full border border-[#203128]/15 px-4 py-2 text-xs font-bold text-[#203128] hover:bg-[#edf3ef]">Ver carrito →</Link>}</div></div>;
}
