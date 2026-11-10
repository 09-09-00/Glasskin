import { cookies } from "next/headers";
import { IDIOMA_COOKIE, type Idioma } from "./idioma";

export async function obtenerIdiomaServer(): Promise<Idioma> {
  const idioma = (await cookies()).get(IDIOMA_COOKIE)?.value;
  return idioma === "en" ? "en" : "es";
}
