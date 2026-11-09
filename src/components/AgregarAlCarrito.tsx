"use client";

// ============================================================
//  Selector de cantidad + botón para agregar al carrito
//  (usado en la página de detalle de producto)
// ============================================================
import { useState } from "react";
import { useCarrito, type ProductoCarrito } from "./CarritoProvider";

interface Props {
  producto: ProductoCarrito;
  stock: number;
}

export function AgregarAlCarrito({ producto, stock }: Props) {
  const { agregar } = useCarrito();
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);
  const agotado = stock <= 0;

  function alAgregar() {
    agregar(producto, cantidad);
    setAgregado(true);
    setTimeout(() => setAgregado(false), 2500);
  }

  return (
    <div className="space-y-3">
      {/* Selector de cantidad */}
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-full border border-stone-300">
          <button
            type="button"
            onClick={() => setCantidad(Math.max(1, cantidad - 1))}
            disabled={agotado}
            className="h-10 w-10 text-lg text-stone-600 transition hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Restar cantidad"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-semibold">{cantidad}</span>
          <button
            type="button"
            onClick={() => setCantidad(Math.min(Math.max(stock, 1), cantidad + 1))}
            disabled={agotado}
            className="h-10 w-10 text-lg text-stone-600 transition hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Sumar cantidad"
          >
            +
          </button>
        </div>
        <span className="text-xs text-stone-400">
          {agotado ? "Sin stock disponible" : `${stock} unidades disponibles`}
        </span>
      </div>

      {/* Botón principal */}
      <button
        type="button"
        onClick={alAgregar}
        disabled={agotado}
        className={`w-full rounded-full py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400 ${
          agregado ? "bg-emerald-600" : "bg-[#3f806e] hover:bg-[#2c5e50]"
        }`}
      >
        {agotado ? "Agotado" : agregado ? "✓ ¡Agregado al carrito!" : "Agregar al carrito"}
      </button>
    </div>
  );
}
