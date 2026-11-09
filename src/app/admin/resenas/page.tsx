import { prisma } from "@/lib/prisma";
import { AdminResenasClient } from "./ResenasClient";

export const dynamic = "force-dynamic";

export default async function AdminResenasPage() {
  const [reseñas, total, visibles] = await Promise.all([
    prisma.productReview.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, rating: true, comment: true, estado: true, createdAt: true, producto: { select: { nombre: true, slug: true } }, customer: { select: { nombre: true } }, order: { select: { numero: true } } } }),
    prisma.productReview.count(),
    prisma.productReview.count({ where: { estado: "visible" } }),
  ]);
  return <AdminResenasClient reseñas={reseñas.map((resena) => ({ ...resena, createdAt: resena.createdAt.toISOString() }))} total={total} visibles={visibles} />;
}
