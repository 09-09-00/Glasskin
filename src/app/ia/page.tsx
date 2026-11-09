"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { TIPOS_PIEL, PREOCUPACIONES } from "@/lib/constantes";
import { useFormatearPrecio } from "@/lib/useFormatearPrecio";
import { ImagenProducto } from "@/components/ImagenProducto";
import { AgregarSeleccionIA } from "./AgregarSeleccionIA";

type Modo = "buscar" | "rutina" | "presupuesto";

interface ProductoIA {
  id: number;
  slug: string;
  nombre: string;
  marca: string;
  categoria: string;
  precio: number;
  motivo?: string;
  imagen?: string | null;
}

interface PasoRutina {
  orden: number;
  nombre: string;
  producto: ProductoIA | null;
  instrucciones: string;
  esperaMinutos?: number;
}

interface ResultadoBuscar { productos: ProductoIA[]; explicacion: string; avisos: string[] }
interface ResultadoRutina { manana: PasoRutina[]; noche: PasoRutina[]; consejos: string[]; mejoras: string[]; avisos: string[] }
interface ResultadoPresupuesto { productos: ProductoIA[]; total: number; presupuesto: number; sobra: number; avisos: string[] }

const modos: Array<{ id: Modo; numero: string; etiqueta: string; detalle: string }> = [
  { id: "buscar", numero: "01", etiqueta: "Recomendaciones", detalle: "Contá qué necesitás" },
  { id: "rutina", numero: "02", etiqueta: "Rutina completa", detalle: "Mañana y noche" },
  { id: "presupuesto", numero: "03", etiqueta: "Por presupuesto", detalle: "Sin superar tu límite" },
];

const CLAVES_AVISO = ["no sustituye consejo médico", "dermatólogo", "cosméticos, no medicamentos", "catálogo actual"];

function tieneAvisoMedico(avisos: string[]) {
  return avisos.some((aviso) => CLAVES_AVISO.some((clave) => aviso.toLowerCase().includes(clave)));
}

function Avisos({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="border-l-2 border-[#a9c8b5] bg-[#fbf8f1] px-5 py-4 text-xs leading-6 text-[#547565]">
      {items.map((item, index) => <p key={index}>{item}</p>)}
    </div>
  );
}

function ProductoVisual({ producto, compacto = false }: { producto: ProductoIA; compacto?: boolean }) {
  const formatearPrecio = useFormatearPrecio();
  return (
    <Link href={`/producto/${producto.slug}`} className={`group overflow-hidden border border-[#203128]/10 bg-white transition hover:-translate-y-1 hover:border-[#3f806e]/40 hover:shadow-xl hover:shadow-[#203128]/10 ${compacto ? "grid grid-cols-[92px_1fr]" : "block"}`}>
      <div className={`relative overflow-hidden bg-white ${compacto ? "min-h-32" : "aspect-[4/4.5]"}`}>
        <ImagenProducto src={producto.imagen} alt={`${producto.marca} ${producto.nombre}`} fill sizes={compacto ? "92px" : "(max-width: 640px) 50vw, 25vw"} className="object-contain p-2 transition duration-500 group-hover:scale-[1.035]" />
      </div>
      <div className="p-4">
        <p className="text-[10px] font-bold tracking-[.12em] text-[#3f806e] uppercase">{producto.marca}</p>
        <h3 className="mt-1 line-clamp-2 font-display text-lg font-semibold leading-tight text-[#203128]">{producto.nombre}</h3>
        <p className="mt-2 text-sm font-bold text-[#203128]">{formatearPrecio(producto.precio)}</p>
        {producto.motivo && <p className="mt-2 line-clamp-3 text-xs leading-5 text-stone-500">{producto.motivo}</p>}
        <span className="mt-3 inline-block text-xs font-bold text-[#3f806e]">Ver producto →</span>
      </div>
    </Link>
  );
}

