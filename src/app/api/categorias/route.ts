// ============================================================
//  GET /api/categorias - Lista de categorías para filtros
// ============================================================
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categorias = await prisma.category.findMany({
      orderBy: { orden: "asc" },
      select: { slug: true, nombre: true },
    });
    return NextResponse.json({ categorias });
  } catch (e) {
    console.error("GET /api/categorias error:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}