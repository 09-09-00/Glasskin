// Dashboard automático del dueño: métricas, alertas y siguientes acciones.
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatearPrecio } from "@/lib/format-client";
import { obtenerResumenCopiloto } from "@/lib/admin/copiloto";
import { AutoActualizacion } from "./AutoActualizacion";

export const dynamic = "force-dynamic";

const DIA_MS = 24 * 60 * 60 * 1000;
const zona = "America/Asuncion";

const etiquetasEstado: Record<string, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const coloresEstado: Record<string, string> = {
  pendiente: "bg-amber-400",
  confirmado: "bg-sky-500",
  enviado: "bg-violet-500",
  entregado: "bg-emerald-500",
  cancelado: "bg-stone-300",
};

const categorias: Record<string, string> = {
  pedido: "Pedido",
  recomendacion: "Recomendación",
  reclamo: "Reclamo",
  otra: "Consulta",
};

function inicioDelDiaEnParaguay(fecha: Date) {
  const fechaLocal = new Intl.DateTimeFormat("en-CA", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);
  return new Date(`${fechaLocal}T00:00:00-03:00`);
}

function claveFechaEnParaguay(fecha: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);
}

function riesgoConsulta(consulta: string) {
  const normalizada = consulta.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /alerg|reaccion|irrit|ardor|quem|hinch|dolor|urgente|intoxic/.test(normalizada);
}

