"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PREOCUPACIONES, TIPOS_PIEL } from "@/lib/constantes";
import { useFormatearPrecio } from "@/lib/useFormatearPrecio";
import { ImagenProducto } from "@/components/ImagenProducto";

type Producto = { id: number; slug: string; nombre: string; marca: string; precio: number; imagen?: string | null };
type Paso = { orden: number; nombre: string; instrucciones: string; producto: Producto | null };
type Rutina = { manana: Paso[]; noche: Paso[]; consejos: string[]; avisos: string[]; modo?: string };

const descripciones: Record<string, string> = {
  seca: "Suele sentirse tirante, opaca o con descamación.",
  grasa: "Presenta brillo frecuente y poros más visibles.",
  mixta: "Brillo en zona T y mejillas normales o secas.",
  sensible: "Reacciona con rojez, ardor o picazón fácilmente.",
  normal: "Se siente equilibrada la mayor parte del día.",
};

export default function DiagnosticoPage() {
  const [tipoPiel, setTipoPiel] = useState("mixta");
  const [preocupaciones, setPreocupaciones] = useState<string[]>([]);
  const [rutina, setRutina] = useState<Rutina | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const formatearPrecio = useFormatearPrecio();

  useEffect(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem("glasskin-perfil-piel") ?? "null");
      if (guardado?.tipoPiel) setTipoPiel(guardado.tipoPiel);
      if (Array.isArray(guardado?.preocupaciones)) setPreocupaciones(guardado.preocupaciones);
    } catch { /* perfil nuevo */ }
  }, []);

  function alternar(valor: string) {
    setPreocupaciones((actual) => actual.includes(valor) ? actual.filter((item) => item !== valor) : [...actual, valor].slice(0, 3));
  }

  async function generar() {
    setCargando(true);
    setError("");
    setRutina(null);
    try {
      localStorage.setItem("glasskin-perfil-piel", JSON.stringify({ tipoPiel, preocupaciones, actualizado: new Date().toISOString() }));
      const respuesta = await fetch("/api/ia/rutina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipoPiel, preocupaciones }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error ?? "No pudimos crear tu rutina");
      setRutina(datos);
      setTimeout(() => document.getElementById("mi-rutina")?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setCargando(false);
    }
  }

  function ListaRutina({ titulo, icono, pasos, tono }: { titulo: string; icono: string; pasos: Paso[]; tono: string }) {
    return (
      <div className={`rounded-[30px] p-6 sm:p-8 ${tono}`}>
        <p className="eyebrow text-[#3f806e]">{icono} {titulo}</p>
        <ol className="mt-6 space-y-5">
          {pasos.map((paso) => (
            <li key={`${titulo}-${paso.orden}`} className="grid grid-cols-[36px_1fr] gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/80 text-sm font-bold">{paso.orden}</span>
              <div>
                <p className="font-semibold">{paso.nombre}</p>
                <p className="mt-1 text-sm leading-6 text-stone-600">{paso.instrucciones}</p>
                {paso.producto && (
                  <Link href={`/producto/${paso.producto.slug}`} className="mt-3 flex items-center gap-3 rounded-2xl bg-white/75 p-3 transition hover:bg-white">
                    <ImagenProducto src={paso.producto.imagen} alt={paso.producto.nombre} width={56} height={56} className="h-14 w-14 rounded-xl bg-white object-contain p-0.5" />
                    <span className="min-w-0"><span className="block text-[10px] font-bold tracking-wider text-stone-400 uppercase">{paso.producto.marca}</span><span className="block truncate text-sm font-semibold">{paso.producto.nombre}</span><span className="text-xs font-bold text-[#3f806e]">{formatearPrecio(paso.producto.precio)}</span></span>
                    <span className="ml-auto">→</span>
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <main>
      <section className="border-b border-[#203128]/10 bg-[radial-gradient(circle_at_85%_20%,#e7f0eb_0,transparent_30%),linear-gradient(135deg,#fbf8f1,#fbf8f1_70%)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div>
            <p className="eyebrow text-[#3f806e]">Diagnóstico Glasskin</p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-[.95] tracking-tight sm:text-7xl">Una rutina que entiende tu piel.</h1>
            <p className="mt-6 max-w-xl leading-7 text-stone-600">Elegí cómo se siente tu piel y qué querés mejorar. Glasskin analiza el catálogo disponible, guarda tu perfil en este dispositivo y arma una rutina de mañana y noche.</p>
            <div className="mt-7 flex flex-wrap gap-2 text-xs font-semibold text-stone-600"><span className="rounded-full bg-white/70 px-4 py-2">✓ Menos de 1 minuto</span><span className="rounded-full bg-white/70 px-4 py-2">✓ Productos reales</span><span className="rounded-full bg-white/70 px-4 py-2">✓ Perfil guardado</span></div>
          </div>

          <div className="glass-panel rounded-[34px] p-5 sm:p-8">
            <div className="flex items-center justify-between"><p className="text-sm font-bold">1. ¿Cómo describís tu piel?</p><span className="text-xs text-stone-400">Elegí una</span></div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {TIPOS_PIEL.map((tipo) => (
                <button key={tipo.valor} type="button" onClick={() => setTipoPiel(tipo.valor)} className={`rounded-2xl border p-4 text-left transition ${tipoPiel === tipo.valor ? "border-[#3f806e] bg-[#e8f0e8] shadow-sm" : "border-[#203128]/10 bg-white/70 hover:border-[#3f806e]/50"}`}>
                  <span className="font-display text-xl font-semibold">{tipo.etiqueta}</span><span className="mt-1 block text-xs leading-5 text-stone-500">{descripciones[tipo.valor]}</span>
                </button>
              ))}
            </div>
            <div className="mt-7 flex items-center justify-between"><p className="text-sm font-bold">2. ¿Qué querés mejorar?</p><span className="text-xs text-stone-400">Hasta 3</span></div>
            <div className="mt-3 flex flex-wrap gap-2">
              {PREOCUPACIONES.map((item) => <button key={item.valor} type="button" onClick={() => alternar(item.valor)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${preocupaciones.includes(item.valor) ? "bg-[#203128] text-white" : "border border-[#203128]/10 bg-white text-stone-600 hover:border-[#3f806e]"}`}>{item.etiqueta}</button>)}
            </div>
            {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button type="button" onClick={generar} disabled={cargando} className="mt-7 w-full rounded-full bg-[#203128] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#3f806e] disabled:opacity-60">{cargando ? "Analizando catálogo…" : "Crear mi rutina personalizada →"}</button>
            <p className="mt-3 text-center text-[11px] leading-5 text-stone-400">Orientación cosmética. No diagnostica enfermedades ni sustituye a dermatología.</p>
          </div>
        </div>
      </section>

      {rutina && (
        <section id="mi-rutina" className="mx-auto max-w-7xl scroll-mt-28 px-5 py-16 sm:px-8 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow text-[#3f806e]">Perfil: piel {tipoPiel}</p><h2 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">Tu plan Glasskin</h2></div><Link href={`/catalogo?piel=${tipoPiel}`} className="rounded-full border border-[#203128]/15 px-5 py-2.5 text-sm font-bold">Ver todo para mi piel</Link></div>
          <div className="mt-9 grid gap-5 lg:grid-cols-2"><ListaRutina titulo="Mañana" icono="☀" pasos={rutina.manana} tono="bg-[#eee7d8]" /><ListaRutina titulo="Noche" icono="☾" pasos={rutina.noche} tono="bg-[#fbf8f1]" /></div>
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto]">
            <div className="rounded-[28px] bg-[#e8f0e8] p-7"><p className="text-sm font-bold">Consejos para empezar</p><ul className="mt-4 grid gap-3 sm:grid-cols-3">{rutina.consejos.map((consejo) => <li key={consejo} className="rounded-2xl bg-white/60 p-4 text-sm leading-6">{consejo}</li>)}</ul></div>
            <Link href="/ia" className="flex min-h-36 items-center justify-center rounded-[28px] bg-[#203128] px-8 text-center text-sm font-bold text-white">Hablar con Skin AI<br />y ajustar mi plan →</Link>
          </div>
        </section>
      )}
    </main>
  );
}
