// ============================================================
//  Panel admin - Lista de videos (Server Component)
// ============================================================
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { VideosClient } from "./VideosClient";

export default async function VideosPage() {
  const videos = await prisma.video.findMany({
    orderBy: { createdAt: "desc" },
    include: { producto: { select: { id: true, nombre: true } }, brand: { select: { id: true, nombre: true } } },
  });
  return <VideosClient initialVideos={videos} />;
}
