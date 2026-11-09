import { NextResponse } from "next/server";

export function GET() {
  const needsSetup = !process.env.ADMIN_USER?.trim() || !process.env.ADMIN_PASSWORD?.trim() || !process.env.ADMIN_SESSION_SECRET?.trim();
  return NextResponse.json({ needsSetup }, { headers: { "Cache-Control": "no-store" } });
}
