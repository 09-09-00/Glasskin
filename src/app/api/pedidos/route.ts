// ============================================================
//  API POST /api/pedidos - Crear orden desde el checkout
//  Valida con Zod, verifica stock en transacción y crea el pedido
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { CUSTOMER_COOKIE, verificarSesionCliente } from "@/lib/customer-auth";
import { enviarMensajeAutomatico } from "@/lib/automation-email";
import { estimarDiasDelivery, obtenerConfiguracionEntrega } from "@/lib/entregas";

// Esquema de validación del cuerpo de la petición
const ItemSchema = z.object({
  id: z.number().int().positive(),
  cantidad: z.number().int().positive().max(20),
});

const ClienteSchema = z.object({
  nombre: z.string().min(2),
  email: z.string().email(),
  telefono: z.string().optional(),
});

const BodySchema = z.object({
  cliente: ClienteSchema,
  items: z.array(ItemSchema).min(1).max(20).superRefine((items, context) => {
    const ids = new Set<number>();
    for (const [index, item] of items.entries()) {
      if (ids.has(item.id)) context.addIssue({ code: "custom", path: [index, "id"], message: "No repitas el mismo producto; ajusta su cantidad." });
      ids.add(item.id);
    }
  }),
  tipoEntrega: z.enum(["delivery", "retiro"]).default("delivery"),
  direccionEnvio: z.string().trim().max(400).optional().default(""),
  latitudEntrega: z.number().min(-90).max(90).nullable().optional(),
  longitudEntrega: z.number().min(-180).max(180).nullable().optional(),
  notas: z.string().optional(),
  frecuenciaRecordatorio: z.union([z.literal(30), z.literal(60), z.literal(90)]).nullable().optional(),
}).superRefine((datos, context) => {
  if (datos.tipoEntrega === "delivery" && datos.direccionEnvio.trim().length < 5) {
    context.addIssue({ code: "custom", path: ["direccionEnvio"], message: "Indica una dirección para el delivery." });
  }
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);

    if (!parsed.success) {
      // Errores de validación Zod -> formato plano por campo
      const errores: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const campo = issue.path.join(".");
        if (!errores[campo]) errores[campo] = issue.message;
      }
      return NextResponse.json(
        { error: "Datos inválidos", errores },
        { status: 400 }
      );
    }

    const { cliente, items, tipoEntrega, direccionEnvio, latitudEntrega, longitudEntrega, notas, frecuenciaRecordatorio } = parsed.data;
    const configuracionEntrega = await obtenerConfiguracionEntrega();
    if (tipoEntrega === "retiro" && !configuracionEntrega.retiroConfigurado) {
      return NextResponse.json({ error: "El retiro en el local todavía no está configurado. Elige delivery o vuelve a intentarlo más tarde." }, { status: 400 });
    }
    const direccionFinal = tipoEntrega === "retiro" ? configuracionEntrega.direccionRetiro : direccionEnvio;
    const latitudFinal = tipoEntrega === "retiro" ? null : latitudEntrega ?? null;
    const longitudFinal = tipoEntrega === "retiro" ? null : longitudEntrega ?? null;
    const accountId = await verificarSesionCliente(req.cookies.get(CUSTOMER_COOKIE)?.value);

    // Si PostgreSQL está despertando o el pool está temporalmente ocupado,
    // permite un segundo intento únicamente cuando el callback ni siquiera comenzó.
    const reciboToken = randomBytes(32).toString("base64url");
    const reciboTokenHash = createHash("sha256").update(reciboToken).digest("hex");
    let resultado: { id: number; numero: string; total: number; email: string; mensajeId: number } | undefined;
    for (let intento = 0; intento < 2; intento += 1) {
      let callbackIniciado = false;
      try {
        // Transacción: cliente + stock + pedido + confirmación, todo atómico.
        resultado = await prisma.$transaction(async (tx) => {
      callbackIniciado = true;
      // Los pedidos hechos con sesión quedan vinculados al perfil autenticado;
      // los pedidos de invitado conservan el flujo existente.
      const cuenta = accountId
        ? await tx.customerAccount.findUnique({ where: { id: accountId } })
        : null;
      if (accountId && !cuenta) throw new Error("La sesión venció. Inicia sesión nuevamente.");
      const datosCliente = cuenta
        ? { nombre: cuenta.nombre, email: cuenta.email, telefono: cuenta.telefono ?? undefined }
        : cliente;

      // 1. Buscar o crear cliente por email
      const customer = await tx.customer.upsert({
        where: { email: datosCliente.email.toLowerCase() },
        update: { nombre: datosCliente.nombre, telefono: datosCliente.telefono ?? null },
        create: { nombre: datosCliente.nombre, email: datosCliente.email.toLowerCase(), telefono: datosCliente.telefono ?? null },
      });

      // 2. Verificar stock y obtener precios actuales
      const productosIds = items.map((i) => i.id);
      const productos = await tx.product.findMany({
        where: { id: { in: productosIds }, activo: true },
      });

      if (productos.length !== items.length) {
        throw new Error("Algunos productos no existen o no están disponibles");
      }

      // 3. Calcular totales y validar stock
      const itemsParaCrear: Array<{
        productId: number;
        cantidad: number;
        precioUnitario: number;
        subtotal: number;
      }> = [];
      let total = 0;
      let costoEnvio = 0;

      for (const item of items) {
        const prod = productos.find((p) => p.id === item.id)!;
        if (prod.stock < item.cantidad) {
          throw new Error(`Stock insuficiente para "${prod.nombre}" (disponible: ${prod.stock})`);
        }
        const subtotal = prod.precio * item.cantidad;
        total += subtotal;
        itemsParaCrear.push({
          productId: prod.id,
          cantidad: item.cantidad,
          precioUnitario: prod.precio,
          subtotal,
        });
      }

      // El descuento condicional evita vender stock que otra compra consumió
      // mientras esta orden se estaba procesando.
      for (const item of items) {
        const descontado = await tx.product.updateMany({
          where: { id: item.id, activo: true, stock: { gte: item.cantidad } },
          data: { stock: { decrement: item.cantidad } },
        });
        if (descontado.count !== 1) {
          const producto = productos.find((p) => p.id === item.id)!;
          throw new Error(`El stock de "${producto.nombre}" cambió. Actualiza el carrito e intenta otra vez.`);
        }
      }

      // 4. Incluir el envío con la misma regla visible en el checkout
      if (tipoEntrega === "delivery" && configuracionEntrega.envioGratisDesdeUsd > 0 && total < configuracionEntrega.envioGratisDesdeUsd) {
        costoEnvio = configuracionEntrega.costoDeliveryUsd;
        total += costoEnvio;
      }

      // 5. Crear pedido
      const numero = `PED-${Date.now().toString(36).toUpperCase()}`;
      const pedido = await tx.order.create({
        data: {
          numero,
          customerId: customer.id,
          accountId: cuenta?.id ?? null,
          estado: "pendiente",
          total,
          costoEnvio,
          tipoEntrega,
          latitudEntrega: latitudFinal,
          longitudEntrega: longitudFinal,
          direccionEnvio: direccionFinal,
          notas: notas ?? null,
          reciboTokenHash,
          entregaEstimadaAt: tipoEntrega === "delivery"
            ? new Date(Date.now() + (latitudFinal != null && longitudFinal != null
              ? estimarDiasDelivery({ latitud: latitudFinal, longitud: longitudFinal }, { latitud: configuracionEntrega.latitudLocal, longitud: configuracionEntrega.longitudLocal })
              : 3) * 24 * 60 * 60 * 1000)
            : null,
          items: {
            create: itemsParaCrear.map((i) => ({
              productId: i.productId,
              cantidad: i.cantidad,
              precioUnitario: i.precioUnitario,
              subtotal: i.subtotal,
            })),
          },
        },
      });

      // Solo se crean avisos si el cliente los pidió expresamente en el checkout.
      // La fecha es orientativa desde la compra; no hay reposición ni cobro automático.
      if (frecuenciaRecordatorio) {
        const proximaEntrega = new Date(Date.now() + frecuenciaRecordatorio * 24 * 60 * 60 * 1000);
        for (const item of itemsParaCrear) {
          const existente = await tx.subscription.findFirst({
            where: { customerId: customer.id, productId: item.productId, estado: "activa" },
            orderBy: { createdAt: "desc" },
            select: { id: true },
          });
          if (existente) {
            await tx.subscription.update({ where: { id: existente.id }, data: { frecuenciaDias: frecuenciaRecordatorio, proximaEntrega } });
          } else {
            await tx.subscription.create({ data: { customerId: customer.id, productId: item.productId, frecuenciaDias: frecuenciaRecordatorio, proximaEntrega } });
          }
        }
      }

      // 6. Preparar automáticamente la confirmación. Se conserva como borrador
      // hasta que Gmail u otro proveedor de correo esté conectado.
      const resumen = itemsParaCrear
        .map((item) => {
          const producto = productos.find((p) => p.id === item.productId)!;
          return `${item.cantidad}× ${producto.nombre}`;
        })
        .join(", ");
      const mensaje = await tx.automationMessage.create({
        data: {
          tipo: "confirmacion_pedido",
          destinatario: datosCliente.email.toLowerCase(),
          asunto: `Recibimos tu pedido ${pedido.numero} · Glasskin`,
          cuerpo: `Hola ${datosCliente.nombre},\n\nRecibimos tu pedido ${pedido.numero}. Incluye: ${resumen}.\nEntrega: ${tipoEntrega === "retiro" ? `retiro en el local (${direccionFinal})` : `delivery a ${direccionFinal}`}${pedido.entregaEstimadaAt ? `\nLlegada estimada: hasta el ${pedido.entregaEstimadaAt.toLocaleDateString("es-PY")}.` : ""}${latitudFinal != null && longitudFinal != null ? `\nUbicación del delivery: https://www.openstreetmap.org/?mlat=${latitudFinal}&mlon=${longitudFinal}#map=17/${latitudFinal}/${longitudFinal}` : ""}\nCosto de envío: ${tipoEntrega === "retiro" || pedido.costoEnvio === 0 ? "sin costo" : `USD ${pedido.costoEnvio.toFixed(2)}`}\nTotal: USD ${total.toFixed(2)}. Te avisaremos cuando cambie de estado.\n\nGracias por elegir Glasskin.`,
          orderId: pedido.id,
        },
      });

      return { id: pedido.id, numero: pedido.numero, total, email: datosCliente.email.toLowerCase(), mensajeId: mensaje.id };
        }, { maxWait: 30_000, timeout: 45_000 });
        break;
      } catch (error) {
        const inicioAplazado =
          !callbackIniciado &&
          error && typeof error === "object" &&
          "code" in error && error.code === "P2028" &&
          error instanceof Error && error.message.includes("Unable to start a transaction");
        if (!inicioAplazado || intento === 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    if (!resultado) throw new Error("No se pudo iniciar el pedido. Vuelve a intentarlo.");

    // El pedido ya quedó confirmado en la base; un fallo del proveedor de correo
    // no debe hacer que el cliente repita el checkout.
    // El email se procesa en segundo plano: el cliente recibe confirmación sin esperar al proveedor.
    void enviarMensajeAutomatico(resultado.mensajeId);

    const response = NextResponse.json({ ok: true, numero: resultado.numero, total: resultado.total, email: resultado.email });
    response.cookies.set(`glasskin_recibo_${resultado.id}`, reciboToken, { httpOnly: true, secure: req.nextUrl.protocol === "https:", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "Error interno";
    console.error("POST /api/pedidos error:", e);
    if (e && typeof e === "object" && "code" in e && e.code === "P2028") {
      return NextResponse.json(
        { error: "La tienda está procesando varias solicitudes. Tu carrito sigue guardado; espera unos segundos y vuelve a intentar." },
        { status: 503, headers: { "Retry-After": "3" } },
      );
    }
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
