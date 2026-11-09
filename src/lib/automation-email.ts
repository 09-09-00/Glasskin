import { prisma } from "@/lib/prisma";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function correoTransaccionalConfigurado() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

/** Envía un mensaje de la bandeja por Resend. Sin configuración conserva el borrador. */
export async function enviarMensajeAutomatico(id: number) {
  try {
    const mensaje = await prisma.automationMessage.findUnique({ where: { id } });
    if (!mensaje) return { estado: "no_encontrado" as const };
    if (mensaje.estado === "enviado") return { estado: "enviado" as const };
    if (!correoTransaccionalConfigurado()) return { estado: "borrador" as const };

    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM!.trim(),
        to: [mensaje.destinatario],
        subject: mensaje.asunto,
        text: mensaje.cuerpo,
        reply_to: process.env.EMAIL_REPLY_TO?.trim() || undefined,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`Resend respondió con código ${response.status}`);
    }

    await prisma.automationMessage.update({ where: { id }, data: { estado: "enviado" } });
    return { estado: "enviado" as const };
  } catch (error) {
    console.error(`No se pudo enviar el mensaje automático ${id}:`, error);
    // Un fallo del proveedor o incluso al marcar el error nunca debe invalidar
    // el pedido ya guardado ni forzar al cliente a repetir el checkout.
    await prisma.automationMessage.update({ where: { id }, data: { estado: "error" } }).catch((persistError) => {
      console.error(`No se pudo guardar el error del mensaje automático ${id}:`, persistError);
    });
    return { estado: "error" as const };
  }
}
