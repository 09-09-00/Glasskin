import { randomBytes } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const SetupSchema = z.object({
  usuario: z.string().trim().min(3).max(40).regex(/^[\p{L}\p{N}._-]+$/u, "Usa letras, números, punto, guion o guion bajo."),
  clave: z.string().min(12).max(200).refine((value) => !/[\r\n\u0000-\u001f]/.test(value), "La contraseña contiene caracteres no permitidos."),
});

function esAccesoLocal(request: NextRequest) {
  const hostHeader = request.headers.get("host") ?? "";
  const host = (hostHeader.startsWith("[") ? hostHeader.slice(1, hostHeader.indexOf("]")) : hostHeader.split(":")[0]).toLowerCase();
  if (!new Set(["localhost", "127.0.0.1", "::1"]).has(host)) return false;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip")?.trim();
  return !ip || new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]).has(ip);
}

function envQuote(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export async function POST(request: NextRequest) {
  if (!esAccesoLocal(request)) return NextResponse.json({ error: "La configuración inicial solo está disponible desde esta computadora." }, { status: 403 });

  const parsed = SetupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Revisa los datos ingresados." }, { status: 400 });

  if (process.env.ADMIN_USER?.trim() || process.env.ADMIN_PASSWORD?.trim() || process.env.ADMIN_SESSION_SECRET?.trim()) {
    return NextResponse.json({ error: "El panel ya tiene credenciales configuradas." }, { status: 409 });
  }

  const secret = randomBytes(48).toString("hex");
  const root = process.cwd();
  const envPath = path.join(root, ".env");
  const lockPath = path.join(root, ".glasskin-owner-setup.lock");
  const tempPath = path.join(root, `.env.owner-setup-${randomBytes(8).toString("hex")}.tmp`);
  try {
    await writeFile(lockPath, "owner setup in progress", { encoding: "utf8", flag: "wx" });
  } catch {
    return NextResponse.json({ error: "La configuración inicial ya está en curso. Espera un momento y vuelve a intentar." }, { status: 409 });
  }

  try {
    const current = await readFile(envPath, "utf8").catch((error: NodeJS.ErrnoException) => error.code === "ENOENT" ? "" : Promise.reject(error));
    if (/^\s*ADMIN_(?:USER|PASSWORD|SESSION_SECRET)\s*=/m.test(current)) {
      return NextResponse.json({ error: "Hay variables ADMIN_* en .env. Reinicia Glasskin para cargarlas." }, { status: 409 });
    }
    const addition = [
      "",
      "# Credenciales creadas desde el asistente de configuración de Glasskin",
      `ADMIN_USER=${envQuote(parsed.data.usuario)}`,
      `ADMIN_PASSWORD=${envQuote(parsed.data.clave)}`,
      `ADMIN_SESSION_SECRET=${envQuote(secret)}`,
      "",
    ].join("\n");
    await writeFile(tempPath, `${current}${current.endsWith("\n") || !current ? "" : "\n"}${addition}`, { encoding: "utf8", mode: 0o600, flag: "wx" });
    await rename(tempPath, envPath);
    // Make the new credentials available to the running local server immediately.
    process.env.ADMIN_USER = parsed.data.usuario;
    process.env.ADMIN_PASSWORD = parsed.data.clave;
    process.env.ADMIN_SESSION_SECRET = secret;
    return NextResponse.json({ ok: true });
  } catch (error) {
    await import("node:fs/promises").then(({ rm }) => rm(tempPath, { force: true })).catch(() => undefined);
    console.error("No se pudo completar la configuración inicial del propietario:", error);
    return NextResponse.json({ error: "No se pudo guardar .env. Verifica que Glasskin tenga permiso de escritura en su carpeta." }, { status: 500 });
  } finally {
    await import("node:fs/promises").then(({ rm }) => rm(lockPath, { force: true })).catch(() => undefined);
  }
}