function antiguedad(fecha: Date) {
  const horas = Math.max(0, Math.floor((Date.now() - fecha.getTime()) / 3_600_000));
  if (horas < 1) return "Hace menos de una hora";
  if (horas < 24) return `Hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `Hace ${dias} ${dias === 1 ? "día" : "días"}`;
}

function cambioPorcentual(actual: number, anterior: number, referencia = "los 7 días anteriores") {
  if (anterior === 0) return actual > 0 ? "Nuevo período con ventas" : "Sin cambios";
  const cambio = Math.round(((actual - anterior) / anterior) * 100);
  return `${cambio > 0 ? "+" : ""}${cambio}% frente a ${referencia}`;
}

export default async function AdminDashboard() {
  const ahora = new Date();
  const hoy = inicioDelDiaEnParaguay(ahora);
  const inicioSemana = new Date(hoy.getTime() - 6 * DIA_MS);
  const inicioPeriodoAnterior = new Date(hoy.getTime() - 13 * DIA_MS);
  const hace30Dias = new Date(ahora.getTime() - 30 * DIA_MS);
  const hace60Dias = new Date(ahora.getTime() - 60 * DIA_MS);

  const [
    resumen,
    pedidosRecientes,
    pedidosViejos,
    consultas,
    deliveriesPendientes,
    retirosPendientes,
    ventasPeriodo,
    estadosPedidos,
    productosVendidos,
    clientesNuevos,
    resenas,
    recordatoriosActivos,
    ventasPeriodoAnterior30,
  ] = await Promise.all([
    obtenerResumenCopiloto(),
    prisma.order.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { customer: true, items: true },
    }),
    prisma.order.findMany({
      where: { estado: "pendiente" },
      take: 3,
      orderBy: { createdAt: "asc" },
      select: { id: true, numero: true, total: true, createdAt: true, customer: { select: { nombre: true } } },
    }),
    prisma.supportCase.findMany({
      where: { estado: "abierta" },
      take: 100,
      orderBy: { createdAt: "asc" },
      select: { id: true, nombre: true, categoria: true, consulta: true, createdAt: true },
    }),
    prisma.order.count({ where: { tipoEntrega: "delivery", estado: { in: ["pendiente", "confirmado"] } } }),
    prisma.order.count({ where: { tipoEntrega: "retiro", estado: { in: ["pendiente", "confirmado"] } } }),
    prisma.order.findMany({
      where: { createdAt: { gte: inicioPeriodoAnterior }, estado: { not: "cancelado" } },
      select: { total: true, createdAt: true },
    }),
    prisma.order.groupBy({
      by: ["estado"],
      where: { createdAt: { gte: hace30Dias } },
      _count: { _all: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { createdAt: { gte: hace30Dias }, estado: { not: "cancelado" } } },
      _sum: { cantidad: true, subtotal: true },
      orderBy: { _sum: { cantidad: "desc" } },
      take: 5,
    }),
    prisma.customer.count({ where: { createdAt: { gte: hace30Dias } } }),
    prisma.productReview.aggregate({
      where: { estado: "visible" },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.subscription.count({ where: { estado: "activa" } }),
    prisma.order.aggregate({
      where: { createdAt: { gte: hace60Dias, lt: hace30Dias }, estado: { not: "cancelado" } },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  const productosTop = productosVendidos.length
    ? await prisma.product.findMany({
        where: { id: { in: productosVendidos.map((item) => item.productId) } },
        select: { id: true, nombre: true, brand: { select: { nombre: true } } },
      })
    : [];
  const productosPorId = new Map<number, (typeof productosTop)[number]>();
  for (const producto of productosTop) productosPorId.set(producto.id, producto);
  const topProductos = productosVendidos.flatMap((venta) => {
    const producto = productosPorId.get(venta.productId);
    return producto ? [{
      ...producto,
      unidades: venta._sum?.cantidad ?? 0,
      importe: venta._sum?.subtotal ?? 0,
    }] : [];
  });

  const m = resumen.indicadores;
  const ventasDiarias = Array.from({ length: 7 }, (_, indice) => {
    const fecha = new Date(hoy.getTime() - (6 - indice) * DIA_MS);
    const clave = claveFechaEnParaguay(fecha);
    const delDia = ventasPeriodo.filter((pedido) => claveFechaEnParaguay(pedido.createdAt) === clave);
    return {
      clave,
      etiqueta: new Intl.DateTimeFormat("es-PY", { weekday: "short", day: "numeric", timeZone: zona })
        .format(fecha).replace(".", ""),
      importe: delDia.reduce((total, pedido) => total + pedido.total, 0),
      pedidos: delDia.length,
    };
  });
  const ventasSemana = ventasDiarias.reduce((total, dia) => total + dia.importe, 0);
  const pedidosSemana = ventasDiarias.reduce((total, dia) => total + dia.pedidos, 0);
  const ventasSemanaAnterior = ventasPeriodo
    .filter((pedido) => pedido.createdAt < inicioSemana)
    .reduce((total, pedido) => total + pedido.total, 0);
  const pedidosSemanaAnterior = ventasPeriodo.filter((pedido) => pedido.createdAt < inicioSemana).length;
  const maximoGrafico = Math.max(...ventasDiarias.map((dia) => dia.importe), 1);
  const totalPedidosUltimos30Dias = estadosPedidos.reduce((total, grupo) => total + (grupo._count?._all ?? 0), 0);
  const estadoPorClave = new Map<string, number>();
  for (const grupo of estadosPedidos) estadoPorClave.set(grupo.estado, grupo._count?._all ?? 0);
  const consultasPrioridad = consultas
    .map((caso) => ({ ...caso, urgente: riesgoConsulta(caso.consulta) }))
    .sort((a, b) => Number(b.urgente) - Number(a.urgente) || a.createdAt.getTime() - b.createdAt.getTime())
    .slice(0, 3);
  const ticketPromedio = m.pedidos30Dias > 0 ? m.importePedidos30Dias / m.pedidos30Dias : 0;
  const promedioResenas = resenas._avg.rating;
  const importePeriodoAnterior30 = ventasPeriodoAnterior30._sum.total ?? 0;
  const comparacion30Dias = cambioPorcentual(m.importePedidos30Dias, importePeriodoAnterior30, "los 30 días anteriores");

  const tarjetas = [
    { titulo: "Pedidos por atender", valor: String(m.pedidosPendientes), detalle: `${m.pedidosPendientesMas24Horas} llevan más de 24 h`, icono: "📦", fondo: "bg-[#f3ead7]", href: "/admin/pedidos?estado=pendiente" },
    { titulo: "Consultas abiertas", valor: String(m.consultasAbiertas), detalle: `${consultas.filter((caso) => riesgoConsulta(caso.consulta)).length} prioritarias`, icono: "💬", fondo: "bg-[#f5f1e8]", href: "/admin/consultas" },
    { titulo: "Alertas de inventario", valor: String(m.stockBajo + m.agotados), detalle: `${m.agotados} productos agotados`, icono: "🧴", fondo: "bg-[#e8f1f1]", href: "/admin/productos?stock=bajo" },
    { titulo: "Clientes nuevos · 30 días", valor: String(clientesNuevos), detalle: "Perfiles de cliente creados recientemente", icono: "👥", fondo: "bg-[#f5e9e6]", href: "/admin/clientes" },
    { titulo: "Pedidos · 30 días", valor: String(m.pedidos30Dias), detalle: "Pedidos no cancelados", icono: "🛍️", fondo: "bg-[#e5f0e9]", href: "/admin/pedidos" },
    { titulo: "Productos activos", valor: String(m.productosActivos), detalle: `${resumen.productosPorReponer.filter((producto) => producto.sinMovimiento30Dias).length} sin ventas en 30 días`, icono: "✨", fondo: "bg-[#eeeaf5]", href: "/admin/productos" },
  ];

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#3f806e]">Centro de mando · Glasskin</p>
          <h2 className="mt-1 font-display text-3xl font-bold text-stone-900 sm:text-4xl">Dashboard del negocio</h2>
          <p className="mt-2 max-w-2xl text-sm text-stone-500">Ventas, clientes, operaciones y alertas reunidos en un solo lugar. Los datos y prioridades se recalculan automáticamente.</p>
        </div>
        <AutoActualizacion actualizado={resumen.actualizado} />
      </header>

      <section aria-label="Resumen de ventas" className="overflow-hidden rounded-3xl bg-[#203128] p-5 text-white shadow-sm sm:p-7">
        <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr] xl:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#b8d7c5]">Indicador principal · ventas</p>
            <h3 className="mt-2 text-sm font-semibold text-white/75">Importe de pedidos · últimos 30 días</h3>
            <p className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">{formatearPrecio(m.importePedidos30Dias)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${m.importePedidos30Dias >= importePeriodoAnterior30 ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>{comparacion30Dias}</span>
              <span className="text-xs text-white/60">período anterior: {formatearPrecio(importePeriodoAnterior30)}</span>
            </div>
            <p className="mt-3 text-xs text-white/55">Basado en {m.pedidos30Dias} pedidos no cancelados. El importe no confirma que el pago haya sido cobrado.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-white/[.08] p-4"><p className="text-xs font-semibold text-white/65">Ventas de hoy</p><p className="mt-2 font-display text-2xl font-bold">{formatearPrecio(m.importePedidosHoy)}</p><p className="mt-1 text-[11px] text-white/55">{m.pedidosHoy} pedidos no cancelados</p></article>
            <article className="rounded-2xl border border-white/10 bg-white/[.08] p-4"><p className="text-xs font-semibold text-white/65">Ticket promedio</p><p className="mt-2 font-display text-2xl font-bold">{formatearPrecio(ticketPromedio)}</p><p className="mt-1 text-[11px] text-white/55">por pedido · últimos 30 días</p></article>
            <article className="rounded-2xl border border-white/10 bg-white/[.08] p-4"><p className="text-xs font-semibold text-white/65">Ventas de 7 días</p><p className="mt-2 font-display text-2xl font-bold">{formatearPrecio(ventasSemana)}</p><p className="mt-1 text-[11px] text-white/55">{pedidosSemana} pedidos · {cambioPorcentual(ventasSemana, ventasSemanaAnterior)}</p></article>
          </div>
        </div>
      </section>

      <section aria-label="Indicadores principales" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {tarjetas.map((tarjeta) => (
          <Link key={tarjeta.titulo} href={tarjeta.href} className="group rounded-2xl border border-stone-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#a9c8b5] hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold leading-5 text-stone-500">{tarjeta.titulo}</p>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg ${tarjeta.fondo}`}>{tarjeta.icono}</span>
            </div>
            <p className="mt-3 truncate font-display text-2xl font-bold text-stone-900">{tarjeta.valor}</p>
            <p className="mt-1 min-h-8 text-[11px] leading-4 text-stone-500">{tarjeta.detalle}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.5fr_.85fr]">
        <article className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-[#3f806e]">Análisis de ventas</p>
              <h3 className="mt-1 font-display text-2xl font-bold text-[#203128]">Últimos 7 días</h3>
              <p className="mt-1 text-sm text-stone-500">Comparación con los 7 días anteriores · importes de pedidos no cancelados</p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-bold text-[#203128]">{formatearPrecio(ventasSemana)}</p>
              <p className={`mt-1 text-xs font-semibold ${ventasSemana >= ventasSemanaAnterior ? "text-emerald-700" : "text-amber-700"}`}>{cambioPorcentual(ventasSemana, ventasSemanaAnterior)}</p>
            </div>
          </div>
          <div role="img" aria-label={`Gráfico de ventas de los últimos 7 días. Total ${formatearPrecio(ventasSemana)} en ${pedidosSemana} pedidos.`} className="mt-7 grid h-48 grid-cols-7 items-end gap-2 border-b border-stone-200 px-1 sm:gap-4">
            {ventasDiarias.map((dia) => {
              const alto = dia.importe > 0 ? Math.max(8, Math.round((dia.importe / maximoGrafico) * 100)) : 3;
              return (
                <div key={dia.clave} className="flex h-full min-w-0 flex-col items-center justify-end gap-2">
                  <span className="truncate text-[10px] font-semibold text-stone-500" title={`${formatearPrecio(dia.importe)} · ${dia.pedidos} pedidos`}>{dia.importe ? formatearPrecio(dia.importe) : "—"}</span>
                  <div className="flex h-[68%] w-full items-end justify-center">
                    <div title={`${dia.etiqueta}: ${formatearPrecio(dia.importe)} en ${dia.pedidos} pedidos`} className={`w-full max-w-12 rounded-t-lg transition-all ${dia.clave === claveFechaEnParaguay(ahora) ? "bg-[#3f806e]" : "bg-[#b8d7c5]"}`} style={{ height: `${alto}%`, minHeight: dia.importe > 0 ? 8 : 3 }} />
                  </div>
                  <span className="mb-2 text-[10px] font-semibold capitalize text-stone-500">{dia.etiqueta}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
            <span>{pedidosSemana} pedidos en el período actual</span>
            <span>{pedidosSemanaAnterior} pedidos en el período anterior</span>
          </div>
        </article>

        <article className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-7">
          <div className="flex items-end justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#3f806e]">Operación</p><h3 className="mt-1 font-display text-2xl font-bold text-[#203128]">Estado de pedidos</h3></div>
            <span className="text-xs text-stone-500">30 días</span>
          </div>
          <p className="mt-4 font-display text-4xl font-bold text-[#203128]">{totalPedidosUltimos30Dias}</p>
          <p className="text-xs text-stone-500">pedidos registrados en el período</p>
          <div className="mt-5 space-y-3">
            {Object.entries(etiquetasEstado).map(([estado, etiqueta]) => {
              const cantidad = estadoPorClave.get(estado) ?? 0;
              const ancho = totalPedidosUltimos30Dias ? Math.round((cantidad / totalPedidosUltimos30Dias) * 100) : 0;
              return (
                <div key={estado}>
                  <div className="mb-1 flex justify-between gap-2 text-xs"><span className="text-stone-600">{etiqueta}</span><span className="font-semibold text-stone-800">{cantidad}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-stone-100"><div className={`h-full rounded-full ${coloresEstado[estado]}`} style={{ width: `${ancho}%` }} /></div>
                </div>
              );
            })}
          </div>
          <Link href="/admin/pedidos" className="mt-5 inline-flex text-xs font-bold text-[#3f806e] hover:underline">Abrir todos los pedidos →</Link>
        </article>
      </section>

      <section className="rounded-3xl bg-[#203128] p-5 text-white shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#b8d7c5]">Prioridades calculadas automáticamente</p><h3 className="mt-1 font-display text-2xl font-semibold">Siguiente mejor acción</h3><p className="mt-1 text-sm text-white/70">El sistema ordena pedidos, consultas e inventario para que sepas qué atender primero.</p></div>
          <Link href="/admin/automatizaciones" className="rounded-full border border-white/20 px-4 py-2 text-xs font-bold transition hover:bg-white/10">Ver las automatizaciones →</Link>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-4">
          <article className="rounded-2xl bg-white p-5 text-[#203128]">
            <div className="flex items-center justify-between"><h4 className="font-semibold">Pedidos pendientes</h4><span className="rounded-full bg-[#f3ead7] px-2.5 py-1 text-xs font-bold">{m.pedidosPendientes}</span></div>
            {pedidosViejos.length ? <div className="mt-3 space-y-3">{pedidosViejos.map((pedido) => <div key={pedido.id} className="border-t border-stone-100 pt-3"><p className="text-sm font-semibold">{pedido.numero} · {pedido.customer.nombre}</p><p className="mt-0.5 text-xs text-stone-500">{antiguedad(pedido.createdAt)} · {formatearPrecio(pedido.total)}</p></div>)}</div> : <p className="mt-3 text-sm text-stone-500">No hay pedidos esperando confirmación.</p>}
            <Link href="/admin/pedidos?estado=pendiente" className="mt-4 inline-block text-xs font-bold text-[#3f806e] hover:underline">Revisar pedidos →</Link>
          </article>
          <article className="rounded-2xl bg-white p-5 text-[#203128]">
            <div className="flex items-center justify-between"><h4 className="font-semibold">Atención al cliente</h4><span className="rounded-full bg-[#f3ead7] px-2.5 py-1 text-xs font-bold">{m.consultasAbiertas}</span></div>
            {consultasPrioridad.length ? <div className="mt-3 space-y-3">{consultasPrioridad.map((caso) => <div key={caso.id} className="border-t border-stone-100 pt-3"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{caso.nombre}</p>{caso.urgente && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">Prioritaria</span>}</div><p className="mt-0.5 text-xs text-stone-500">{categorias[caso.categoria] ?? "Consulta"} · {antiguedad(caso.createdAt)}</p></div>)}</div> : <p className="mt-3 text-sm text-stone-500">No hay consultas abiertas.</p>}
            <Link href="/admin/consultas" className="mt-4 inline-block text-xs font-bold text-[#3f806e] hover:underline">Abrir consultas →</Link>
          </article>
          <article className="rounded-2xl bg-white p-5 text-[#203128]">
            <div className="flex items-center justify-between"><h4 className="font-semibold">Inventario por reponer</h4><span className="rounded-full bg-[#f3ead7] px-2.5 py-1 text-xs font-bold">{m.stockBajo + m.agotados}</span></div>
            {resumen.productosPorReponer.slice(0, 3).length ? <div className="mt-3 space-y-3">{resumen.productosPorReponer.slice(0, 3).map((producto) => <div key={producto.id} className="border-t border-stone-100 pt-3"><p className="text-sm font-semibold">{producto.nombre}</p><p className="mt-0.5 text-xs text-stone-500">{producto.stock === 0 ? "Agotado" : `${producto.stock} unidades`} · sugerencia: reponer {producto.sugerenciaReposicion}</p></div>)}</div> : <p className="mt-3 text-sm text-stone-500">No hay alertas de reposición.</p>}
            <Link href="/admin/productos?stock=bajo" className="mt-4 inline-block text-xs font-bold text-[#3f806e] hover:underline">Revisar inventario →</Link>
          </article>
          <article className="rounded-2xl bg-white p-5 text-[#203128]"><h4 className="font-semibold">Entregas por coordinar</h4><div className="mt-3 space-y-3"><div className="flex items-center justify-between border-t border-stone-100 pt-3"><span className="text-sm">Delivery pendiente</span><strong className="font-display text-xl">{deliveriesPendientes}</strong></div><div className="flex items-center justify-between border-t border-stone-100 pt-3"><span className="text-sm">Retiros por preparar</span><strong className="font-display text-xl">{retirosPendientes}</strong></div></div><Link href="/admin/pedidos?entrega=delivery" className="mt-4 inline-block text-xs font-bold text-[#3f806e] hover:underline">Abrir cola de entregas →</Link></article>
        </div>
        <p className="mt-4 text-[11px] leading-5 text-white/55">La prioridad de consultas se detecta localmente por palabras de riesgo. Las sugerencias de stock ayudan a decidir; no generan compras ni modifican pedidos por sí solas.</p>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <article className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#3f806e]">Rendimiento del catálogo</p><h3 className="mt-1 font-display text-2xl font-bold text-[#203128]">Productos más vendidos</h3><p className="mt-1 text-sm text-stone-500">Unidades vendidas en los últimos 30 días</p></div><Link href="/admin/productos" className="text-sm font-semibold text-[#3f806e] hover:underline">Ver catálogo →</Link></div>
          {topProductos.length ? <div className="mt-5 space-y-4">{topProductos.map((producto, indice) => {
            const maximo = Math.max(topProductos[0]?.unidades ?? 1, 1);
            return <div key={producto.id} className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#e8f0e8] text-xs font-bold text-[#315141]">{String(indice + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="truncate text-sm font-semibold text-[#203128]">{producto.nombre}</p><span className="text-xs font-bold text-stone-600">{producto.unidades} u.</span></div><p className="mt-0.5 text-[11px] text-stone-400">{producto.brand.nombre} · {formatearPrecio(producto.importe)}</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-[#83a994]" style={{ width: `${Math.max(5, Math.round((producto.unidades / maximo) * 100))}%` }} /></div></div></div>;
          })}</div> : <p className="mt-5 rounded-2xl bg-[#fbf8f1] p-5 text-sm text-stone-500">Cuando se registren ventas, el ranking aparecerá aquí.</p>}
        </article>

        <article className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-7">
          <div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#3f806e]">Salud de la tienda</p><h3 className="mt-1 font-display text-2xl font-bold text-[#203128]">Relación con clientes</h3><p className="mt-1 text-sm text-stone-500">Indicadores calculados sobre los datos registrados</p></div>
          <div className="mt-5 divide-y divide-stone-100">
            <div className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold text-[#203128]">Ticket promedio</p><p className="text-xs text-stone-500">Pedidos no cancelados · 30 días</p></div><strong className="font-display text-lg">{formatearPrecio(ticketPromedio)}</strong></div>
            <div className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold text-[#203128]">Valoración de productos</p><p className="text-xs text-stone-500">{resenas._count._all} reseñas visibles</p></div><strong className="font-display text-lg">{promedioResenas === null ? "—" : `${promedioResenas.toFixed(1)} / 5`}</strong></div>
            <div className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold text-[#203128]">Recordatorios activos</p><p className="text-xs text-stone-500">Clientes que aceptaron recibirlos</p></div><strong className="font-display text-lg">{recordatoriosActivos}</strong></div>
            <div className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold text-[#203128]">Catálogo activo</p><p className="text-xs text-stone-500">{resumen.productosPorReponer.filter((producto) => producto.demandaEnAumento).length} con demanda creciente</p></div><strong className="font-display text-lg">{m.productosActivos}</strong></div>
          </div>
          <Link href="/admin/copiloto" className="mt-3 inline-flex text-xs font-bold text-[#3f806e] hover:underline">Consultar al copiloto del negocio →</Link>
        </article>
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#3f806e]">Actividad en tiempo real</p><h3 className="mt-1 font-display text-2xl font-bold text-[#203128]">Pedidos recientes</h3></div><Link href="/admin/pedidos" className="text-sm font-semibold text-[#3f806e] hover:underline">Ver todos →</Link></div>
        {pedidosRecientes.length === 0 ? <p className="mt-5 rounded-2xl bg-[#fbf8f1] p-5 text-sm text-stone-500">Aún no hay pedidos. Cuando alguien compre, su actividad aparecerá aquí.</p> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead><tr className="text-left text-[10px] font-bold uppercase tracking-wide text-stone-400"><th className="pb-3">Pedido</th><th className="pb-3">Cliente</th><th className="pb-3">Artículos</th><th className="pb-3">Estado</th><th className="pb-3 text-right">Total</th><th className="pb-3 text-right">Fecha</th></tr></thead><tbody className="divide-y divide-stone-100">{pedidosRecientes.map((pedido) => <tr key={pedido.id}><td className="py-3 font-semibold text-stone-900">{pedido.numero}</td><td className="py-3">{pedido.customer.nombre}</td><td className="py-3 text-stone-500">{pedido.items.reduce((total, item) => total + item.cantidad, 0)} artículos</td><td className="py-3"><span className="rounded-full bg-[#e8f0e8] px-2.5 py-1 text-xs font-semibold capitalize text-[#315141]">{etiquetasEstado[pedido.estado] ?? pedido.estado}</span></td><td className="py-3 text-right font-semibold text-stone-900">{formatearPrecio(pedido.total)}</td><td className="py-3 text-right text-stone-500">{pedido.createdAt.toLocaleDateString("es-PY", { timeZone: zona })}</td></tr>)}</tbody></table></div>}
      </section>

      <section className="rounded-3xl border border-[#d8e6dc] bg-[#edf3ef] p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#3f806e]">Demostración del requisito</p><h3 className="mt-1 font-display text-2xl font-bold text-[#203128]">Automatizaciones del sistema</h3><p className="mt-1 text-sm text-stone-600">Este dashboard es una automatización: se actualiza cada minuto y vuelve a calcular indicadores y prioridades.</p></div><Link href="/admin/automatizaciones" className="rounded-full bg-[#203128] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#3f806e]">Ver detalle y actividad →</Link></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { nombre: "Dashboard automático", detalle: "Refresca métricas y alertas cada 60 segundos.", frecuencia: "Cada minuto" },
            { nombre: "Alertas y prioridades", detalle: "Ordena pedidos, consultas urgentes y productos por reponer.", frecuencia: "Al actualizar datos" },
            { nombre: "Confirmación de compra", detalle: "Prepara el aviso al registrar un pedido nuevo.", frecuencia: "Por cada pedido" },
            { nombre: "Avisos de pedido", detalle: "Prepara cambios de estado para el cliente.", frecuencia: "Al actualizar estado" },
            { nombre: "Reposición para clientes", detalle: "Procesa recordatorios aceptados por el cliente.", frecuencia: "Cada hora" },
            { nombre: "Estado de compra en el chat", detalle: "Responde consultas de pedidos con sesión verificada.", frecuencia: "Cuando el cliente consulta" },
          ].map((automatizacion) => <article key={automatizacion.nombre} className="rounded-2xl border border-white bg-white/85 p-4"><div className="flex items-start justify-between gap-3"><h4 className="text-sm font-bold text-[#203128]">{automatizacion.nombre}</h4><span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800">Activa</span></div><p className="mt-2 text-xs leading-5 text-stone-500">{automatizacion.detalle}</p><p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-[#3f806e]">{automatizacion.frecuencia}</p></article>)}
        </div>
        <p className="mt-4 text-xs leading-5 text-stone-500">Los correos se conservan en una bandeja para revisar o reintentar. Para enviarlos automáticamente necesitas configurar el proveedor de correo en el servidor.</p>
      </section>

      <p className="text-center text-[11px] text-stone-400">Resumen calculado con pedidos, productos y clientes registrados · Los importes son totales de pedidos, no una confirmación de pagos cobrados.</p>
    </div>
  );
}
