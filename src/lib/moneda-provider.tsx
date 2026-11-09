"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { leerMonedaCookie, escribirMonedaCookie, type Moneda } from "@/lib/cookie";

interface MonedaContextType {
  moneda: Moneda;
  cambiarMoneda: (nueva: Moneda) => void;
  cargado: boolean;
}

const MonedaContext = createContext<MonedaContextType | null>(null);

export function MonedaProvider({ children }: { children: ReactNode }) {
  const [moneda, setMoneda] = useState<Moneda>("USD");
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    setMoneda(leerMonedaCookie());
    setCargado(true);
  }, []);

  function cambiarMoneda(nueva: Moneda) {
    setMoneda(nueva);
    escribirMonedaCookie(nueva);
    window.location.reload();
  }

  return (
    <MonedaContext.Provider value={{ moneda, cambiarMoneda, cargado }}>
      {children}
    </MonedaContext.Provider>
  );
}

export function useMoneda() {
  const ctx = useContext(MonedaContext);
  if (!ctx) throw new Error("useMoneda debe usarse dentro de <MonedaProvider>");
  return ctx;
}