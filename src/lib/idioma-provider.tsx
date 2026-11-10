"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { IDIOMA_COOKIE, traducir, type Idioma } from "./idioma";

interface ContextoIdioma {
  idioma: Idioma;
  cambiarIdioma: (idioma: Idioma) => void;
  t: (clave: string) => string;
}

const IdiomaContext = createContext<ContextoIdioma | null>(null);

export function IdiomaProvider({ idioma, children }: { idioma: Idioma; children: ReactNode }) {
  const value = useMemo<ContextoIdioma>(() => ({
    idioma,
    cambiarIdioma(nuevoIdioma) {
      document.cookie = `${IDIOMA_COOKIE}=${nuevoIdioma}; Path=/; Max-Age=31536000; SameSite=Lax`;
      window.location.reload();
    },
    t: (clave) => traducir(idioma, clave),
  }), [idioma]);

  return <IdiomaContext.Provider value={value}>{children}</IdiomaContext.Provider>;
}

export function useIdioma() {
  const contexto = useContext(IdiomaContext);
  if (!contexto) throw new Error("useIdioma debe usarse dentro de <IdiomaProvider>");
  return contexto;
}
