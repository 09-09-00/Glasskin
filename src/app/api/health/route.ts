import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { ok: true, service: "glasskin" },
      { headers: { "Cache-Control": "no-store", "X-Glasskin-Health": "ok" } },
    );
  } catch (error) {
    console.error("GET /api/health error:", error);
    return NextResponse.json(
      { ok: false, service: "glasskin", error: "Base de datos no disponible" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
