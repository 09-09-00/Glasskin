"use client";

// ============================================================
//  Panel admin - Configuración (Client Component)
//  Tasa de cambio USD → PYG editable
// ============================================================
import { useState } from "react";

interface Props {
  tasaInicial: number;
  whatsappInicial: string;
  entregaInicial: { direccionRetiro: string; retiroConfigurado: boolean; costoDeliveryUsd: number; envioGratisDesdeUsd: number; latitudLocal: number; longitudLocal: number };
}

export function SettingsClient({ tasaInicial, entregaInicial, whatsappInicial }: Props) {
  const [tasa, setTasa] = useState(tasaInicial);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [direccionRetiro, setDireccionRetiro] = useState(entregaInicial.direccionRetiro);
  const [costoDeliveryUsd, setCostoDeliveryUsd] = useState(entregaInicial.costoDeliveryUsd);
  const [envioGratisDesdeUsd, setEnvioGratisDesdeUsd] = useState(entregaInicial.envioGratisDesdeUsd);
  const [latitudLocal, setLatitudLocal] = useState(entregaInicial.latitudLocal);
  const [longitudLocal, setLongitudLocal] = useState(entregaInicial.longitudLocal);
  const [retiroConfigurado, setRetiroConfigurado] = useState(entregaInicial.retiroConfigurado);
  const [guardandoEntrega, setGuardandoEntrega] = useState(false);
  const [mensajeEntrega, setMensajeEntrega] = useState("");
  const [whatsapp, setWhatsapp] = useState(whatsappInicial);
  const [guardandoWhatsapp, setGuardandoWhatsapp] = useState(false);
  const [mensajeWhatsapp, setMensajeWhatsapp] = useState("");

  async function alGuardar() {
    setGuardando(true);
    try {
      const res = await fetch("/api/admin/settings/tasa", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasa }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setMensaje("✅ Tasa actualizada");
      setTimeout(() => setMensaje(""), 2000);
    } catch {
      setMensaje("❌ Error al guardar");
      setTimeout(() => setMensaje(""), 2000);
    }
    setGuardando(false);
  }

  async function guardarEntrega() {
    setGuardandoEntrega(true);
    setMensajeEntrega("");
    try {
      const res = await fetch("/api/admin/settings/entrega", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direccionRetiro, costoDeliveryUsd, envioGratisDesdeUsd, latitudLocal, longitudLocal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");
      setRetiroConfigurado(Boolean(data.retiroConfigurado));
      setMensajeEntrega("Configuración de entregas guardada.");
    } catch (error) {
      setMensajeEntrega(error instanceof Error ? error.message : "No se pudo guardar la configuración");
    } finally {
      setGuardandoEntrega(false);
    }
  }

  async function guardarWhatsapp() {
    setGuardandoWhatsapp(true);
    setMensajeWhatsapp("");
    try {
      const response = await fetch("/api/admin/settings/contacto", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar el número");
      setWhatsapp(data.whatsapp ?? "");
      setMensajeWhatsapp(data.whatsapp ? "Número guardado. El botón de WhatsApp ya está disponible en la tienda." : "Número quitado; el botón de WhatsApp quedó oculto.");
    } catch (error) {
      setMensajeWhatsapp(error instanceof Error ? error.message : "No se pudo guardar el número");
    } finally {
      setGuardandoWhatsapp(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-stone-900">Configuración</h2>
        <p className="mt-1 text-sm text-stone-500">
          Ajusta la tasa de conversión USD → PYG. Los precios se guardan en USD y se muestran convertidos.
        </p>
      </div>

      {mensaje && (
        <div className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{mensaje}</div>
      )}

      <div className="rounded-2xl border border-stone-200 bg-white p-6 max-w-md">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700" htmlFor="tasa">
              Tasa USD → PYG
            </label>
            <div className="flex items-center gap-3">
              <input
                id="tasa"
                type="number"
                min="1"
                max="20000"
                step="1"
                value={tasa}
                onChange={(e) => setTasa(Math.max(1, Math.min(20000, Number(e.target.value))))}
                className="flex-1 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-[#3f806e] focus:outline-none"
              />
              <span className="text-sm font-medium text-stone-500">Gs. por 1 USD</span>
            </div>
          </div>

          <div className="rounded-xl bg-stone-50 p-4">
            <p className="text-sm font-medium text-stone-700">Ejemplos de conversión:</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-stone-600">
              <div>USD 10 → <strong>Gs. {(10 * tasa).toLocaleString()}</strong></div>
              <div>USD 25 → <strong>Gs. {(25 * tasa).toLocaleString()}</strong></div>
              <div>USD 50 → <strong>Gs. {(50 * tasa).toLocaleString()}</strong></div>
              <div>USD 100 → <strong>Gs. {(100 * tasa).toLocaleString()}</strong></div>
            </div>
          </div>

          <button
            type="button"
            onClick={alGuardar}
            disabled={guardando}
            className="w-full rounded-full bg-[#3f806e] py-3 text-sm font-semibold text-white transition hover:bg-[#2c5e50] disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar tasa"}
          </button>
        </div>
      </div>

      <section className="max-w-2xl rounded-2xl border border-stone-200 bg-white p-6">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#3f806e]">Logística de la tienda</p>
        <h3 className="mt-1 font-display text-xl font-bold text-stone-900">Retiro y delivery</h3>
        <p className="mt-1 text-sm leading-6 text-stone-500">Configura el retiro y la ubicación de origen. El delivery queda gratis (umbral 0); la distancia desde este punto define una estimación orientativa de 1 a 3 días. La opción de retiro {retiroConfigurado ? "está habilitada" : "se habilitará al guardar una dirección completa del local"}.</p>
        {mensajeEntrega && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{mensajeEntrega}</p>}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-stone-700 sm:col-span-2">Dirección completa para retirar<input value={direccionRetiro} onChange={(event) => setDireccionRetiro(event.target.value)} minLength={5} maxLength={300} className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-normal text-stone-900 focus:border-[#3f806e] focus:outline-none" placeholder="Calle, número, ciudad" /></label>
          <label className="text-sm font-semibold text-stone-700">Costo de delivery (USD)<input type="number" min="0" max="500" step="0.01" value={costoDeliveryUsd} onChange={(event) => setCostoDeliveryUsd(Number(event.target.value))} className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-normal text-stone-900 focus:border-[#3f806e] focus:outline-none" /></label>
          <label className="text-sm font-semibold text-stone-700">Delivery gratis desde (USD; 0 = siempre gratis)<input type="number" min="0" max="5000" step="0.01" value={envioGratisDesdeUsd} onChange={(event) => setEnvioGratisDesdeUsd(Number(event.target.value))} className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-normal text-stone-900 focus:border-[#3f806e] focus:outline-none" /></label>
          <label className="text-sm font-semibold text-stone-700">Latitud del local<input type="number" min="-90" max="90" step="0.00001" value={latitudLocal} onChange={(event) => setLatitudLocal(Number(event.target.value))} className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-normal text-stone-900 focus:border-[#3f806e] focus:outline-none" /></label>
          <label className="text-sm font-semibold text-stone-700">Longitud del local<input type="number" min="-180" max="180" step="0.00001" value={longitudLocal} onChange={(event) => setLongitudLocal(Number(event.target.value))} className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-normal text-stone-900 focus:border-[#3f806e] focus:outline-none" /></label>
        </div>
        <button type="button" onClick={() => void guardarEntrega()} disabled={guardandoEntrega || direccionRetiro.trim().length < 5} className="mt-5 rounded-full bg-[#203128] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#3f806e] disabled:opacity-50">{guardandoEntrega ? "Guardando…" : "Guardar logística"}</button>
      </section>

      <section className="max-w-2xl rounded-2xl border border-emerald-200 bg-white p-6">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-700">Contacto directo</p>
        <h3 className="mt-1 font-display text-xl font-bold text-stone-900">WhatsApp de la tienda</h3>
        <p className="mt-1 text-sm leading-6 text-stone-500">Los clientes abrirán un chat con este número en WhatsApp o WhatsApp Web. No se conecta un bot ni se envían mensajes automáticamente.</p>
        {mensajeWhatsapp && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{mensajeWhatsapp}</p>}
        <label className="mt-5 block max-w-md text-sm font-semibold text-stone-700">Número con código de país<input type="tel" inputMode="tel" autoComplete="tel" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} maxLength={25} placeholder="+595 981 123456" className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-normal text-stone-900 focus:border-[#3f806e] focus:outline-none" /><span className="mt-1 block text-xs font-normal text-stone-500">Incluye el prefijo internacional, por ejemplo +595 para Paraguay. Déjalo vacío para ocultar el acceso.</span></label>
        <button type="button" onClick={() => void guardarWhatsapp()} disabled={guardandoWhatsapp} className="mt-5 rounded-full bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50">{guardandoWhatsapp ? "Guardando…" : "Guardar WhatsApp"}</button>
      </section>
    </div>
  );
}
