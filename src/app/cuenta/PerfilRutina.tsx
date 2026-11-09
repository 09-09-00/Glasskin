"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PREOCUPACIONES, TIPOS_PIEL } from "@/lib/constantes";

interface Props {
  tipoPiel: string | null;
  preocupaciones: string[];
  consentimiento: boolean;
  rutinaGuardadaAt: string | null;
  rutinaGuardada: string | null;
}

type PasoGuardado = { orden: number; nombre: string; productoNombre: string | null; instrucciones: string };
type RutinaGuardada = { manana: PasoGuardado[]; noche: PasoGuardado[] };

export function PerfilRutina({ tipoPiel, preocupaciones, consentimiento, rutinaGuardadaAt, rutinaGuardada }: Props) {
  const router = useRouter();
  const [habilitada, setHabilitada] = useState(consentimiento);
  const [piel, setPiel] = useState(tipoPiel ?? "mixta");
  const [seleccionadas, setSeleccionadas] = useState(preocupaciones);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  let rutina: RutinaGuardada | null = null;
  try {
    const parsed: unknown = rutinaGuardada ? JSON.parse(rutinaGuardada) : null;
    if (parsed && typeof parsed === "object" && "manana" in parsed && "noche" in parsed && Array.isArray(parsed.manana) && Array.isArray(parsed.noche)) rutina = parsed as RutinaGuardada;
  } catch { /* Una rutina anterior dañada no debe romper la página de cuenta. */ }

  function alternar(valor: string) {
    setSeleccionadas((actuales) => actuales.includes(valor) ? actuales.filter((item) => item !== valor) : [...actuales, valor]);
  }

  async function guardar() {
    setCargando(true);
    setMensaje("");
    try {
      const response = await fetch("/api/cuenta/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalizacion: { consentimiento: habilitada, ...(habilitada ? { tipoPiel: piel, preocupaciones: seleccionadas } : {}) } }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudieron guardar tus preferencias");
      setMensaje(habilitada ? "Preferencias guardadas. Glasskin las usará para personalizar tus recomendaciones." : "Memoria desactivada y preferencias eliminadas.");
      router.refresh();
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudieron guardar tus preferencias");
    } finally {
      setCargando(false);
    }
  }

  const input = "mt-2 w-full rounded-xl border border-[#203128]/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#3f806e]";
  return (
    <section className="mt-5 rounded-2xl border border-[#203128]/10 bg-white p-5 sm:p-6">
      <div className="max-w-3xl"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#3f806e]">Memoria del asistente</p><h2 className="mt-1 font-display text-2xl font-semibold text-[#203128]">Tu piel y tu rutina</h2><p className="mt-2 text-sm leading-6 text-stone-500">Si activas la memoria, guardaremos tu tipo de piel y tus prioridades para precargar futuras rutinas y conservar la última que guardes. Puedes desactivarla cuando quieras; al hacerlo, eliminamos esos datos.</p></div>

      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-[#edf3ef] p-4 text-sm leading-5 text-[#315141]"><input type="checkbox" checked={habilitada} onChange={(event) => { setHabilitada(event.target.checked); setMensaje(""); }} className="mt-0.5 h-4 w-4 accent-[#3f806e]" /><span><strong>Guardar mis preferencias para personalizar Glasskin Skin AI.</strong><span className="mt-1 block text-xs text-[#577565]">Tus preferencias pueden enviarse al proveedor de IA conectado cuando solicites una recomendación. No guardamos datos médicos ni hacemos diagnósticos.</span></span></label>

      {habilitada && <div className="mt-5 grid gap-5 sm:grid-cols-2"><label className="text-xs font-bold text-stone-600">Tipo de piel<select value={piel} onChange={(event) => setPiel(event.target.value)} className={input}>{TIPOS_PIEL.map((item) => <option key={item.valor} value={item.valor}>{item.etiqueta}</option>)}</select></label><fieldset><legend className="text-xs font-bold text-stone-600">Prioridades de cuidado</legend><div className="mt-2 flex flex-wrap gap-2">{PREOCUPACIONES.map((item) => <button key={item.valor} type="button" aria-pressed={seleccionadas.includes(item.valor)} onClick={() => alternar(item.valor)} className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${seleccionadas.includes(item.valor) ? "border-[#203128] bg-[#203128] text-white" : "border-[#203128]/15 text-[#405b4d] hover:border-[#3f806e]"}`}>{item.etiqueta}</button>)}</div></fieldset></div>}

      {habilitada && rutina && <div className="mt-5 rounded-xl border border-[#203128]/10 bg-[#fbf8f1] p-4"><h3 className="font-display text-lg font-semibold text-[#203128]">Última rutina guardada</h3><div className="mt-3 grid gap-4 sm:grid-cols-2">{([["Mañana", rutina.manana], ["Noche", rutina.noche]] as const).map(([momento, pasos]) => <div key={momento}><p className="text-xs font-bold uppercase tracking-wide text-[#3f806e]">{momento}</p><ul className="mt-2 space-y-2">{pasos.map((paso, index) => <li key={`${paso.orden}-${index}`} className="text-xs leading-5 text-stone-600"><strong className="text-[#203128]">{paso.nombre}</strong>{paso.productoNombre ? ` · ${paso.productoNombre}` : ""}: {paso.instrucciones}</li>)}</ul></div>)}</div></div>}

      <div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" disabled={cargando} onClick={() => void guardar()} className="rounded-full bg-[#203128] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#3f806e] disabled:opacity-50">{cargando ? "Guardando…" : habilitada ? "Guardar preferencias" : "Desactivar y borrar memoria"}</button>{rutinaGuardadaAt && habilitada && <span className="text-xs text-stone-500">Última rutina guardada el {new Date(rutinaGuardadaAt).toLocaleDateString("es-PY", { timeZone: "America/Asuncion" })}.</span>}{mensaje && <p role="status" className="w-full text-xs font-semibold text-[#3f806e]">{mensaje}</p>}</div>
    </section>
  );
}
