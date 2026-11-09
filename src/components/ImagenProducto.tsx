"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";

export const IMAGEN_PRODUCTO_FALLBACK = "/images/product-placeholder.svg";
export const BLUR_PRODUCTO =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxNicgaGVpZ2h0PScxNic+PHJlY3Qgd2lkdGg9JzE2JyBoZWlnaHQ9JzE2JyBmaWxsPScjRTdGMEVCJy8+PC9zdmc+";

type Props = Omit<ImageProps, "src" | "alt" | "placeholder" | "blurDataURL"> & {
  src?: string | null;
  alt: string;
  blurDataURL?: string | null;
};

export function ImagenProducto({ src, alt, blurDataURL, unoptimized, ...props }: Props) {
  const initial = src?.trim() || IMAGEN_PRODUCTO_FALLBACK;
  const [source, setSource] = useState(initial);

  useEffect(() => setSource(src?.trim() || IMAGEN_PRODUCTO_FALLBACK), [src]);

  const svg = source.toLowerCase().endsWith(".svg");
  const imagenRasterOriginal = /\.(png|jpe?g)$/i.test(source);
  const remote = /^https?:\/\//i.test(source);

  return (
    <Image
      {...props}
      src={source}
      alt={alt}
      placeholder={svg ? "empty" : "blur"}
      blurDataURL={blurDataURL || BLUR_PRODUCTO}
      // Las fotos fuente del catálogo se entregan sin
      // recomprimir evita que las etiquetas y los bordes se vean borrosos.
      unoptimized={unoptimized || svg || imagenRasterOriginal || remote}
      onError={() => setSource(IMAGEN_PRODUCTO_FALLBACK)}
    />
  );
}
