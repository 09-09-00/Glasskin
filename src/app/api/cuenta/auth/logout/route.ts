import { NextResponse } from "next/server";
import { CUSTOMER_COOKIE } from "@/lib/customer-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({ name: CUSTOMER_COOKIE, value: "", httpOnly: true, sameSite: "lax", maxAge: 0, path: "/" });
  return response;
}
