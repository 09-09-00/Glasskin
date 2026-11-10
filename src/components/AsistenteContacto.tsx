"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useFormatearPrecio } from "@/lib/useFormatearPrecio";
import { useIdioma } from "@/lib/idioma-provider";

type Producto = { id: number; slug: string; nombre: string; marca: string; precio: number; imagen?: string | null };
type Mensaje = { role: "user" | "assistant"; content: string; productos?: Producto[]; enlaceCuenta?: boolean };

export function AsistenteContacto() {
  const formatearPrecio = useFormatearPrecio();
  const { idioma, t } = useIdioma();
  const sugerencias = ["chat.suggestionSensitive", "chat.suggestionShipping", "chat.suggestionPayment", "chat.suggestionRoutine", "chat.suggestionOrder"].map(t);
  const [abierto, setAbierto] = useState(false);
  const [entrada, setEntrada] = useState("");
  const [cargando, setCargando] = useState(false);
  const [solicitudAbierta, setSolicitudAbierta] = useState(false);
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
  const [mensajeSolicitud, setMensajeSolicitud] = useState("");
  const [mensajes, setMensajes] = useState<Mensaje[]>([{ role: "assistant", content: t("chat.welcome") }]);
  const [telefonoWhatsApp, setTelefonoWhatsApp] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [mensajes, cargando, abierto]);
  useEffect(() => {
    let activo = true;
    fetch("/api/configuracion/contacto", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (activo && typeof data?.whatsapp === "string") setTelefonoWhatsApp(data.whatsapp.replace(/\D/g, "")); })
      .catch(() => undefined);
    return () => { activo = false; };
  }, []);

  async function enviar(texto = entrada) {
    const pregunta = texto.trim();
    if (!pregunta || cargando) return;
    const historial: Mensaje[] = [...mensajes, { role: "user", content: pregunta }];
    setMensajes(historial);
    setEntrada("");
    setCargando(true);
    try {
      const response = await fetch("/api/soporte/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historial.slice(-8).map(({ role, content }) => ({ role, content })), language: idioma }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMensajes((actuales) => [...actuales, { role: "assistant", content: data.respuesta, productos: data.productos, enlaceCuenta: data.enlaceCuenta }]);
    } catch {
      setMensajes((actuales) => [...actuales, { role: "assistant", content: t("chat.offline") }]);
    } finally {
      setCargando(false);
    }
  }

  function enviarFormulario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void enviar();
  }

  async function solicitarSeguimiento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ultimaConsulta = [...mensajes].reverse().find((item) => item.role === "user")?.content;
    if (!ultimaConsulta) { setMensajeSolicitud(t("chat.needMessage")); return; }
    const ultimaRespuesta = [...mensajes].reverse().find((item) => item.role === "assistant")?.content ?? "";
    const form = new FormData(event.currentTarget);
    setEnviandoSolicitud(true);
    setMensajeSolicitud("");
    try {
      const response = await fetch("/api/soporte/solicitud", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre: form.get("nombre"), email: form.get("email"), telefono: form.get("telefono"), empresa: form.get("empresa"), consulta: ultimaConsulta, respuestaSugerida: ultimaRespuesta }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo enviar tu solicitud");
      setSolicitudAbierta(false);
      setMensajeSolicitud(`Listo. El equipo revisará tu consulta${data.numero ? ` (#${data.numero})` : ""}.`);
    } catch (error) {
      setMensajeSolicitud(error instanceof Error ? error.message : "No se pudo enviar tu solicitud");
    } finally {
      setEnviandoSolicitud(false);
    }
  }

  const enlaceWhatsApp = telefonoWhatsApp ? `https://wa.me/${telefonoWhatsApp}?text=${encodeURIComponent(`Glasskin · ${t("chat.person")}`)}` : null;

  return (
    <div className="fixed right-3 bottom-3 z-[70] flex flex-col items-end gap-2 sm:right-5 sm:bottom-5 sm:gap-3">
      {enlaceWhatsApp && <a href={enlaceWhatsApp} target="_blank" rel="noopener noreferrer" aria-label={t("chat.contact")} className="flex h-12 min-h-12 w-12 items-center justify-center gap-2 rounded-full bg-[#25D366] text-sm font-bold text-[#103b21] shadow-xl shadow-black/15 transition hover:bg-[#1fbd5b] sm:h-auto sm:w-auto sm:min-w-12 sm:px-5"><span aria-hidden="true">◉</span><span className="sr-only sm:not-sr-only">{t("chat.contact")}</span><span aria-hidden="true" className="hidden sm:inline">↗</span></a>}
      {abierto && <section aria-label="Chat de Glasskin" className="flex h-[min(620px,calc(100dvh-110px))] w-[min(390px,calc(100vw-32px))] flex-col overflow-hidden rounded-3xl border border-[#203128]/10 bg-[#fffefa] shadow-2xl shadow-[#203128]/20">
        <header className="flex items-center justify-between bg-[#203128] px-5 py-4 text-white">
          <div><p className="font-display text-lg font-semibold">{t("chat.title")}</p><p className="text-xs text-white/70">{t("chat.subtitle")}</p></div>
          <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar chat" className="grid h-9 w-9 place-items-center rounded-full text-xl hover:bg-white/10">×</button>
        </header>
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-[#fbf8f1] p-4" aria-live="polite">
          {mensajes.map((mensaje, index) => <div key={`${index}-${mensaje.role}`} className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${mensaje.role === "user" ? "ml-auto rounded-br-sm bg-[#dcebe7] text-[#203128]" : "rounded-bl-sm border border-[#203128]/8 bg-white text-[#405047]"}`}>
            <p className="whitespace-pre-wrap">{mensaje.content}</p>
            {mensaje.productos?.map((producto) => <Link key={producto.id} href={`/producto/${producto.slug}`} onClick={() => setAbierto(false)} className="mt-2 block rounded-xl border border-[#203128]/10 bg-[#fffefa] px-3 py-2 text-xs text-[#315141] hover:border-[#3f806e]"><span className="font-semibold">{producto.marca} · {producto.nombre}</span><span className="ml-2 font-bold">{formatearPrecio(producto.precio)}</span><span className="ml-1">→</span></Link>)}
            {mensaje.enlaceCuenta && <Link href="/cuenta" onClick={() => setAbierto(false)} className="mt-2 block rounded-xl border border-[#3f806e]/20 bg-[#edf3ef] px-3 py-2 text-xs font-bold text-[#315141] hover:border-[#3f806e]">Ir a Mi perfil →</Link>}
          </div>)}
          {cargando && <div className="w-fit rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-sm text-stone-500">{t("chat.typing")}</div>}
          {mensajes.length === 1 && <div className="flex flex-wrap gap-2 pt-1">{sugerencias.map((sugerencia) => <button key={sugerencia} type="button" onClick={() => void enviar(sugerencia)} className="rounded-full border border-[#3f806e]/25 bg-white px-3 py-2 text-left text-xs text-[#315141] hover:bg-[#edf3ef]">{sugerencia}</button>)}</div>}
        </div>
        <div className="px-4 pt-3">
          {!solicitudAbierta ? <button type="button" onClick={() => { setSolicitudAbierta(true); setMensajeSolicitud(""); }} className="text-xs font-bold text-[#3f806e] hover:underline">{t("chat.contactPerson")}</button> : <form onSubmit={solicitarSeguimiento} className="space-y-2 rounded-2xl border border-[#203128]/10 bg-[#fbf8f1] p-3"><p className="text-xs leading-5 text-stone-600">{t("chat.followUpInfo")}</p><input name="nombre" required minLength={2} maxLength={100} placeholder={t("chat.name")} autoComplete="name" className="w-full rounded-xl border border-[#203128]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#3f806e]" /><input name="email" type="email" required maxLength={254} placeholder={t("chat.email")} autoComplete="email" className="w-full rounded-xl border border-[#203128]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#3f806e]" /><input name="telefono" type="tel" maxLength={40} placeholder={t("chat.phone")} autoComplete="tel" className="w-full rounded-xl border border-[#203128]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#3f806e]" /><div aria-hidden="true" className="hidden"><label>Website<input name="empresa" tabIndex={-1} autoComplete="off" /></label></div><div className="flex gap-2"><button type="submit" disabled={enviandoSolicitud} className="rounded-full bg-[#203128] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{enviandoSolicitud ? t("chat.sending") : t("chat.submit")}</button><button type="button" onClick={() => setSolicitudAbierta(false)} className="rounded-full border border-[#203128]/15 px-4 py-2 text-xs font-semibold text-stone-600">{t("chat.cancel")}</button></div></form>}
          {mensajeSolicitud && <p role="status" className="mt-2 text-xs font-semibold text-[#315141]">{mensajeSolicitud}</p>}
        </div>
        {enlaceWhatsApp ? <a href={enlaceWhatsApp} target="_blank" rel="noreferrer" className="mx-4 mt-3 flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#e5f4e8] text-xs font-bold text-[#216b39] hover:bg-[#d8efdd]">{t("chat.direct")} <span aria-hidden="true">↗</span></a> : <p className="mx-5 mt-3 text-center text-[11px] leading-4 text-stone-500">{t("chat.contactMissing")}</p>}
        <form onSubmit={enviarFormulario} className="flex gap-2 border-t border-[#203128]/10 bg-white p-3">
          <label className="sr-only" htmlFor="glasskin-chat-input">{t("chat.placeholder")}</label>
          <input id="glasskin-chat-input" value={entrada} onChange={(event) => setEntrada(event.target.value)} placeholder={t("chat.placeholder")} maxLength={1000} className="min-w-0 flex-1 rounded-full border border-[#203128]/15 bg-[#fffefa] px-4 text-sm outline-none focus:border-[#3f806e]" />
          <button type="submit" disabled={!entrada.trim() || cargando} className="min-h-11 rounded-full bg-[#203128] px-4 text-sm font-bold text-white disabled:opacity-40">{t("chat.send")}</button>
        </form>
      </section>}
      <button type="button" onClick={() => setAbierto((actual) => !actual)} aria-expanded={abierto} className="flex h-12 min-h-12 w-12 items-center justify-center gap-2 rounded-full bg-[#203128] text-sm font-bold text-white shadow-xl shadow-[#203128]/25 transition hover:-translate-y-0.5 hover:bg-[#315141] sm:h-14 sm:w-auto sm:min-h-14 sm:px-5 sm:gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15 text-lg" aria-hidden="true">{abierto ? "×" : "✦"}</span><span className="sr-only sm:not-sr-only">{abierto ? t("chat.close") : t("chat.help")}</span>
      </button>
    </div>
  );
}
