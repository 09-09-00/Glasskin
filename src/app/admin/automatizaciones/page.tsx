import { prisma } from "@/lib/prisma";
import { correoTransaccionalConfigurado } from "@/lib/automation-email";
import { AccionMensaje } from "./AccionMensaje";
import { ProcesarRecordatorios } from "./ProcesarRecordatorios";

export const dynamic = "force-dynamic";

const nombres: Record<string, string> = {
  confirmacion_pedido: "Confirmación de pedido",
  cambio_estado: "Actualización de envío",
  soporte: "Respuesta de soporte",
  recordatorio_reposicion: "Recordatorio de reposición",
};

export default async function AutomatizacionesPage() {
  const correoListo = correoTransaccionalConfigurado();
  const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [mensajes, borradores, enviados, pedidosPendientes, pedidosAtrasados, consultasAbiertas, consultasAtrasadas, stockBajo, recordatoriosVencidos] = await Promise.all([
    prisma.automationMessage.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { order: true } }),
    prisma.automationMessage.count({ where: { estado: "borrador" } }),
    prisma.automationMessage.count({ where: { estado: "enviado" } }),
    prisma.order.count({ where: { estado: "pendiente" } }),
    prisma.order.count({ where: { estado: "pendiente", createdAt: { lt: hace24Horas } } }),
    prisma.supportCase.count({ where: { estado: "abierta" } }),
    prisma.supportCase.count({ where: { estado: "abierta", createdAt: { lt: hace24Horas } } }),
    prisma.product.count({ where: { activo: true, stock: { lt: 5 } } }),
    prisma.subscription.count({ where: { estado: "activa", proximaEntrega: { lte: new Date() } } }),
  ]);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold tracking-wider text-[#3f806e] uppercase">Centro operativo</p><h2 className="mt-1 font-display text-3xl font-bold text-stone-900">Automatizaciones</h2><p className="mt-2 max-w-2xl text-sm text-stone-500">Aquí puedes explicar y revisar seis flujos automáticos del sistema, incluido el dashboard que actualiza métricas y alertas cada minuto. Los mensajes quedan registrados y se pueden reintentar.</p></div>
        <span className={`rounded-full px-4 py-2 text-xs font-bold ${correoListo ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{correoListo ? "Correo automático activo" : "Falta configurar correo"}</span>
      </div>

      {!correoListo && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950"><h3 className="font-bold">Activa los avisos por correo</h3><p className="mt-1">Configura <code>RESEND_API_KEY</code> y <code>EMAIL_FROM</code> en el entorno donde corre la tienda. El remitente debe estar verificado en Resend. Hasta entonces, Glasskin guardará los mensajes en esta bandeja sin perderlos.</p></section>}

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#203128]/10 bg-white p-5"><div><h3 className="font-display text-xl font-semibold text-[#203128]">Reposición para clientes</h3><p className="mt-1 max-w-2xl text-sm text-stone-500">El servidor local revisa los avisos cada hora. También puedes procesarlos ahora. Se envían si el correo está configurado; si no, quedan en la bandeja para reintentar.</p></div><ProcesarRecordatorios vencidos={recordatoriosVencidos} /></section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[{ etiqueta: "Borradores preparados", valor: borradores, fondo: "bg-[#e8f0e8]" }, { etiqueta: "Correos enviados", valor: enviados, fondo: "bg-[#e7f0eb]" }, { etiqueta: "Pedidos pendientes", valor: pedidosPendientes, fondo: "bg-[#e8f0e8]" }, { etiqueta: "Consultas abiertas", valor: consultasAbiertas, fondo: "bg-[#f3ead7]" }, { etiqueta: "Alertas de stock", valor: stockBajo, fondo: "bg-[#eee2d6]" }].map((item) => <div key={item.etiqueta} className={`${item.fondo} rounded-3xl p-5`}><p className="text-xs font-bold tracking-wide text-stone-500 uppercase">{item.etiqueta}</p><p className="mt-4 font-display text-4xl font-semibold">{item.valor}</p></div>)}
      </div>

      <section className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#3f806e]">Revisión proactiva</p><h3 className="mt-1 font-display text-2xl font-semibold text-[#203128]">Hay cosas que atender</h3><p className="mt-1 text-sm text-stone-500">El dashboard actualiza y recalcula estas señales cada 60 segundos; al abrir esta página también se consultan los datos nuevos.</p></div><a href="/admin/copiloto" className="text-sm font-bold text-[#3f806e] hover:underline">Consultar al copiloto →</a></div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <a href="/admin/pedidos?estado=pendiente" className="rounded-2xl bg-[#fbf8f1] p-4 transition hover:bg-[#f3ead7]"><p className="text-xs font-bold uppercase tracking-wide text-stone-500">Seguimiento de pedidos</p><p className="mt-2 font-display text-3xl font-semibold text-[#203128]">{pedidosAtrasados}</p><p className="mt-1 text-sm text-stone-600">pendientes hace más de 24 horas</p><span className="mt-3 inline-block text-xs font-bold text-[#3f806e]">Revisar pedidos →</span></a>
          <a href="/admin/consultas" className="rounded-2xl bg-[#fbf8f1] p-4 transition hover:bg-[#f3ead7]"><p className="text-xs font-bold uppercase tracking-wide text-stone-500">Atención al cliente</p><p className="mt-2 font-display text-3xl font-semibold text-[#203128]">{consultasAtrasadas}</p><p className="mt-1 text-sm text-stone-600">consultas abiertas hace más de 24 horas</p><span className="mt-3 inline-block text-xs font-bold text-[#3f806e]">Responder consultas →</span></a>
          <a href="/admin/productos?stock=bajo" className="rounded-2xl bg-[#fbf8f1] p-4 transition hover:bg-[#f3ead7]"><p className="text-xs font-bold uppercase tracking-wide text-stone-500">Inventario</p><p className="mt-2 font-display text-3xl font-semibold text-[#203128]">{stockBajo}</p><p className="mt-1 text-sm text-stone-600">productos con menos de 5 unidades</p><span className="mt-3 inline-block text-xs font-bold text-[#3f806e]">Ver sugerencias de reposición →</span></a>
        </div>
        <p className="mt-4 text-xs leading-5 text-stone-400">Las alertas se actualizan al abrir o recargar esta página. Las cantidades de reposición son sugerencias basadas en ventas recientes, no órdenes de compra automáticas.</p>
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-display text-2xl font-semibold">Bandeja automática</h3><p className="mt-1 text-sm text-stone-500">Se crea sola al recibir un pedido o modificar su estado.</p></div><span className="rounded-full bg-[#203128] px-3 py-1.5 text-[11px] font-bold text-white">REGISTRO ACTIVO</span></div>
        {mensajes.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-stone-300 p-9 text-center"><p className="font-semibold">Todavía no hay mensajes</p><p className="mt-1 text-sm text-stone-500">El primer pedido creará automáticamente su confirmación.</p></div>
        ) : (
          <div className="mt-6 space-y-3">{mensajes.map((mensaje) => <article key={mensaje.id} className="rounded-2xl border border-stone-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-bold uppercase">{nombres[mensaje.tipo] ?? mensaje.tipo}</span>{mensaje.order && <span className="text-xs text-stone-400">{mensaje.order.numero}</span>}</div><p className="mt-3 font-semibold">{mensaje.asunto}</p><p className="mt-1 text-sm text-stone-500">Para: {mensaje.destinatario}</p></div><div className="text-right"><span className={`rounded-full px-3 py-1 text-xs font-bold ${mensaje.estado === "enviado" ? "bg-emerald-100 text-emerald-700" : mensaje.estado === "error" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"}`}>{mensaje.estado}</span><p className="mt-2 text-xs text-stone-400">{mensaje.createdAt.toLocaleString("es-PY")}</p></div></div><details className="mt-3"><summary className="cursor-pointer text-xs font-bold text-[#3f806e]">Ver mensaje</summary><p className="mt-3 whitespace-pre-line rounded-xl bg-stone-50 p-4 text-sm leading-6 text-stone-600">{mensaje.cuerpo}</p></details>{mensaje.estado !== "enviado" && <AccionMensaje id={mensaje.id} />}</article>)}</div>
        )}
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#3f806e]">Requisito del proyecto</p><h3 className="mt-1 font-display text-2xl font-semibold text-[#203128]">Seis flujos automáticos</h3><p className="mt-1 text-sm text-stone-500">Cada ficha indica qué dispara el proceso y qué resultado produce.</p></div>
          <a href="/admin" className="rounded-full border border-[#203128]/15 px-4 py-2 text-xs font-bold text-[#203128] hover:bg-[#edf3ef]">Abrir dashboard →</a>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            { titulo: "Dashboard automático", disparador: "Cada 60 segundos", texto: "Actualiza las métricas y vuelve a ordenar alertas de pedidos, consultas e inventario.", estado: "Activo" },
            { titulo: "Confirmación de compra", disparador: "Al crear un pedido", texto: correoListo ? "Prepara y envía el correo al cliente; los fallos quedan registrados para reintentar." : "Prepara y guarda el mensaje. Activa el proveedor de correo para enviarlo automáticamente.", estado: correoListo ? "Activo" : "Bandeja lista" },
            { titulo: "Aviso de cambio de estado", disparador: "Al actualizar un pedido", texto: correoListo ? "Prepara y envía al cliente la novedad del pedido." : "Prepara el aviso y lo guarda hasta configurar el envío por correo.", estado: correoListo ? "Activo" : "Bandeja lista" },
            { titulo: "Alertas de seguimiento", disparador: "Al actualizar el dashboard", texto: "Prioriza pedidos y consultas con más de 24 horas, solicitudes sensibles y productos con poco stock.", estado: "Activo" },
            { titulo: "Recordatorios de reposición", disparador: "Revisión horaria del servidor", texto: "Procesa avisos consentidos por el cliente, evita duplicados y permite pausar el recordatorio.", estado: "Activo" },
            { titulo: "Estado de compra en el chat", disparador: "Cuando un cliente consulta", texto: "Responde sobre sus pedidos recientes solo después de verificar su sesión.", estado: "Activo" },
          ].map((flujo) => <article key={flujo.titulo} className="rounded-2xl border border-stone-200 bg-[#fffefa] p-5"><div className="flex items-start justify-between gap-3"><h4 className="font-semibold text-[#203128]">{flujo.titulo}</h4><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${flujo.estado === "Activo" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{flujo.estado}</span></div><p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-[#3f806e]">{flujo.disparador}</p><p className="mt-2 text-sm leading-6 text-stone-500">{flujo.texto}</p></article>)}
        </div>
      </section>
    </div>
  );
}
