import Link from "next/link";
import { cookies } from "next/headers";
import { CuentaAcceso, CuentaPerfil } from "./CuentaAcceso";
import { PerfilRutina } from "./PerfilRutina";
import { RecordatoriosReposicion } from "./RecordatoriosReposicion";
import { RecomprarPedido } from "./RecomprarPedido";
import { ConfirmarRecepcion } from "./ConfirmarRecepcion";
import { FormularioResena } from "@/components/FormularioResena";
import { CUSTOMER_COOKIE, verificarSesionCliente } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { formatearFecha, formatearPrecioServer, obtenerMonedaServer } from "@/lib/format";
import { etiquetaDe, ESTADOS_PEDIDO, leerListaJson } from "@/lib/constantes";

export const dynamic = "force-dynamic";

const coloresEstado: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  confirmado: "bg-sky-100 text-sky-800",
  enviado: "bg-violet-100 text-violet-800",
  entregado: "bg-emerald-100 text-emerald-800",
  cancelado: "bg-stone-100 text-stone-600",
};

export default async function Cuenta() {
  const cookieStore = await cookies();
  const accountId = await verificarSesionCliente(cookieStore.get(CUSTOMER_COOKIE)?.value);
  if (!accountId) return <CuentaAcceso />;

  const [account, moneda] = await Promise.all([
    prisma.customerAccount.findUnique({
      where: { id: accountId },
      include: { orders: { orderBy: { createdAt: "desc" }, include: { customer: true, items: { include: { producto: true } }, reviews: { select: { productId: true } } } } },
    }),
    obtenerMonedaServer(),
  ]);
  if (!account) return <CuentaAcceso />;

  const formatear = (precio: number) => formatearPrecioServer(precio, moneda, prisma);
  const totalGastado = account.orders.filter((pedido) => pedido.estado !== "cancelado").reduce((total, pedido) => total + pedido.total, 0);
  const cliente = await prisma.customer.findUnique({ where: { email: account.email }, select: { id: true } });
  const recordatorios = cliente ? await prisma.subscription.findMany({
    where: { customerId: cliente.id, estado: { in: ["activa", "pausada"] } },
    include: { product: { select: { nombre: true } } },
    orderBy: { proximaEntrega: "asc" },
  }) : [];

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
      <header className="mb-7"><p className="text-xs font-bold uppercase tracking-[.15em] text-[#3f806e]">Tu espacio Glasskin</p><h1 className="mt-2 font-display text-4xl font-semibold text-[#203128]">Mi perfil</h1><p className="mt-2 text-sm text-stone-500">Tus datos y el seguimiento privado de tus pedidos.</p></header>
      <CuentaPerfil perfil={{ nombre: account.nombre, email: account.email, telefono: account.telefono }} />
      <PerfilRutina tipoPiel={account.consentimientoPersonalizacion ? account.tipoPiel : null} preocupaciones={account.consentimientoPersonalizacion ? leerListaJson(account.preocupacionesPiel) : []} consentimiento={account.consentimientoPersonalizacion} rutinaGuardadaAt={account.rutinaGuardadaAt?.toISOString() ?? null} rutinaGuardada={account.consentimientoPersonalizacion ? account.rutinaGuardada : null} />
      <RecordatoriosReposicion recordatorios={recordatorios.map((recordatorio) => ({ id: recordatorio.id, producto: recordatorio.product.nombre, frecuenciaDias: recordatorio.frecuenciaDias, estado: recordatorio.estado, proximaEntrega: recordatorio.proximaEntrega.toISOString() }))} />

      <section className="mt-7 grid gap-4 sm:grid-cols-3">
        {[{ label: "Pedidos realizados", value: account.orders.length, tone: "bg-[#e7f0eb]" }, { label: "En preparación o camino", value: account.orders.filter((pedido) => ["pendiente", "confirmado", "enviado"].includes(pedido.estado)).length, tone: "bg-[#eee7d8]" }, { label: "Total comprado", value: await formatear(totalGastado), tone: "bg-[#e8f0e8]" }].map((item) => <article key={item.label} className={`${item.tone} rounded-2xl p-5`}><p className="text-xs font-bold uppercase tracking-wide text-[#577565]">{item.label}</p><p className="mt-2 font-display text-3xl font-bold text-[#203128]">{item.value}</p></article>)}
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#3f806e]">Tu historial</p><h2 className="mt-1 font-display text-3xl font-semibold text-[#203128]">Mis pedidos</h2></div><Link href="/catalogo" className="rounded-full border border-[#203128]/15 px-4 py-2.5 text-sm font-bold text-[#203128] hover:bg-white">Seguir comprando →</Link></div>
        {account.orders.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-[#203128]/20 bg-white p-10 text-center"><span className="text-3xl">📦</span><p className="mt-3 font-semibold text-[#203128]">Aún no tienes pedidos</p><p className="mt-1 text-sm text-stone-500">Cuando compres con tu sesión iniciada, aparecerán aquí.</p><Link href="/catalogo" className="mt-5 inline-flex rounded-full bg-[#203128] px-5 py-3 text-sm font-bold text-white hover:bg-[#3f806e]">Explorar catálogo</Link></div>
        ) : (
          <ul className="mt-5 space-y-4">{await Promise.all(account.orders.map(async (pedido) => <li key={pedido.id} className="overflow-hidden rounded-2xl border border-[#203128]/10 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#203128]/10 bg-[#fbf8f1] px-5 py-4"><div><p className="font-bold text-[#203128]">{pedido.numero}</p><p className="mt-0.5 text-xs text-stone-500">{formatearFecha(pedido.createdAt)}</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${coloresEstado[pedido.estado] ?? "bg-stone-100 text-stone-600"}`}>{etiquetaDe(ESTADOS_PEDIDO, pedido.estado)}</span><span className="font-display text-lg font-bold text-[#203128]">{await formatear(pedido.total)}</span></div></div><div className="space-y-2 px-5 py-4">{await Promise.all(pedido.items.map(async (item) => <div key={item.id} className="border-b border-[#203128]/5 pb-3 last:border-0"><div className="flex justify-between gap-4 text-sm"><span className="text-stone-600">{item.cantidad} × {item.producto.nombre}</span><span className="shrink-0 font-medium text-[#203128]">{await formatear(item.subtotal)}</span></div>{pedido.estado === "entregado" && <FormularioResena orderId={pedido.id} productId={item.productId} nombreProducto={item.producto.nombre} yaExiste={pedido.reviews.some((resena) => resena.productId === item.productId)} />}</div>))}{pedido.direccionEnvio ? <p className="border-t border-[#203128]/10 pt-3 text-xs text-stone-500">{pedido.tipoEntrega === "delivery" ? "Delivery a" : "Retiro en"}: {pedido.direccionEnvio}</p> : null}{pedido.tipoEntrega === "delivery" && pedido.entregaEstimadaAt && <p className="rounded-xl bg-[#edf3ef] px-3 py-2 text-xs font-semibold text-[#315141]">Llegada estimada: hasta el {new Intl.DateTimeFormat("es-PY", { dateStyle: "long", timeZone: "America/Asuncion" }).format(pedido.entregaEstimadaAt)}. Es una estimación orientativa, máximo 3 días.</p>}{pedido.estado === "enviado" && pedido.tipoEntrega === "delivery" && <ConfirmarRecepcion pedidoId={pedido.id} recibidoInicial={pedido.recibidoPorClienteAt?.toISOString() ?? null} />}{pedido.recibidoPorClienteAt && <p className="text-xs font-semibold text-emerald-700">Recepción confirmada el {formatearFecha(pedido.recibidoPorClienteAt)}.</p>}<RecomprarPedido pedidoId={pedido.id} /></div></li>))}</ul>
        )}
      </section>
    </div>
  );
}