function BloqueRutina({ titulo, subtitulo, pasos, tono }: { titulo: string; subtitulo: string; pasos: PasoRutina[]; tono: string }) {
  return (
    <section className={`border border-[#203128]/10 p-5 sm:p-7 ${tono}`}>
      <p className="text-[10px] font-bold tracking-[.14em] text-[#3f806e] uppercase">{subtitulo}</p>
      <h2 className="mt-1 font-display text-3xl font-semibold text-[#203128]">{titulo}</h2>
      <ol className="mt-6 space-y-5">
        {pasos.map((paso) => (
          <li key={paso.orden} className="grid gap-3 border-t border-[#203128]/10 pt-5 sm:grid-cols-[36px_1fr]">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#203128] text-xs font-bold text-white">{String(paso.orden).padStart(2, "0")}</span>
            <div>
              <h3 className="font-display text-xl font-semibold text-[#203128]">{paso.nombre}</h3>
              <p className="mt-1 text-sm leading-6 text-stone-600">{paso.instrucciones}</p>
              {paso.esperaMinutos ? <p className="mt-1 text-xs font-semibold text-[#3f806e]">Esperá {paso.esperaMinutos} min antes del siguiente paso.</p> : null}
              {paso.producto ? <div className="mt-4 max-w-md"><ProductoVisual producto={paso.producto} compacto /></div> : <p className="mt-3 text-xs text-stone-400">No hay un producto compatible asignado.</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function AsistenteIA() {
  const [modo, setModo] = useState<Modo>("buscar");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [tipoPiel, setTipoPiel] = useState("mixta");
  const [preocupaciones, setPreocupaciones] = useState<string[]>([]);
  const [descripcion, setDescripcion] = useState("");
  const [presupuesto, setPresupuesto] = useState(50);
  const [resultadoBuscar, setResultadoBuscar] = useState<ResultadoBuscar | null>(null);
  const [resultadoRutina, setResultadoRutina] = useState<ResultadoRutina | null>(null);
  const [resultadoPresupuesto, setResultadoPresupuesto] = useState<ResultadoPresupuesto | null>(null);
  const [memoriaCargada, setMemoriaCargada] = useState(false);
  const [memoriaActiva, setMemoriaActiva] = useState(false);
  const [guardandoRutina, setGuardandoRutina] = useState(false);
  const [mensajeMemoria, setMensajeMemoria] = useState("");
  const formatearPrecio = useFormatearPrecio();

  const claseInput = "w-full border border-[#203128]/15 bg-[#fbf8f1] px-4 py-3.5 text-sm text-[#203128] outline-none transition focus:border-[#3f806e] focus:ring-4 focus:ring-[#3f806e]/10";

  useEffect(() => {
    let activa = true;
    fetch("/api/cuenta/perfil", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return null;
      const data = await response.json();
      return data.account as { consentimientoPersonalizacion?: boolean; tipoPiel?: string | null; preocupacionesPiel?: string };
    }).then((perfil) => {
      if (!activa || !perfil?.consentimientoPersonalizacion) return;
      if (perfil.tipoPiel) setTipoPiel(perfil.tipoPiel);
      try {
        const lista = JSON.parse(perfil.preocupacionesPiel ?? "[]");
        if (Array.isArray(lista)) setPreocupaciones(lista.filter((item): item is string => typeof item === "string"));
      } catch { /* Preferencias antiguas inválidas: se deja el formulario en sus valores iniciales. */ }
      setMemoriaActiva(true);
    }).catch(() => undefined).finally(() => { if (activa) setMemoriaCargada(true); });
    return () => { activa = false; };
  }, []);

  async function llamarAPI(endpoint: string, body: Record<string, unknown>) {
    setCargando(true);
    setError("");
    try {
      const response = await fetch(`/api/ia/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No pudimos generar la recomendación");
      return data;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Error de conexión");
      return null;
    } finally {
      setCargando(false);
    }
  }

  async function alBuscar(event: FormEvent) {
    event.preventDefault();
    if (!descripcion.trim()) return;
    const data = await llamarAPI("buscar", { descripcion });
    if (data?.ok) setResultadoBuscar(data);
  }

  async function alRutina(event: FormEvent) {
    event.preventDefault();
    const data = await llamarAPI("rutina", { tipoPiel, preocupaciones });
    if (data?.ok) setResultadoRutina(data);
  }

  async function guardarRutinaEnCuenta() {
    if (!resultadoRutina || !memoriaActiva || guardandoRutina) return;
    setGuardandoRutina(true);
    setMensajeMemoria("");
    try {
      const response = await fetch("/api/cuenta/perfil/rutina", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rutina: resultadoRutina }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar la rutina");
      setMensajeMemoria("Rutina guardada en tu perfil.");
    } catch (cause) {
      setMensajeMemoria(cause instanceof Error ? cause.message : "No se pudo guardar la rutina");
    } finally {
      setGuardandoRutina(false);
    }
  }

  async function alPresupuesto(event: FormEvent) {
    event.preventDefault();
    const data = await llamarAPI("rutina-presupuesto", { tipoPiel, presupuestoMax: presupuesto, preocupaciones });
    if (data?.ok) setResultadoPresupuesto(data);
  }

  function togglePreocupacion(valor: string) {
    setPreocupaciones((actuales) => actuales.includes(valor) ? actuales.filter((item) => item !== valor) : [...actuales, valor]);
  }

  function selectorPreocupaciones() {
    return (
      <div>
        <p className="mb-2 text-sm font-bold text-[#203128]">¿Qué querés mejorar?</p>
        <div className="flex flex-wrap gap-2">
          {PREOCUPACIONES.map((item) => (
            <button key={item.valor} type="button" onClick={() => togglePreocupacion(item.valor)} className={`min-h-11 rounded-full border px-4 text-xs font-semibold transition ${preocupaciones.includes(item.valor) ? "border-[#203128] bg-[#203128] text-white" : "border-[#203128]/15 bg-white text-[#405b4d] hover:border-[#3f806e]"}`}>
              {item.etiqueta}
            </button>
          ))}
        </div>
      </div>
    );
  }

  let formulario: ReactNode;
  if (modo === "buscar") {
    formulario = (
      <form onSubmit={alBuscar} className="space-y-5">
        <div><label className="mb-2 block text-sm font-bold text-[#203128]">Contanos cómo está tu piel hoy</label><textarea value={descripcion} onChange={(event) => setDescripcion(event.target.value)} rows={5} placeholder="Ej.: Tengo piel mixta, sensibilidad y marcas. Busco una rutina corta y suave." className={claseInput} /></div>
        <button type="submit" disabled={cargando || descripcion.trim().length < 10} className="min-h-12 w-full rounded-full bg-[#203128] px-6 text-sm font-bold text-white transition hover:bg-[#3f806e] disabled:cursor-not-allowed disabled:opacity-45">{cargando ? "Analizando el catálogo..." : "Encontrar mis productos"}</button>
      </form>
    );
  } else {
    formulario = (
      <form onSubmit={modo === "rutina" ? alRutina : alPresupuesto} className="space-y-5">
        <div><label className="mb-2 block text-sm font-bold text-[#203128]">Tipo de piel</label><select value={tipoPiel} onChange={(event) => setTipoPiel(event.target.value)} className={claseInput}>{TIPOS_PIEL.map((item) => <option key={item.valor} value={item.valor}>{item.etiqueta}</option>)}</select></div>
        {modo === "presupuesto" && <div><label className="mb-2 block text-sm font-bold text-[#203128]">Presupuesto máximo en USD</label><input type="number" min="10" max="500" step="5" value={presupuesto} onChange={(event) => setPresupuesto(Math.max(10, Math.min(500, Number(event.target.value))))} className={claseInput} /></div>}
        {selectorPreocupaciones()}
        <button type="submit" disabled={cargando} className="min-h-12 w-full rounded-full bg-[#203128] px-6 text-sm font-bold text-white transition hover:bg-[#3f806e] disabled:cursor-not-allowed disabled:opacity-45">{cargando ? "Diseñando tu rutina..." : modo === "rutina" ? "Crear rutina de mañana y noche" : "Crear rutina dentro del presupuesto"}</button>
      </form>
    );
  }

  const avisosActuales = resultadoBuscar?.avisos ?? resultadoRutina?.avisos ?? resultadoPresupuesto?.avisos ?? [];

  return (
    <div className="pb-20">
      <section className="relative min-h-[420px] overflow-hidden border-b border-[#203128]/10 bg-[#e5ece5]">
        <Image src="/images/brand/glasskin-hero.png" alt="Productos de skincare seleccionados por Glasskin" fill priority sizes="100vw" className="object-cover object-[70%_center]" />
        <div className="absolute inset-0 bg-white/25" />
        <div className="relative mx-auto flex min-h-[420px] max-w-7xl items-center px-5 py-14 sm:px-8">
          <div className="max-w-xl">
            <p className="eyebrow text-[#3f806e]">Glasskin Skin AI</p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-[.95] text-[#203128] sm:text-7xl">Tu rutina, explicada con claridad.</h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-[#405b4d]">Analiza tu tipo de piel, tus prioridades y tu presupuesto. Recomienda únicamente productos reales del catálogo Glasskin.</p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-5 pt-12 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-start">
          <aside className="lg:sticky lg:top-24">
            <p className="eyebrow text-[#3f806e]">Elegí una consulta</p>
            <div className="mt-4 grid gap-2">
              {modos.map((item) => (
                <button key={item.id} type="button" onClick={() => { setModo(item.id); setError(""); }} className={`grid min-h-16 grid-cols-[40px_1fr] items-center border px-4 text-left transition ${modo === item.id ? "border-[#203128] bg-[#203128] text-white" : "border-[#203128]/10 bg-white text-[#203128] hover:border-[#3f806e]"}`}>
                  <span className={`text-xs font-bold ${modo === item.id ? "text-white/60" : "text-[#3f806e]"}`}>{item.numero}</span><span><strong className="block text-sm">{item.etiqueta}</strong><small className={`block ${modo === item.id ? "text-white/60" : "text-stone-400"}`}>{item.detalle}</small></span>
                </button>
              ))}
            </div>
            <div className="mt-5 border border-[#203128]/10 bg-[#fbf8f1] p-5 text-sm leading-6 text-[#405b4d]"><strong className="block text-[#203128]">Siempre conectado al catálogo</strong>Las recomendaciones se validan por ID, precio y disponibilidad antes de mostrarse.</div>
            {modo === "rutina" && resultadoRutina && <div className="mt-3 rounded-xl border border-[#203128]/10 bg-white p-4"><p className="text-xs leading-5 text-stone-600">{memoriaActiva ? "Puedes guardar esta rutina en tu cuenta para consultarla después." : memoriaCargada ? "Activa la memoria de rutina en tu perfil para guardar y volver a consultar tus rutinas." : "Comprobando tu perfil…"}</p>{memoriaActiva ? <button type="button" onClick={() => void guardarRutinaEnCuenta()} disabled={guardandoRutina} className="mt-3 rounded-full bg-[#203128] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{guardandoRutina ? "Guardando…" : "Guardar esta rutina"}</button> : memoriaCargada && <Link href="/cuenta" className="mt-3 inline-block text-xs font-bold text-[#3f806e]">Ir a Mi perfil →</Link>}{mensajeMemoria && <p role="status" className="mt-2 text-xs font-semibold text-[#3f806e]">{mensajeMemoria}</p>}</div>}
          </aside>

          <section className="border border-[#203128]/10 bg-white p-5 shadow-xl shadow-[#203128]/5 sm:p-8">
            <div className="mb-7 border-b border-[#203128]/10 pb-5"><p className="text-[10px] font-bold tracking-[.14em] text-[#3f806e] uppercase">Consulta personalizada</p><h2 className="mt-2 font-display text-3xl font-semibold text-[#203128]">{modos.find((item) => item.id === modo)?.etiqueta}</h2></div>
            {error && <div className="mb-5 border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {formulario}
          </section>
        </div>

        {modo === "buscar" && resultadoBuscar && <section className="mt-12"><p className="eyebrow text-[#3f806e]">Selección personalizada</p><h2 className="mt-2 max-w-3xl font-display text-3xl font-semibold text-[#203128]">{resultadoBuscar.explicacion}</h2><div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{resultadoBuscar.productos.map((producto) => <ProductoVisual key={producto.id} producto={producto} />)}</div><AgregarSeleccionIA productos={resultadoBuscar.productos} etiqueta="Lleva esta selección al carrito" /><div className="mt-6"><Avisos items={resultadoBuscar.avisos} /></div></section>}

        {modo === "rutina" && resultadoRutina && <div className="mt-12 space-y-6"><div className="grid gap-6 lg:grid-cols-2"><BloqueRutina titulo="Rutina de mañana" subtitulo="Preparar y proteger" pasos={resultadoRutina.manana} tono="bg-[#edf2e9]" /><BloqueRutina titulo="Rutina de noche" subtitulo="Limpiar y reparar" pasos={resultadoRutina.noche} tono="bg-[#fbf8f1]" /></div><AgregarSeleccionIA productos={[...resultadoRutina.manana, ...resultadoRutina.noche].flatMap((paso) => paso.producto ? [paso.producto] : [])} etiqueta="Arma tu rutina completa" />{(resultadoRutina.consejos.length > 0 || resultadoRutina.mejoras.length > 0) && <div className="grid gap-4 sm:grid-cols-2"><div className="bg-[#fbf8f1] p-6"><h3 className="font-display text-2xl font-semibold">Claves para empezar</h3>{resultadoRutina.consejos.map((item, index) => <p key={index} className="mt-3 border-t border-[#203128]/10 pt-3 text-sm leading-6 text-stone-600">{item}</p>)}</div><div className="bg-[#e7f0eb] p-6"><h3 className="font-display text-2xl font-semibold">Cómo mejorarla</h3>{resultadoRutina.mejoras.length ? resultadoRutina.mejoras.map((item, index) => <p key={index} className="mt-3 border-t border-[#203128]/10 pt-3 text-sm leading-6 text-stone-600">{item}</p>) : <p className="mt-3 text-sm text-stone-600">La rutina ya cubre los pasos esenciales.</p>}</div></div>}<Avisos items={resultadoRutina.avisos} /></div>}

        {modo === "presupuesto" && resultadoPresupuesto && <section className="mt-12"><div className="grid divide-y divide-[#203128]/10 border border-[#203128]/10 bg-[#fbf8f1] sm:grid-cols-3 sm:divide-x sm:divide-y-0">{[["Total", resultadoPresupuesto.total], ["Presupuesto", resultadoPresupuesto.presupuesto], ["Disponible", resultadoPresupuesto.sobra]].map(([label, value]) => <div key={String(label)} className="p-6 text-center"><p className="font-display text-3xl font-semibold text-[#203128]">{formatearPrecio(Number(value))}</p><p className="mt-1 text-[10px] font-bold tracking-[.13em] text-[#3f806e] uppercase">{label}</p></div>)}</div><div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{resultadoPresupuesto.productos.map((producto) => <ProductoVisual key={producto.id} producto={producto} />)}</div><AgregarSeleccionIA productos={resultadoPresupuesto.productos} presupuestoMax={resultadoPresupuesto.presupuesto} etiqueta="Tu rutina lista dentro del presupuesto" /><div className="mt-6"><Avisos items={resultadoPresupuesto.avisos} /></div></section>}

        {!tieneAvisoMedico(avisosActuales) && <div className="mt-10 border-l-2 border-[#a9c8b5] bg-[#fbf8f1] px-5 py-4 text-xs leading-6 text-[#547565]"><strong>Información educativa.</strong> No reemplaza la evaluación profesional. Ante síntomas intensos o persistentes, consultá a un dermatólogo.</div>}
      </main>
    </div>
  );
}
