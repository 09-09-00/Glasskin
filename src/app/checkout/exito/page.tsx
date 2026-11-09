// ============================================================
//  Confirmación del pedido tras el checkout
// ============================================================
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatearFecha, formatearPrecioServer, obtenerMonedaServer } from "@/lib/format";
import { etiquetaDe, ESTADOS_PEDIDO } from "@/lib/constantes";
import { ConfirmarRecepcion } from "../../cuenta/ConfirmarRecepcion";
import { FormularioResena } from "@/components/FormularioResena";

interface Props {
  searchParams: Promise<{ numero?: string; email?: string }>;
}

export default async function ExitoCheckout({ searchParams }: Props) {
  const { numero, email } = await searchParams;
  const emailLimpio = email?.trim().toLowerCase();
  const moneda = await obtenerMonedaServer();

  // Buscar el pedido por su número legible
  const pedido = numero
    ? await prisma.order.findUnique({
        where: { numero },
        include: {
          customer: true,
          items: { include: { producto: { include: { brand: true } } } },
          reviews: { select: { productId: true } },
        },
      })
    : null;

  if (!pedido || !emailLimpio || pedido.customer.email.toLowerCase() !== emailLimpio) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <span className="text-4xl">🤔</span>
        <p className="mt-4 font-semibold text-stone-900">No encontramos ese pedido</p>
        <p className="mt-1 text-sm text-stone-500">
          Revisa el enlace de confirmación o consulta con tu correo y número de pedido.
        </p>
        <Link
          href="/cuenta"
          className="mt-6 inline-block rounded-full bg-[#3f806e] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#2c5e50]"
        >
          Ir a Mi cuenta
        </Link>
      </div>
    );
  }

  // Formatear precios con la moneda correcta
  const formatearPrecio = async (usd: number) => formatearPrecioServer(usd, moneda, prisma);
  const enlaceMapa = pedido.latitudEntrega != null && pedido.longitudEntrega != null
    ? `https://www.openstreetmap.org/?mlat=${pedido.latitudEntrega}&mlon=${pedido.longitudEntrega}#map=17/${pedido.latitudEntrega}/${pedido.longitudEntrega}`
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      {/* Confirmación */}
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-8 text-center">
        <span className="text-5xl">🎉</span>
        <h1 className="font-display mt-4 text-3xl font-bold text-stone-900">
          ¡Pedido creado con éxito!
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Gracias, {pedido.customer.nombre}. Te enviamos la confirmación a{" "}
          <span className="font-semibold">{pedido.customer.email}</span>.
        </p>
        <p className="mt-4 inline-block rounded-full bg-white px-5 py-2 text-sm font-bold text-stone-900">
          Pedido {pedido.numero}
        </p>
      </div>

      {/* Detalle del pedido */}
      <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-stone-900">Detalle del pedido</h2>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            {etiquetaDe(ESTADOS_PEDIDO, pedido.estado)}
          </span>
        </div>

        <ul className="mt-4 space-y-3">
          {await Promise.all(pedido.items.map(async (item) => (
            <li key={item.id} className="flex justify-between gap-3 text-sm">
              <span className="text-stone-600">
                {item.cantidad}× {item.producto.nombre}{" "}
                <span className="text-stone-400">({item.producto.brand.nombre})</span>
              </span>
              <span className="shrink-0 font-semibold text-stone-900">
                {await formatearPrecio(item.subtotal)}
              </span>
            </li>
          )))}
        </ul>

        <dl className="mt-4 space-y-2 border-t border-stone-200 pt-4 text-sm">
          <div className="flex justify-between text-stone-600">
            <dt>Fecha</dt>
            <dd>{formatearFecha(pedido.createdAt)}</dd>
          </div>
          <div className="flex justify-between text-stone-600">
            <dt>{pedido.tipoEntrega === "retiro" ? "Retiro en el local" : "Delivery a"}</dt>
            <dd className="max-w-[60%] text-right">{pedido.direccionEnvio}</dd>
          </div>
          {enlaceMapa && <div className="flex justify-end"><a href={enlaceMapa} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#3f806e] hover:underline">Ver el punto del delivery en el mapa ↗</a></div>}
          {pedido.tipoEntrega === "delivery" && pedido.entregaEstimadaAt && <div className="rounded-xl bg-[#edf3ef] p-4 text-sm text-[#315141]"><strong>Entrega estimada:</strong> hasta el {new Intl.DateTimeFormat("es-PY", { dateStyle: "long", timeZone: "America/Asuncion" }).format(pedido.entregaEstimadaAt)} (máximo 3 días). {enlaceMapa ? "Es una estimación orientativa basada en la distancia al local." : "Como no se marcó el punto exacto, usamos el plazo máximo estimado."}</div>}
          <div className="flex justify-between text-sm text-stone-600"><dt>{pedido.tipoEntrega === "retiro" ? "Retiro" : "Envío"}</dt><dd>{pedido.tipoEntrega === "retiro" || pedido.costoEnvio === 0 ? "Sin costo" : await formatearPrecio(pedido.costoEnvio)}</dd></div>
          <div className="flex justify-between border-t border-stone-200 pt-3 text-base font-bold text-stone-900">
            <dt>Total</dt>
            <dd>{await formatearPrecio(pedido.total)}</dd>
          </div>
        </dl>
      </div>

      {pedido.tipoEntrega === "delivery" && pedido.estado === "enviado" && <div className="mt-5 rounded-2xl border border-emerald-200 bg-white p-5"><p className="text-sm font-semibold text-stone-800">¿Ya llegó tu pedido?</p><p className="mt-1 text-xs text-stone-500">Confirma la recepción para que la tienda actualice el seguimiento.</p><ConfirmarRecepcion pedidoId={pedido.id} recibidoInicial={pedido.recibidoPorClienteAt?.toISOString() ?? null} /></div>}
      {pedido.estado === "entregado" && <section className="mt-5 rounded-2xl border border-[#203128]/10 bg-white p-5"><h2 className="font-semibold text-[#203128]">Cuéntanos cómo te fue</h2><p className="mt-1 text-xs text-stone-500">Tu opinión queda marcada como compra verificada.</p><div className="mt-3 divide-y divide-stone-100">{pedido.items.map((item) => <div key={item.id} className="py-3"><p className="text-sm font-semibold text-[#203128]">{item.producto.nombre}</p><FormularioResena orderId={pedido.id} productId={item.productId} nombreProducto={item.producto.nombre} yaExiste={pedido.reviews.some((resena) => resena.productId === item.productId)} /></div>)}</div></section>}
      {pedido.estado !== "entregado" && pedido.estado !== "cancelado" && <section className="mt-5 rounded-2xl border border-[#d8e6dc] bg-[#edf3ef] p-5"><p className="font-semibold text-[#203128]">Después de recibir tu pedido, cuéntanos tu experiencia</p><p className="mt-1 text-sm leading-6 text-stone-600">Cuando el estado figure como entregado, podrás calificar cada producto desde Mi perfil si compraste con una cuenta, o volviendo a este comprobante. Las reseñas de compras recibidas aparecen en la ficha del producto.</p></section>}
      {pedido.recibidoPorClienteAt && <p className="mt-4 text-center text-sm font-semibold text-emerald-700">Recepción confirmada. ¡Gracias por avisarnos!</p>}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/cuenta"
          className="rounded-full bg-[#203128] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#3f806e]"
        >
          Ir a mi perfil
        </Link>
        <Link
          href="/catalogo"
          className="rounded-full border border-stone-300 px-7 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
        >
          Seguir comprando
        </Link>
      </div>
    </div>
  );
}
