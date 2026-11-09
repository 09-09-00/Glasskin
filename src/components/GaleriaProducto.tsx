"use client";

// ============================================================
//  Galería de producto con lightbox (componente cliente)
// ============================================================
import { useState } from "react";
import { ImagenProducto } from "./ImagenProducto";

interface ImagenProducto {
  id: number;
  url: string;
  alt: string | null;
  blurDataUrl?: string | null;
  width?: number | null;
  height?: number | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  license?: string | null;
}

/** Placeholder con la marca cuando no hay imágenes */
function PlaceholderMarca({ marca }: { marca: string }) {
  return (
    <div className="aspect-square w-full flex flex-col items-center justify-center bg-white border border-stone-200 rounded-3xl">
      <span className="text-6xl mb-2">🧴</span>
      <span className="text-sm font-medium text-stone-500">{marca}</span>
      <span className="text-xs text-stone-400 mt-1">Sin imágenes disponibles</span>
    </div>
  );
}

export function GaleriaProducto({ imagenes, marca, imagenFallback }: { imagenes: ImagenProducto[]; marca: string; imagenFallback?: string | null }) {
  const [abierta, setAbierta] = useState(false);
  const [indice, setIndice] = useState(0);
  const fotosReales = imagenes.filter((imagen) => !imagen.url.toLowerCase().endsWith(".svg"));
  const fotos = fotosReales.length > 0
    ? fotosReales
    : imagenes.length > 0
      ? imagenes
    : imagenFallback
      ? [{ id: -1, url: imagenFallback, alt: `Presentación de ${marca}` }]
      : [];

  if (fotos.length === 0) {
    return <PlaceholderMarca marca={marca} />;
  }

  const principal = fotos[indice] ?? fotos[0];

  return (
    <div className="relative">
      {/* Imagen principal */}
      <div className="relative cursor-zoom-in overflow-hidden rounded-3xl border border-[#203128]/10 bg-white soft-shadow" onClick={() => setAbierta(true)}>
        <ImagenProducto
          src={principal.url}
          alt={principal.alt ?? `Imagen de ${marca}`}
          blurDataURL={principal.blurDataUrl}
          width={principal.width ?? 900}
          height={principal.height ?? 900}
          className="aspect-square w-full scale-[1.04] object-contain transition-transform duration-500 hover:scale-[1.06]"
          priority
        />
        {fotos.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-stone-700 shadow">
              {fotos.length} fotos · Click para ampliar
            </span>
          </div>
        )}
      </div>

      {/* Miniaturas */}
      {fotos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {fotos.map((img, i) => (
            <button
              key={img.id}
              onClick={() => { setIndice(i); setAbierta(true); }}
              className={`flex-shrink-0 h-16 w-16 rounded-lg border-2 overflow-hidden bg-white transition ${
                i === indice ? "border-[#3f806e]" : "border-stone-200 hover:border-[#3f806e]/50"
              }`}
              aria-label={`Ver imagen ${i + 1}`}
            >
              <ImagenProducto src={img.url} alt={img.alt ?? `Imagen ${i + 1}`} blurDataURL={img.blurDataUrl} width={64} height={64} className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}

      {principal.sourceName && principal.sourceUrl && (
        <p className="mt-3 text-xs text-stone-400">
          Foto: <a href={principal.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#3f806e] underline underline-offset-2">{principal.sourceName}</a>
          {principal.license ? ` · ${principal.license}` : ""}
        </p>
      )}

      {/* Lightbox */}
      {abierta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white p-4" onClick={() => setAbierta(false)}>
          <button
            onClick={(e) => { e.stopPropagation(); setAbierta(false); }}
            className="absolute top-4 right-4 text-stone-500 hover:text-stone-900 text-3xl"
            aria-label="Cerrar"
          >
            ✕
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIndice((i) => (i - 1 + fotos.length) % fotos.length); }}
            className="absolute left-4 text-stone-500 hover:text-stone-900 text-4xl"
            aria-label="Anterior"
          >
            ‹
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIndice((i) => (i + 1) % fotos.length); }}
            className="absolute right-4 text-stone-500 hover:text-stone-900 text-4xl"
            aria-label="Siguiente"
          >
            ›
          </button>
          <div className="max-w-4xl max-h-[85vh]">
            <ImagenProducto
              src={fotos[indice].url}
              alt={fotos[indice].alt ?? `Imagen ${indice + 1}`}
              blurDataURL={fotos[indice].blurDataUrl}
              width={fotos[indice].width ?? 1200}
              height={fotos[indice].height ?? 1200}
              className="max-w-full max-h-[80vh] object-contain"
            />
            <p className="text-center text-stone-600 text-sm mt-2">
              {indice + 1} / {fotos.length} {fotos[indice].alt && `· ${fotos[indice].alt}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
