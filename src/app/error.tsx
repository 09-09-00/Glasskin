"use client";

import { useEffect } from "react";

export default function ErrorGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error de renderizado:", error);
  }, [error]);

  return (
    <section className="mx-auto max-w-xl px-6 py-24 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-rose-600">Conexión interrumpida</p>
      <h1 className="mt-4 font-display text-4xl font-semibold text-stone-900">
        No pudimos cargar el contenido
      </h1>
      <p className="mt-4 text-stone-600">
        Revisa tu conexión e inténtalo nuevamente. Tus datos y tu carrito no se perdieron.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-full bg-[#203128] px-6 py-3 text-sm font-bold text-white"
      >
        Reintentar
      </button>
    </section>
  );
}
