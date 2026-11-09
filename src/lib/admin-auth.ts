export const ADMIN_COOKIE = "glasskin_admin_session";
export const ADMIN_SESSION_SECONDS = 60 * 60 * 8;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function claveHmac(secret: string, usage: KeyUsage[]) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usage,
  );
}

export async function crearSesionAdmin(usuario: string, secret: string): Promise<string> {
  const payload = bytesToBase64Url(
    new TextEncoder().encode(
      JSON.stringify({ usuario, exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS }),
    ),
  );
  const key = await claveHmac(secret, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verificarSesionAdmin(token: string, secret: string): Promise<boolean> {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return false;
    const key = await claveHmac(secret, ["verify"]);
    const valida = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(signature),
      new TextEncoder().encode(payload),
    );
    if (!valida) return false;
    const decoded = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as {
      usuario?: string;
      exp?: number;
    };
    return Boolean(decoded.usuario && decoded.exp && decoded.exp > Math.floor(Date.now() / 1000));
  } catch {
    return false;
  }
}
