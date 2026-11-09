"use client";

import { useState, type FormEvent } from "react";

const etiquetasPuntuacion: Record<number, string> = {
  1: "No me funcionó",
  2: "No me gustó mucho",
  3: "Estuvo bien",
  4: "Me gustó",
  5: "Me encantó",
};

export function FormularioResena({ orderId, productId, nombreProducto, yaExiste }: { orderId: number; productId: number; nombreProducto: string; yaExiste: boolean }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [guardada, setGuardada] = useState(yaExiste);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCargando(true);
    setError("");
    try {
      const response = await fetch("/api/cuenta/resenas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, productId, rating, comment }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar la reseña.");
      setGuardada(true);
      setComment("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la reseña.");
    } finally {
      setCargando(false);
    }
  }

  if (guardada) return <p role="status" className="mt-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">✓ Gracias por compartir tu experiencia. Tu reseña verificada ya aparece para otros clientes.</p>;

  return <form onSubmit={enviar} aria-label={`Opinar sobre ${nombreProducto}`} className="mt-3 rounded-2xl border border-[#203128]/10 bg-[#fbf8f1] p-4">
    <p className="text-sm font-bold text-[#203128]">¿Cómo te fue con {nombreProducto}?</p>
    <fieldset className="mt-3">
      <legend className="text-xs font-semibold text-stone-600">Elige tu puntuación</legend>
      <div className="mt-1 flex items-center gap-1" role="radiogroup" aria-label={`Puntuación para ${nombreProducto}`}>
        {[1, 2, 3, 4, 5].map((estrella) => (
          <label key={estrella} className="cursor-pointer rounded-md p-0.5">
            <input
              type="radio"
              name={`rating-${orderId}-${productId}`}
              value={estrella}
              checked={rating === estrella}
              onChange={() => setRating(estrella)}
              className="peer sr-only"
            />
            <span aria-hidden="true" className={`inline-block rounded-md px-0.5 text-3xl leading-none transition peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#3f806e] ${rating >= estrella ? "text-amber-500" : "text-stone-300"}`}>
              {rating >= estrella ? "★" : "☆"}
            </span>
            <span className="sr-only">{estrella} de 5 estrellas</span>
          </label>
        ))}
        <span aria-live="polite" className="ml-2 text-xs font-semibold text-stone-600">{rating}/5 · {etiquetasPuntuacion[rating]}</span>
      </div>
    </fieldset>
    <label htmlFor={`comment-${orderId}-${productId}`} className="mt-3 block text-xs font-semibold text-stone-600">Tu experiencia</label>
    <textarea
      id={`comment-${orderId}-${productId}`}
      value={comment}
      onChange={(event) => setComment(event.target.value)}
      required
      minLength={10}
      maxLength={1200}
      rows={3}
      placeholder="¿Qué te gustó del producto? ¿Cómo se sintió en tu piel?"
      className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#3f806e]"
    />
    <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
      <p className="text-[11px] text-stone-400">Mínimo 10 caracteres · máximo 1.200</p>
      <p className="text-[11px] text-stone-400">{comment.length}/1200</p>
    </div>
    {error && <p role="alert" className="mt-2 text-xs font-semibold text-red-700">{error}</p>}
    <button type="submit" disabled={cargando || comment.trim().length < 10} className="mt-3 rounded-full bg-[#203128] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#3f806e] disabled:cursor-not-allowed disabled:opacity-50">
      {cargando ? "Publicando…" : "Publicar reseña verificada"}
    </button>
    <p className="mt-2 text-[11px] leading-5 text-stone-500">La reseña se vincula a tu compra y otros clientes podrán verla en la ficha del producto.</p>
  </form>;
}
