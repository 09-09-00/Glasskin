export function crearSlug(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function slugUnico(
  base: string,
  existe: (slug: string) => Promise<boolean>,
): Promise<string> {
  const raiz = crearSlug(base) || "elemento";
  let candidato = raiz;
  let sufijo = 2;
  while (await existe(candidato)) {
    candidato = `${raiz}-${sufijo}`;
    sufijo += 1;
  }
  return candidato;
}
