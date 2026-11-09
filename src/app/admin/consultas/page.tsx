import { prisma } from "@/lib/prisma";
import { EstadoConsulta } from "./EstadoConsulta";

export const dynamic = "force-dynamic";

const categorias: Record<string, string> = { pedido: "Pedido", recomendacion: "Recomendación", reclamo: "Reclamo", otra: "Otra consulta" };

function requiereAtencionPrioritaria(consulta: string) {
  const texto = consulta.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /alerg|reaccion|irrit|ardor|quem|hinch|dolor|urgente|intoxic/.test(texto);
}

export default async function ConsultasPage() {
  const [casos, abiertas] = await Promise.all([
    prisma.supportCase.findMany({ orderBy: [{ estado: "asc" }, { createdAt: "asc" }], take: 100 }),
    prisma.supportCase.count({ where: { estado: "abierta" } }),
  ]);
  const casosOrdenados = casos.sort((a, b) =>
    Number(b.estado === "abierta") - Number(a.estado === "abierta")
    || Number(requiereAtencionPrioritaria(b.consulta)) - Number(requiereAtencionPrioritaria(a.consulta))
    || a.createdAt.getTime() - b.createdAt.getTime(),
  );

  return <div className="mx-auto max-w-5xl space-y-6">
    <header><p className="text-xs font-bold uppercase tracking-[.16em] text-[#3f806e]">Seguimiento humano</p><h2 className="mt-1 font-display text-3xl font-semibold text-[#203128]">Consultas de clientes</h2><p className="mt-2 text-sm text-stone-500">Casos que los clientes enviaron voluntariamente para recibir seguimiento del equipo.</p></header>
    <div className="grid gap-4 sm:grid-cols-3"><article className="rounded-2xl bg-[#e8f0e8] p-5"><p className="text-xs font-bold uppercase text-stone-500">Pendientes</p><p className="mt-2 font-display text-4xl font-semibold">{abiertas}</p></article><article className="rounded-2xl border border-stone-200 bg-white p-5 sm:col-span-2"><p className="font-semibold text-[#203128]">Atención sugerida por Glasskin</p><p className="mt-1 text-sm leading-6 text-stone-500">Cada consulta incluye la última respuesta del asistente como contexto. Usa correo o WhatsApp para continuar y marca el caso resuelto cuando termines.</p></article></div>
    {casosOrdenados.length === 0 ? <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center"><p className="font-semibold">Todavía no hay consultas escaladas</p><p className="mt-1 text-sm text-stone-500">Aparecerán aquí cuando un cliente pida seguimiento humano.</p></div> : <div className="space-y-4">{casosOrdenados.map((caso) => {
      const digitos = (caso.telefono ?? "").replace(/\D/g, "");
      const telefono = digitos.length < 8 ? "" : digitos.startsWith("595") ? digitos : digitos.startsWith("0") ? `595${digitos.slice(1)}` : digitos.length <= 9 ? `595${digitos}` : digitos;
      const estadoColor = caso.estado === "abierta" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800";
      const prioritaria = caso.estado === "abierta" && requiereAtencionPrioritaria(caso.consulta);
      return <article key={caso.id} className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#e8f0e8] px-3 py-1 text-xs font-bold text-[#315141]">{categorias[caso.categoria] ?? "Consulta"}</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${estadoColor}`}>{caso.estado}</span>{prioritaria && <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">Atención prioritaria</span>}<span className="text-xs text-stone-400">#{caso.id} · {caso.createdAt.toLocaleString("es-PY", { timeZone: "America/Asuncion" })}</span></div><h3 className="mt-3 font-display text-xl font-semibold text-[#203128]">{caso.nombre}</h3><p className="text-sm text-stone-500">{caso.email}{caso.telefono ? ` · ${caso.telefono}` : ""}</p></div><div className="flex gap-2"><a href={`mailto:${caso.email}?subject=${encodeURIComponent(`Glasskin · seguimiento de consulta #${caso.id}`)}&body=${encodeURIComponent(caso.respuestaSugerida ?? "Hola, recibimos tu consulta y queremos ayudarte.")}`} className="rounded-full border border-[#203128]/15 px-4 py-2 text-xs font-bold text-[#203128]">Correo</a>{telefono && <a href={`https://wa.me/${telefono}?text=${encodeURIComponent(`Hola ${caso.nombre}, te escribimos de Glasskin por tu consulta: ${caso.consulta}`)}`} target="_blank" rel="noreferrer" className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white">WhatsApp</a>}</div></div><div className="mt-4 rounded-xl bg-[#fbf8f1] p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-[#3f806e]">Consulta</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-700">{caso.consulta}</p></div>{caso.respuestaSugerida && <details className="mt-3"><summary className="cursor-pointer text-xs font-bold text-[#3f806e]">Ver respuesta sugerida por el asistente</summary><p className="mt-2 whitespace-pre-wrap rounded-xl bg-stone-50 p-4 text-sm leading-6 text-stone-600">{caso.respuestaSugerida}</p></details>}<EstadoConsulta id={caso.id} estado={caso.estado} /></article>;
    })}</div>}
  </div>;
}
