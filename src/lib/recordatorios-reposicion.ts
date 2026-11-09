import { prisma } from "@/lib/prisma";
import { enviarMensajeAutomatico } from "@/lib/automation-email";

export async function procesarRecordatoriosReposicion(limite = 100) {
  const ahora = new Date();
  const [vencidos, totalVencidos] = await Promise.all([
    prisma.subscription.findMany({
      where: { estado: "activa", proximaEntrega: { lte: ahora } },
      include: { customer: { select: { nombre: true, email: true } }, product: { select: { nombre: true } } },
      orderBy: { proximaEntrega: "asc" },
      take: limite,
    }),
    prisma.subscription.count({ where: { estado: "activa", proximaEntrega: { lte: ahora } } }),
  ]);

  const idsMensajes: number[] = [];
  for (const recordatorio of vencidos) {
    const mensajeId = await prisma.$transaction(async (tx) => {
      // La actualización condicional reclama el aviso; si otro proceso ya lo
      // procesó, count será 0 y no se generará ni enviará un duplicado.
      const reclamado = await tx.subscription.updateMany({
        where: { id: recordatorio.id, estado: "activa", proximaEntrega: { lte: ahora } },
        data: { proximaEntrega: siguienteFecha(recordatorio.proximaEntrega, recordatorio.frecuenciaDias, ahora) },
      });
      if (!reclamado.count) return null;
      const mensaje = await tx.automationMessage.create({
        data: {
          tipo: "recordatorio_reposicion",
          destinatario: recordatorio.customer.email,
          asunto: `¿Es momento de reponer ${recordatorio.product.nombre}? · Glasskin`,
          cuerpo: `Hola ${recordatorio.customer.nombre},\n\nHa pasado el tiempo estimado para reponer ${recordatorio.product.nombre}. Si todavía tienes producto, puedes ignorar este aviso.\n\nEste es solo un recordatorio: no se hizo ningún pedido ni cobro automático. Puedes pausar o cancelar estos avisos desde Mi perfil.\n\nGlasskin`,
        },
      });
      return mensaje.id;
    });
    if (mensajeId) idsMensajes.push(mensajeId);
  }

  const resultados = await Promise.all(idsMensajes.map((id) => enviarMensajeAutomatico(id)));
  return {
    preparados: idsMensajes.length,
    enviados: resultados.filter((resultado) => resultado.estado === "enviado").length,
    borradores: resultados.filter((resultado) => resultado.estado === "borrador").length,
    errores: resultados.filter((resultado) => resultado.estado === "error").length,
    pendientes: Math.max(0, totalVencidos - vencidos.length),
  };
}

function siguienteFecha(fecha: Date, frecuenciaDias: number, ahora: Date) {
  const siguiente = new Date(fecha);
  do {
    siguiente.setDate(siguiente.getDate() + frecuenciaDias);
  } while (siguiente <= ahora);
  return siguiente;
}
