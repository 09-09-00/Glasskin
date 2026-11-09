"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Mensaje = { role: "user" | "assistant"; content: string };
type Resumen = {
  actualizado: string;
  moneda: string;
  indicadores: { productosActivos: number; pedidos: number; pedidosPendientes: number; pedidosPendientesMas24Horas: number; consultasAbiertas: number; consultasAbiertasMas24Horas: number; stockBajo: number; agotados: number; pedidosHoy: number; importePedidosHoy: number; pedidos30Dias: number; importePedidos30Dias: number };
  productosPorReponer: Array<{ id: number; nombre: string; stock: number; precio: number; brand: { nombre: string }; unidadesVendidas30Dias: number; unidadesPeriodoAnterior: number; diasDeStockEstimados: number | null; sugerenciaReposicion: number; demandaEnAumento: boolean; sinMovimiento30Dias: boolean }>;
  fichasIncompletas: Array<{ id: number; nombre: string; marca: string; faltantes: string[] }>;
  ultimosPedidos: Array<{ numero: string; estado: string; total: number; creado: string; articulos: Array<{ nombre: string; cantidad: number }> }>;
};

const consultas = ["¿Qué pedidos están pendientes?", "¿Qué consultas de clientes esperan respuesta?", "¿Qué productos debo reponer?", "¿Qué productos no se venden?", "¿Qué fichas de productos están incompletas?", "Resume las ventas de hoy"];
const moneda = (valor: number) => `USD ${valor.toLocaleString("es-PY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function CopilotoClient() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [iaDisponible, setIaDisponible] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([{ role: "assistant", content: "Hola, soy tu copiloto de Glasskin. Ya puedo consultar el estado actual de la tienda. ¿Qué quieres revisar?" }]);
  const [entrada, setEntrada] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [modoDatos, setModoDatos] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/admin/copiloto", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Error al cargar datos");
        setResumen(data.resumen);
        setIaDisponible(Boolean(data.iaDisponible));
        setModoDatos(!data.iaDisponible);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudo cargar el resumen"));
  }, []);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [mensajes, cargando]);

  async function enviar(texto = entrada) {
    const pregunta = texto.trim();
    if (!pregunta || cargando) return;
    const historial: Mensaje[] = [...mensajes, { role: "user", content: pregunta }];
    setMensajes(historial);
    setEntrada("");
    setCargando(true);
    setError("");
    try {
      const response = await fetch("/api/admin/copiloto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historial.slice(-8) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo consultar al copiloto");
      setMensajes((actuales) => [...actuales, { role: "assistant", content: data.respuesta }]);
      setModoDatos(data.modo !== "ia");
      const refresco = await fetch("/api/admin/copiloto", { cache: "no-store" });
      if (refresco.ok) setResumen((await refresco.json()).resumen);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo consultar al copiloto");
    } finally {
      setCargando(false);
    }
  }

  function enviarFormulario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void enviar();
  }

  const metricas = resumen?.indicadores;
  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#203128] px-6 py-8 text-white shadow-xl shadow-[#203128]/10 sm:px-9 sm:py-10">
        <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-[#78aa93]/25 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b8d7c5]">Glasskin · inteligencia para tu negocio</p>
            <h2 className="mt-3 font-display text-4xl font-semibold leading-tight sm:text-5xl">Tu copiloto de tienda.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">Consulta pedidos, ventas y reposición con información actual de tu sistema.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold">◉ Datos en vivo</span>
            <span className="rounded-full border border-[#b8d7c5]/30 bg-[#b8d7c5]/10 px-4 py-2 text-xs font-semibold text-[#d5eadc]">✦ Solo lectura</span>
          </div>
        </div>
      </section>

      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">{error}</div>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Pedidos pendientes", value: metricas?.pedidosPendientes, tone: "bg-[#f3ead7]", icon: "◷" },
          { label: "Importe de pedidos hoy", value: metricas ? moneda(metricas.importePedidosHoy) : "—", tone: "bg-[#e5f0e9]", icon: "↗" },
          { label: "Stock bajo", value: metricas?.stockBajo, tone: "bg-[#e8f1f1]", icon: "▤" },
          { label: "Consultas abiertas", value: metricas?.consultasAbiertas, tone: "bg-[#f5f1e8]", icon: "💬" },
        ].map((item) => <article key={item.label} className={`${item.tone} rounded-2xl p-4 sm:p-5`}><div className="flex items-center justify-between"><p className="text-xs font-semibold text-[#53675d]">{item.label}</p><span className="text-lg text-[#3f806e]">{item.icon}</span></div><p className="mt-3 font-display text-2xl font-semibold text-[#203128] sm:text-3xl">{item.value ?? "—"}</p></article>)}
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="overflow-hidden rounded-3xl border border-[#203128]/10 bg-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#203128]/10 px-5 py-4 sm:px-6">
            <div><h3 className="font-display text-xl font-semibold text-[#203128]">Conversación</h3><p className="mt-0.5 text-xs text-stone-500">Tus consultas son privadas y el copiloto no modifica registros.</p></div>
            <span className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${iaDisponible ? "bg-[#e5f0e9] text-[#315141]" : "bg-[#f3ead7] text-[#78623a]"}`}>{iaDisponible ? "IA conectada" : "Respuestas con datos"}</span>
          </header>
          <div ref={scrollRef} className="h-[390px] space-y-4 overflow-y-auto bg-[#fffefa] p-4 sm:h-[430px] sm:p-6" aria-live="polite">
            {mensajes.map((mensaje, index) => <div key={`${index}-${mensaje.role}`} className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${mensaje.role === "user" ? "ml-auto rounded-br-sm bg-[#203128] text-white" : "rounded-bl-sm border border-[#203128]/8 bg-[#f5f3ec] text-[#344b3e]"}`}>{mensaje.content}</div>)}
            {cargando && <div className="w-fit animate-pulse rounded-2xl rounded-bl-sm bg-[#f5f3ec] px-4 py-3 text-sm text-stone-500">Revisando los datos de Glasskin…</div>}
          </div>
          <div className="border-t border-[#203128]/10 bg-white p-4 sm:p-5">
            {mensajes.length === 1 && <div className="mb-3 flex flex-wrap gap-2">{consultas.map((consulta) => <button key={consulta} type="button" onClick={() => void enviar(consulta)} className="rounded-full border border-[#3f806e]/20 px-3 py-2 text-left text-xs font-semibold text-[#315141] transition hover:bg-[#eaf2ec]">{consulta}</button>)}</div>}
            <form onSubmit={enviarFormulario} className="flex gap-2">
              <label htmlFor="copiloto-pregunta" className="sr-only">Pregunta al copiloto</label>
              <input id="copiloto-pregunta" value={entrada} onChange={(event) => setEntrada(event.target.value)} maxLength={700} placeholder="Pregunta sobre pedidos, stock o ventas…" className="min-h-12 min-w-0 flex-1 rounded-full border border-[#203128]/15 bg-[#fffefa] px-5 text-sm outline-none transition focus:border-[#3f806e] focus:ring-4 focus:ring-[#3f806e]/10" />
              <button type="submit" disabled={!entrada.trim() || cargando} className="min-h-12 rounded-full bg-[#203128] px-5 text-sm font-bold text-white transition hover:bg-[#3f806e] disabled:opacity-40">Consultar</button>
            </form>
            {modoDatos && <p className="mt-3 text-[11px] text-stone-400">Las respuestas usan métricas directas del sistema. Configura NVIDIA_API_KEY para habilitar conversación generativa.</p>}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-3xl border border-[#203128]/10 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#3f806e]">Atención sugerida</p><h3 className="mt-1 font-display text-xl font-semibold text-[#203128]">Para revisar hoy</h3></div><span className="grid h-9 w-9 place-items-center rounded-full bg-[#f3ead7] text-[#806b40]">!</span></div>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-[#fbf8f1] p-4"><p className="text-sm font-semibold text-[#203128]">{metricas?.pedidosPendientes ?? "—"} pedidos esperan revisión</p><a href="/admin/pedidos?estado=pendiente" className="mt-2 inline-block text-xs font-bold text-[#3f806e] hover:underline">Abrir pedidos →</a></div>
              <div className="rounded-2xl bg-[#fbf8f1] p-4"><p className="text-sm font-semibold text-[#203128]">{metricas?.pedidosPendientesMas24Horas ?? "—"} pendientes llevan más de 24 horas</p><a href="/admin/pedidos?estado=pendiente" className="mt-2 inline-block text-xs font-bold text-[#3f806e] hover:underline">Priorizar seguimiento →</a></div>
              <div className="rounded-2xl bg-[#fbf8f1] p-4"><p className="text-sm font-semibold text-[#203128]">{metricas?.consultasAbiertasMas24Horas ?? "—"} clientes esperan respuesta hace más de 24 horas</p><a href="/admin/consultas" className="mt-2 inline-block text-xs font-bold text-[#3f806e] hover:underline">Abrir bandeja de consultas →</a></div>
              <div className="rounded-2xl bg-[#fbf8f1] p-4"><p className="text-sm font-semibold text-[#203128]">{metricas?.stockBajo ?? "—"} productos con menos de 5 unidades</p><a href="/admin/productos?stock=bajo" className="mt-2 inline-block text-xs font-bold text-[#3f806e] hover:underline">Revisar inventario →</a></div>
            </div>
            <p className="mt-4 rounded-xl border border-[#203128]/10 px-3 py-2 text-[11px] leading-5 text-stone-500">Sugerencias informativas. El copiloto no ejecuta cambios en tu tienda.</p>
          </section>

          <section className="rounded-3xl border border-[#203128]/10 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><h3 className="font-display text-lg font-semibold text-[#203128]">Reposición sugerida</h3><a href="/admin/productos?stock=bajo" className="text-xs font-bold text-[#3f806e]">Ver inventario</a></div>
            <div className="mt-3 divide-y divide-[#203128]/[.07]">
              {resumen?.productosPorReponer.slice(0, 7).map((producto) => <div key={producto.id} className="py-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#203128]">{producto.nombre}</p><p className="text-xs text-stone-400">{producto.brand.nombre} · vendió {producto.unidadesVendidas30Dias} en 30 días</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${producto.stock === 0 ? "bg-red-50 text-red-700" : "bg-[#f3ead7] text-[#806b40]"}`}>{producto.stock === 0 ? "Agotado" : `${producto.stock} u.`}</span></div><p className="mt-1 text-xs leading-5 text-stone-500">{producto.diasDeStockEstimados === null ? "Sin demanda reciente medida" : `Stock para ${producto.diasDeStockEstimados} días`} · Reposición sugerida: <strong className="text-[#315141]">{producto.sugerenciaReposicion} u.</strong></p>{producto.demandaEnAumento && <p className="mt-1 text-xs font-semibold text-emerald-700">↑ Demanda: {producto.unidadesPeriodoAnterior} → {producto.unidadesVendidas30Dias} unidades entre períodos</p>}{producto.sinMovimiento30Dias && <p className="mt-1 text-xs font-semibold text-amber-700">Sin ventas registradas en los últimos 30 días</p>}</div>)}
              {resumen && resumen.productosPorReponer.length === 0 && <p className="py-4 text-sm text-stone-500">Todo bien: no hay alertas de reposición.</p>}
              {!resumen && <p className="py-4 text-sm text-stone-400">Cargando inventario…</p>}
            </div>
          </section>

          <section className="rounded-3xl border border-[#203128]/10 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3"><div><h3 className="font-display text-lg font-semibold text-[#203128]">Fichas por completar</h3><p className="mt-1 text-xs text-stone-500">Campos vacíos o demasiado breves</p></div><span className="rounded-full bg-[#f3ead7] px-3 py-1 text-xs font-bold text-[#806b40]">{resumen?.fichasIncompletas.length ?? "—"}</span></div>
            <div className="mt-3 divide-y divide-[#203128]/[.07]">{resumen?.fichasIncompletas.slice(0, 5).map((producto) => <div key={producto.id} className="py-3"><p className="text-sm font-semibold text-[#203128]">{producto.nombre}</p><p className="mt-1 text-xs leading-5 text-stone-500">{producto.marca} · falta {producto.faltantes.join(", ")}</p></div>)}{resumen && resumen.fichasIncompletas.length === 0 && <p className="py-4 text-sm text-stone-500">Las fichas activas están completas según los campos esenciales.</p>}{!resumen && <p className="py-4 text-sm text-stone-400">Revisando fichas…</p>}</div>
            <a href="/admin/productos" className="mt-2 inline-block text-xs font-bold text-[#3f806e] hover:underline">Abrir catálogo para completar →</a>
          </section>

          <p className="px-2 text-[11px] leading-5 text-stone-400">{resumen ? `Datos actualizados ${new Date(resumen.actualizado).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit", timeZone: "America/Asuncion" })} · zona Paraguay` : "Consultando la base de datos de Glasskin…"}</p>
        </aside>
      </div>
    </div>
  );
}
