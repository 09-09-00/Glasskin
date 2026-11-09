"use client";

// ============================================================
//  Checkout: datos del cliente + resumen del carrito
//  Crea la orden en la base de datos (sin pago real por ahora)
// ============================================================
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCarrito } from "@/components/CarritoProvider";
import { useFormatearPrecio } from "@/lib/useFormatearPrecio";
import { TIENDA } from "@/lib/config";
import { MapaEntrega, type CoordenadasEntrega } from "./MapaEntrega";

type TipoEntrega = "delivery" | "retiro";
type ConfigEntrega = { direccionRetiro: string; retiroConfigurado: boolean; costoDeliveryUsd: number; envioGratisDesdeUsd: number };
const CONFIG_ENTREGA_DEFAULT: ConfigEntrega = { direccionRetiro: TIENDA.ubicacion, retiroConfigurado: false, costoDeliveryUsd: 0, envioGratisDesdeUsd: 0 };

interface ErroresFormulario {
  [campo: string]: string | undefined;
}

export default function Checkout() {
  const { items, total, cantidadTotal, vaciar, listo } = useCarrito();
  const formatearPrecio = useFormatearPrecio();
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [datosPerfil, setDatosPerfil] = useState({ nombre: "", email: "", telefono: "" });
  const [recordatorioActivo, setRecordatorioActivo] = useState(false);
  const [frecuenciaRecordatorio, setFrecuenciaRecordatorio] = useState<30 | 60 | 90>(60);
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>("delivery");
  const [coordenadas, setCoordenadas] = useState<CoordenadasEntrega | null>(null);
  const [configEntrega, setConfigEntrega] = useState(CONFIG_ENTREGA_DEFAULT);

  useEffect(() => {
    let activo = true;
    fetch("/api/cuenta/perfil", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (activo && data?.account) setDatosPerfil({ nombre: data.account.nombre, email: data.account.email, telefono: data.account.telefono ?? "" });
      })
      .catch(() => undefined);
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    let activo = true;
    fetch("/api/configuracion/entrega", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (activo && data) setConfigEntrega(data); })
      .catch(() => undefined);
    return () => { activo = false; };
  }, []);

  const envioGratis = tipoEntrega === "delivery" && (configEntrega.envioGratisDesdeUsd <= 0 || total >= configEntrega.envioGratisDesdeUsd);
  const costoEnvio = tipoEntrega === "retiro" || envioGratis ? 0 : configEntrega.costoDeliveryUsd;
  const totalFinal = total + costoEnvio;

  /** Validación del formulario en el cliente antes de enviar. */
  function validar(nombre: string, email: string, direccion: string, metodo: TipoEntrega): ErroresFormulario {
    const errores: ErroresFormulario = {};
    if (nombre.trim().length < 2) errores.nombre = "Escribe tu nombre completo.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errores.email = "Escribe un correo electrónico válido.";
    if (metodo === "delivery" && direccion.trim().length < 5) errores.direccion = "Escribe una dirección de entrega válida.";
    return errores;
  }

  async function alEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorGeneral("");

    const datos = new FormData(e.currentTarget);
    const nombre = String(datos.get("nombre") ?? "");
    const email = String(datos.get("email") ?? "");
    const telefono = String(datos.get("telefono") ?? "");
    const direccion = String(datos.get("direccion") ?? "");
    const notas = String(datos.get("notas") ?? "");

    // Validar en el cliente
    const erroresCliente = validar(nombre, email, direccion, tipoEntrega);
    if (Object.keys(erroresCliente).length > 0) {
      setErrores(erroresCliente);
      const primero = Object.keys(erroresCliente)[0];
      const selector = `#${primero}`;
      requestAnimationFrame(() => document.querySelector<HTMLElement>(selector)?.focus({ preventScroll: false }));
      return;
    }
    setErrores({});

    // Enviar al servidor (los precios reales se calculan allí)
    setEnviando(true);
    try {
      const respuesta = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente: { nombre, email, telefono: telefono || undefined },
          items: items.map((i) => ({ id: i.id, cantidad: i.cantidad })),
          direccionEnvio: direccion,
          tipoEntrega,
          latitudEntrega: tipoEntrega === "delivery" ? coordenadas?.latitud : null,
          longitudEntrega: tipoEntrega === "delivery" ? coordenadas?.longitud : null,
          notas: notas || undefined,
          frecuenciaRecordatorio: recordatorioActivo ? frecuenciaRecordatorio : null,
        }),
      });

      const cuerpo = await respuesta.json().catch(() => null);

      if (!respuesta.ok) {
        // Errores de validación del servidor
        if (cuerpo?.errores && typeof cuerpo.errores === "object") {
          setErrores(cuerpo.errores);
        }
        setErrorGeneral(cuerpo?.error ?? "No se pudo crear el pedido. Intenta de nuevo.");
        setEnviando(false);
        return;
      }

      // Éxito: vaciar el carrito e ir a la confirmación
      vaciar();
      router.push(`/checkout/exito?numero=${encodeURIComponent(cuerpo.numero)}&email=${encodeURIComponent(cuerpo.email ?? email.trim().toLowerCase())}`);
    } catch {
      setErrorGeneral("Error de conexión. Revisa tu internet e intenta de nuevo.");
      setEnviando(false);
    }
  }

  if (!listo) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-stone-400">
        Cargando checkout...
      </div>
    );
  }

  // Sin productos en el carrito
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <span className="text-4xl">🛒</span>
        <p className="mt-4 font-semibold text-stone-900">Tu carrito está vacío</p>
        <Link
          href="/catalogo"
          className="mt-6 inline-block rounded-full bg-[#3f806e] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#2c5e50]"
        >
          Explorar catálogo
        </Link>
      </div>
    );
  }

  const claseInput =
    "w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-[#3f806e] focus:outline-none";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold text-stone-900 sm:text-4xl">Finalizar compra</h1>
      <p className="mt-2 text-sm text-stone-500">
        Completa tus datos para crear el pedido. Sin pago real por ahora.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* ---------- Formulario ---------- */}
        <form onSubmit={alEnviar} noValidate className="space-y-4">
          {errorGeneral && (
            <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {errorGeneral}
            </p>
          )}

          <div>
            <label htmlFor="nombre" className="mb-1 block text-sm font-semibold text-stone-700">
              Nombre completo *
            </label>
            <input id="nombre" name="nombre" type="text" value={datosPerfil.nombre} onChange={(event) => setDatosPerfil({ ...datosPerfil, nombre: event.target.value })} className={claseInput} placeholder="Ej: Ana García" />
            {errores.nombre && <p className="mt-1 text-xs text-red-600">{errores.nombre}</p>}
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold text-stone-700">
              Correo electrónico *
            </label>
            <input id="email" name="email" type="email" value={datosPerfil.email} onChange={(event) => setDatosPerfil({ ...datosPerfil, email: event.target.value })} className={claseInput} placeholder="ana@ejemplo.com" />
            {errores.email && <p className="mt-1 text-xs text-red-600">{errores.email}</p>}
          </div>

          <div>
            <label htmlFor="telefono" className="mb-1 block text-sm font-semibold text-stone-700">
              Teléfono (opcional)
            </label>
            <input id="telefono" name="telefono" type="tel" value={datosPerfil.telefono} onChange={(event) => setDatosPerfil({ ...datosPerfil, telefono: event.target.value })} className={claseInput} placeholder="+1 555 000 0000" />
            {errores.telefono && <p className="mt-1 text-xs text-red-600">{errores.telefono}</p>}
          </div>

          <fieldset className="rounded-2xl border border-stone-200 bg-white p-4">
            <legend className="px-1 text-sm font-semibold text-stone-700">¿Cómo quieres recibirlo?</legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${tipoEntrega === "delivery" ? "border-[#3f806e] bg-[#edf3ef]" : "border-stone-200"}`}>
                <input type="radio" name="tipoEntrega" value="delivery" checked={tipoEntrega === "delivery"} onChange={() => setTipoEntrega("delivery")} className="mt-1 accent-[#3f806e]" />
                <span><strong className="block text-sm text-[#203128]">Delivery</strong><span className="mt-1 block text-xs leading-5 text-stone-500">Indicá tu dirección. Si puedes, marca también el punto para facilitar la entrega.</span></span>
              </label>
              <label className={`flex gap-3 rounded-xl border p-4 ${configEntrega.retiroConfigurado ? "cursor-pointer" : "cursor-not-allowed opacity-60"} ${tipoEntrega === "retiro" ? "border-[#3f806e] bg-[#edf3ef]" : "border-stone-200"}`}>
                <input type="radio" name="tipoEntrega" value="retiro" checked={tipoEntrega === "retiro"} disabled={!configEntrega.retiroConfigurado} onChange={() => { setTipoEntrega("retiro"); setErrores({}); }} className="mt-1 accent-[#3f806e]" />
                <span><strong className="block text-sm text-[#203128]">Retiro en el local</strong><span className="mt-1 block text-xs leading-5 text-stone-500">{configEntrega.retiroConfigurado ? `Sin costo · ${configEntrega.direccionRetiro}` : "El local debe configurar su dirección completa antes de habilitar el retiro."}</span></span>
              </label>
            </div>
          </fieldset>

          {tipoEntrega === "delivery" && <>
            <div>
              <label htmlFor="direccion" className="mb-1 block text-sm font-semibold text-stone-700">Dirección de entrega *</label>
              <input id="direccion" name="direccion" type="text" className={claseInput} placeholder="Calle, número, barrio y ciudad" />
              {errores.direccion && <p className="mt-1 text-xs text-red-600">{errores.direccion}</p>}
            </div>
            <MapaEntrega value={coordenadas} onChange={(punto) => { setCoordenadas(punto); setErrores((actuales) => ({ ...actuales, mapa: undefined })); }} />
          </>}

          <div>
            <label htmlFor="notas" className="mb-1 block text-sm font-semibold text-stone-700">
              Notas (opcional)
            </label>
            <textarea
              id="notas"
              name="notas"
              rows={3}
              className={claseInput}
              placeholder="Indicaciones para la entrega..."
            />
          </div>

          <div className="rounded-2xl border border-[#3f806e]/20 bg-[#edf3ef] p-4">
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-5 text-[#315141]">
              <input type="checkbox" checked={recordatorioActivo} onChange={(event) => setRecordatorioActivo(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#3f806e]" />
              <span><strong>Quiero recibir un recordatorio para reponer estos productos.</strong><span className="mt-1 block text-xs text-[#577565]">Es solo un aviso por correo; no se crearán pedidos ni cobros automáticos. Puedes pausarlo o cancelarlo desde Mi perfil.</span></span>
            </label>
            {recordatorioActivo && <label htmlFor="frecuenciaRecordatorio" className="mt-4 block text-xs font-bold text-[#315141]">¿Cada cuánto quieres el aviso?<select id="frecuenciaRecordatorio" value={frecuenciaRecordatorio} onChange={(event) => setFrecuenciaRecordatorio(Number(event.target.value) as 30 | 60 | 90)} className="mt-2 w-full rounded-xl border border-[#203128]/15 bg-white px-3 py-2.5 text-sm font-medium"><option value={30}>Cada 30 días</option><option value={60}>Cada 60 días</option><option value={90}>Cada 90 días</option></select></label>}
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-full bg-[#3f806e] py-3 text-sm font-semibold text-white transition hover:bg-[#2c5e50] disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {enviando ? "Creando pedido..." : `Crear pedido · ${formatearPrecio(totalFinal)}`}
          </button>
        </form>

        {/* ---------- Resumen del pedido ---------- */}
        <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="text-sm font-bold text-stone-900">Tu pedido</h2>
          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 text-sm">
                <span className="text-stone-600">
                  {item.cantidad}× {item.nombre}
                </span>
                <span className="shrink-0 font-semibold text-stone-900">
                  {formatearPrecio(item.precio * item.cantidad)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-stone-200 pt-4 text-sm">
            <div className="flex justify-between text-stone-600">
              <dt>Subtotal ({cantidadTotal})</dt>
              <dd>{formatearPrecio(total)}</dd>
            </div>
            <div className="flex justify-between text-stone-600">
              <dt>{tipoEntrega === "retiro" ? "Retiro" : "Delivery"}</dt>
              <dd className={envioGratis ? "font-semibold text-emerald-600" : ""}>
                {tipoEntrega === "retiro" ? "Sin costo" : envioGratis ? "Gratis" : formatearPrecio(configEntrega.costoDeliveryUsd)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-stone-200 pt-3 text-base font-bold text-stone-900">
              <dt>Total</dt>
              <dd>{formatearPrecio(totalFinal)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
