import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatearPrecio } from "@/lib/format-client";

export const dynamic = "force-dynamic";

export default async function ClientesAdminPage() {
  const cuentas = await prisma.customerAccount.findMany({
    orderBy: { createdAt: "desc" },
    include: { orders: { select: { id: true, total: true, estado: true, createdAt: true } } },
  });
  const pedidos = cuentas.reduce((total, cuenta) => total + cuenta.orders.length, 0);
  const totalVentas = cuentas.reduce((total, cuenta) => total + cuenta.orders.filter((pedido) => pedido.estado !== "cancelado").reduce((suma, pedido) => suma + pedido.total, 0), 0);

  return (
    <div className="space-y-7">
      <header><p className="text-xs font-bold uppercase tracking-[.14em] text-[#3f806e]">Panel del dueño</p><h2 className="mt-1 font-display text-3xl font-bold text-[#203128]">Clientes</h2><p className="mt-2 max-w-2xl text-sm text-stone-500">Perfiles que crearon una cuenta, sus pedidos y su actividad en Glasskin.</p></header>
      <section className="grid gap-4 sm:grid-cols-3">
        {[{ label: "Perfiles registrados", value: cuentas.length, tone: "bg-[#e7f0eb]" }, { label: "Pedidos asociados", value: pedidos, tone: "bg-[#eee7d8]" }, { label: "Ventas de perfiles", value: formatearPrecio(totalVentas), tone: "bg-[#e8f0e8]" }].map((item) => <article key={item.label} className={`${item.tone} rounded-2xl p-5`}><p className="text-xs font-bold uppercase tracking-wide text-[#577565]">{item.label}</p><p className="mt-3 font-display text-3xl font-bold text-[#203128]">{item.value}</p></article>)}
      </section>
      <section className="overflow-hidden rounded-2xl border border-[#203128]/10 bg-white">
        <div className="border-b border-[#203128]/10 px-5 py-5"><h3 className="font-display text-xl font-semibold text-[#203128]">Perfiles de clientes</h3><p className="mt-1 text-sm text-stone-500">Abrí un perfil para consultar sus pedidos y datos de contacto.</p></div>
        {cuentas.length === 0 ? <div className="p-10 text-center text-sm text-stone-500">Aún no hay cuentas de clientes. Los perfiles aparecerán cuando se registren.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-[#fbf8f1] text-xs uppercase tracking-wide text-stone-500"><tr><th className="px-5 py-3">Cliente</th><th className="px-4 py-3">Pedidos</th><th className="px-4 py-3">Compras</th><th className="px-4 py-3">Registrado</th><th className="px-5 py-3 text-right">Perfil</th></tr></thead><tbody className="divide-y divide-[#203128]/[.07]">{cuentas.map((cuenta) => { const gasto = cuenta.orders.filter((pedido) => pedido.estado !== "cancelado").reduce((total, pedido) => total + pedido.total, 0); return <tr key={cuenta.id} className="hover:bg-[#fbf8f1]/70"><td className="px-5 py-4"><p className="font-semibold text-[#203128]">{cuenta.nombre}</p><p className="mt-0.5 text-xs text-stone-500">{cuenta.email}{cuenta.telefono ? ` · ${cuenta.telefono}` : ""}</p></td><td className="px-4 py-4">{cuenta.orders.length}</td><td className="px-4 py-4 font-semibold">{formatearPrecio(gasto)}</td><td className="px-4 py-4 text-stone-500">{cuenta.createdAt.toLocaleDateString("es-PY")}</td><td className="px-5 py-4 text-right"><Link href={`/admin/clientes/${cuenta.id}`} className="font-bold text-[#3f806e] hover:underline">Abrir →</Link></td></tr>; })}</tbody></table></div>}
      </section>
    </div>
  );
}
