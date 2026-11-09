import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
export const CUSTOMER_COOKIE = "glasskin_customer_session";
export const CUSTOMER_SESSION_SECONDS = 60 * 60 * 24 * 30;

let secretPromise: Promise<string> | undefined;

async function sessionSecret() {
  const configured = process.env.CUSTOMER_SESSION_SECRET?.trim() || process.env.ADMIN_SESSION_SECRET?.trim();
  if (configured) return configured;
  if (!secretPromise) {
    secretPromise = (async () => {
      const secretPath = path.join(process.cwd(), ".glasskin-customer-session-secret");
      try {
        return (await readFile(secretPath, "utf8")).trim();
      } catch (error) {
        if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
      }
      const generated = randomBytes(48).toString("hex");
      try {
        await writeFile(secretPath, generated, { encoding: "utf8", mode: 0o600, flag: "wx" });
        return generated;
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "EEXIST") {
          return (await readFile(secretPath, "utf8")).trim();
        }
        throw error;
      }
    })();
  }
  return secretPromise;
}

export async function hashCustomerPassword(password: string) {
  const salt = randomBytes(16);
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt.toString("base64url")}:${hash.toString("base64url")}`;
}

export async function verifyCustomerPassword(password: string, stored: string) {
  const [scheme, saltText, hashText] = stored.split(":");
  if (scheme !== "scrypt" || !saltText || !hashText) return false;
  try {
    const expected = Buffer.from(hashText, "base64url");
    const actual = (await scrypt(password, Buffer.from(saltText, "base64url"), expected.length)) as Buffer;
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

async function firma(payload: string) {
  return createHmac("sha256", await sessionSecret()).update(payload).digest("base64url");
}

export async function crearSesionCliente(accountId: number) {
  const payload = Buffer.from(JSON.stringify({ accountId, exp: Math.floor(Date.now() / 1000) + CUSTOMER_SESSION_SECONDS })).toString("base64url");
  return `${payload}.${await firma(payload)}`;
}

export async function verificarSesionCliente(token?: string | null): Promise<number | null> {
  if (!token) return null;
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;
    const expected = Buffer.from(await firma(payload));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { accountId?: number; exp?: number };
    if (!Number.isInteger(data.accountId) || !data.accountId || !data.exp || data.exp <= Math.floor(Date.now() / 1000)) return null;
    return data.accountId;
  } catch {
    return null;
  }
}
