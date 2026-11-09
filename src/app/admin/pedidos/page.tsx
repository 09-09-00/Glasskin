// ============================================================
//  Panel admin - Lista de pedidos (Server Component)
// ============================================================
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { PedidosClient } from "./PedidosClient";

export default async function PedidosPage({ searchParams }: { searchParams: Promise<{ entrega?: string }> }) {
  const { entrega } = await searchParams;
  const pedidos = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      items: { include: { producto: { select: { nombre: true } } } },
    },
  });
  return <PedidosClient initialPedidos={pedidos} initialFiltroEntrega={entrega === "delivery" || entrega === "retiro" ? entrega : ""} />;
}
