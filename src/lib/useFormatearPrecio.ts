"use client";

// ============================================================
//  Hook para formatear precios en componentes cliente
//  Usa el contexto de moneda y la tasa desde la BD (via API)
// ============================================================
import { useEffect, useState } from "react";
import { convertir, formatearPrecio as formatearPrecioMoneda } from "./moneda";
import { useMoneda } from "./moneda-provider";

const TASA_DEFAULT = 7500;
let solicitudTasa: Promise<number> | null = null;

function cargarTasa(): Promise<number> {
  solicitudTasa ??= fetch("/api/configuracion/tasa")
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => (Number.isFinite(data.tasa) ? Number(data.tasa) : TASA_DEFAULT))
    .catch(() => TASA_DEFAULT);
  return solicitudTasa;
}

export function useFormatearPrecio() {
  const { moneda, cargado } = useMoneda();
  const [tasa, setTasa] = useState(TASA_DEFAULT);

  // Cargar tasa desde la API
  useEffect(() => {
    if (!cargado) return;
    let vigente = true;
    cargarTasa().then((valor) => {
      if (vigente) setTasa(valor);
    });
    return () => {
      vigente = false;
    };
  }, [cargado]);

  return (valorUSD: number): string => {
    if (!cargado) return "$ " + valorUSD.toFixed(2); // Fallback rápido
    return formatearPrecioMoneda(convertir(valorUSD, moneda, tasa), moneda);
  };
}
