import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatearPrecio } from "@/lib/format-client";

export const dynamic = "force-dynamic";

const colorEstado: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800", confirmado: "bg-sky-100 text-sky-800", enviado: "bg-violet-100 text-violet-800", entregado: "bg-emerald-100 text-emerald-800", cancelado: "bg-stone-100 text-stone-600",
};

export default async function ClienteAdminDetalle({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  const cliente = await prisma.customerAccount.findUnique({
    where: { id },
    include: { orders: { orderBy: { createdAt: "desc" }, include: { items: { include: { producto: true } }, automationMessages: { orderBy: { createdAt: "desc" } } } } },
  });
  if (!cliente) notFound();
  const ventas = cliente.orders.filter((pedido) => pedido.estado !== "cancelado").reduce((total, pedido) => total + pedido.total, 0);

  return (
    <div className="space-y-7">
      <div><Link href="/admin/clientes" className="text-sm font-semibold text-[#3f806e] hover:underline">← Todos los clientes</Link></div>
      <section className="flex flex-wrap items-start justify-between gap-5 rounded-[28px] border border-[#203128]/10 bg-gradient-to-br from-[#e7f0eb] via-[#fbf8f1] to-[#eee7d8] p-6 sm:p-8">
        <div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#3f806e]">Perfil del cliente</p><h2 className="mt-2 font-display text-3xl font-bold text-[#203128] sm:text-4xl">{cliente.nombre}</h2><p className="mt-2 text-sm text-[#405b4d]">{cliente.email}{cliente.telefono ? ` · ${cliente.telefono}` : ""}</p><p className="mt-1 text-xs text-stone-500">Cuenta desde {cliente.createdAt.toLocaleDateString("es-PY")}</p></div>
        <div className="flex gap-2"><a href={`mailto:${encodeURIComponent(cliente.email)}`} className="rounded-full bg-[#203128] px-5 py-3 text-sm font-bold text-white hover:bg-[#3f806e]">Escribir al cliente ↗</a><Link href="/admin/automatizaciones" className="rounded-full border border-[#203128]/15 bg-white/70 px-5 py-3 text-sm font-bold text-[#203128] hover:bg-white">Automatizaciones</Link></div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">{[{ label: "Pedidos", value: cliente.orders.length }, { label: "En curso", value: cliente.orders.filter((pedido) => ["pendiente", "confirmado", "enviado"].includes(pedido.estado)).length }, { label: "Ventas asociadas", value: formatearPrecio(ventas) }].map((item) => <article key={item.label} className="rounded-2xl border border-[#203128]/10 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wide text-stone-500">{item.label}</p><p className="mt-3 font-display text-3xl font-bold text-[#203128]">{item.value}</p></article>)}</section>
      <section className="space-y-4"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#3f806e]">Actividad</p><h3 className="mt-1 font-display text-2xl font-semibold text-[#203128]">Pedidos del cliente</h3></div>
        {cliente.orders.length === 0 ? <div className="rounded-2xl border border-dashed border-[#203128]/20 bg-white p-8 text-center text-sm text-stone-500">Este perfil aún no tiene pedidos.</div> : cliente.orders.map((pedido) => <article key={pedido.id} className="overflow-hidden rounded-2xl border border-[#203128]/10 bg-white"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#203128]/10 bg-[#fbf8f1] px-5 py-4"><div><p className="font-bold text-[#203128]">{pedido.numero}</p><p className="mt-0.5 text-xs text-stone-500">{pedido.createdAt.toLocaleString("es-PY")}</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${colorEstado[pedido.estado] ?? "bg-stone-100 text-stone-600"}`}>{pedido.estado}</span><strong className="font-display text-lg text-[#203128]">{formatearPrecio(pedido.total)}</strong></div></header><div className="grid gap-5 p-5 lg:grid-cols-[1fr_.8fr]"><div><p className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-500">Artículos</p><ul className="space-y-2">{pedido.items.map((item) => <li key={item.id} className="flex justify-between gap-3 text-sm"><span className="text-stone-600">{item.cantidad} × {item.producto.nombre}</span><span className="font-semibold text-[#203128]">{formatearPrecio(item.subtotal)}</span></li>)}</ul><div className="mt-4 border-t border-[#203128]/10 pt-3 text-xs leading-5 text-stone-500"><p><strong className="text-stone-700">Envío:</strong> {pedido.direccionEnvio || "Sin dirección registrada"}</p>{pedido.notas && <p className="mt-1"><strong className="text-stone-700">Notas:</strong> {pedido.notas}</p>}</div></div><div><p className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-500">Mensajes preparados</p>{pedido.automationMessages.length ? <ul className="space-y-2">{pedido.automationMessages.map((mensaje) => <li key={mensaje.id} className="rounded-xl bg-[#e8f0e8] p-3"><p className="text-xs font-bold text-[#203128]">{mensaje.asunto}</p><p className="mt-1 text-xs text-stone-600">{mensaje.estado} · {mensaje.destinatario}</p><details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-[#3f806e]">Ver mensaje</summary><p className="mt-2 whitespace-pre-line text-xs leading-5 text-stone-600">{mensaje.cuerpo}</p></details></li>)}</ul> : <p className="rounded-xl bg-[#fbf8f1] p-3 text-xs text-stone-500">No hay mensajes automáticos asociados a este pedido.</p>}</div></div></article>)}
      </section>
    </div>
  );
}
