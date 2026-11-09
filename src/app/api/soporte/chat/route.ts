import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { crearClienteIA, iaExternaConfigurada, MODELO_IA } from "@/lib/ia/proveedor";
import { CUSTOMER_COOKIE, verificarSesionCliente } from "@/lib/customer-auth";
import { etiquetaDe, ESTADOS_PEDIDO, leerListaJson } from "@/lib/constantes";
import { responderSoporteLocal } from "@/lib/ia/soporte";
import { obtenerConfiguracionEntrega } from "@/lib/entregas";
import { extraerPresupuestoConsulta } from "@/lib/productos";
import { obtenerTasaServer } from "@/lib/format";
import { inferirCategoriaConsulta } from "@/lib/ia/fallback";

const BodySchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1000) })).min(1).max(8),
});

const productosSelect = {
  id: true,
  slug: true,
  nombre: true,
  brand: { select: { nombre: true } },
  category: { select: { slug: true } },
  precio: true,
  stock: true,
  tipoPiel: true,
  preocupaciones: true,
  descripcion: true,
  modoUso: true,
  imagen: true,
  ingredientes: { select: { ingrediente: { select: { nombre: true } } } },
} as const;

export async function POST(request: NextRequest) {
  try {
    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Escribí una consulta breve para poder ayudarte." }, { status: 400 });

    const ultimoMensaje = [...parsed.data.messages].reverse().find((message) => message.role === "user")?.content ?? "";
    const mensajesUsuario = parsed.data.messages.filter((message) => message.role === "user");
    const preguntaDeSeguimiento = /\b(y ese|y esa|y eso|y el precio|cuanto cuesta|cuanto sale|ingredientes|como se usa|y para|y con|y si)\b/i.test(ultimoMensaje.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
    const contextoConversacion = preguntaDeSeguimiento && mensajesUsuario.length > 1
      ? `${mensajesUsuario.at(-2)?.content ?? ""}\n${ultimoMensaje}`
      : ultimoMensaje;

    // La consulta de pedidos se resuelve con datos de la sesión autenticada,
    // nunca buscando por número de pedido, correo o información no verificada.
    if (/\b(mi pedido|mis pedidos|mi orden|mis ordenes|estado de mi pedido|estado de mis pedidos|estado de mi orden|donde esta mi pedido|donde esta mi orden|seguimiento de mi pedido|mi compra|mis compras)\b/i.test(ultimoMensaje.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())) {
      const accountId = await verificarSesionCliente(request.cookies.get(CUSTOMER_COOKIE)?.value);
      if (!accountId) {
        return NextResponse.json({
          respuesta: "Para consultar un pedido necesito proteger tus datos. Inicia sesión en tu cuenta Glasskin y vuelve a preguntarme; allí también verás el seguimiento completo.",
          enlaceCuenta: true,
          productos: [],
        });
      }
      const pedidos = await prisma.order.findMany({
        where: { accountId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          numero: true,
          estado: true,
          createdAt: true,
          items: { select: { cantidad: true, producto: { select: { nombre: true } } } },
        },
      });
      if (!pedidos.length) {
        return NextResponse.json({ respuesta: "No encuentro pedidos vinculados a esta cuenta. Puedes revisar tu perfil o escribirnos por WhatsApp si hiciste la compra como invitado.", enlaceCuenta: true, productos: [] });
      }
      const detalle = pedidos.map((pedido) => {
        const fecha = new Intl.DateTimeFormat("es-PY", { dateStyle: "medium", timeZone: "America/Asuncion" }).format(pedido.createdAt);
        const articulos = pedido.items.map((item) => `${item.cantidad} × ${item.producto.nombre}`).join(", ");
        return `• ${pedido.numero} — ${etiquetaDe(ESTADOS_PEDIDO, pedido.estado)} (${fecha})${articulos ? `\n  ${articulos}` : ""}`;
      }).join("\n");
      return NextResponse.json({ respuesta: `Estos son tus pedidos más recientes:\n${detalle}\n\nEl estado y los detalles también están en Mi perfil.`, enlaceCuenta: true, productos: [] });
    }

    // La respuesta sobre pagos es fija y no necesita consultar productos ni
    // datos del cliente. Responder antes evita demoras cuando la base despierta.
    const consultaNormalizada = ultimoMensaje.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (/\b(pago|pagar|pagos|tarjeta|transferencia|efectivo|cuotas|cobran)\b/.test(consultaNormalizada)) {
      return NextResponse.json(responderSoporteLocal(ultimoMensaje, []));
    }

    const accountId = await verificarSesionCliente(request.cookies.get(CUSTOMER_COOKIE)?.value);
    const perfil = accountId ? await prisma.customerAccount.findUnique({
      where: { id: accountId },
      select: { consentimientoPersonalizacion: true, tipoPiel: true, preocupacionesPiel: true, rutinaGuardada: true },
    }) : null;

    if (/\b(mi rutina|rutina guardada|rutina que guard[eé])\b/i.test(ultimoMensaje)) {
      if (!perfil?.consentimientoPersonalizacion) {
        return NextResponse.json({ respuesta: "Para guardar y volver a consultar tu rutina, activa la memoria de Glasskin desde Mi perfil.", enlaceCuenta: true, productos: [] });
      }
      let rutina: { manana?: Array<{ nombre?: string; productoNombre?: string | null; instrucciones?: string }>; noche?: Array<{ nombre?: string; productoNombre?: string | null; instrucciones?: string }> } | null = null;
      try { rutina = perfil.rutinaGuardada ? JSON.parse(perfil.rutinaGuardada) : null; } catch { rutina = null; }
      if (!rutina?.manana?.length && !rutina?.noche?.length) {
        return NextResponse.json({ respuesta: "Todavía no guardaste una rutina. Puedo armarte una nueva en Glasskin Skin AI y guardarla en Mi perfil.", enlaceCuenta: true, productos: [] });
      }
      const formato = (momento: string, pasos: Array<{ nombre?: string; productoNombre?: string | null; instrucciones?: string }>) => `${momento}:\n${pasos.map((paso) => `• ${paso.nombre ?? "Paso"}${paso.productoNombre ? ` — ${paso.productoNombre}` : ""}${paso.instrucciones ? `: ${paso.instrucciones}` : ""}`).join("\n")}`;
      return NextResponse.json({ respuesta: `Esta es la rutina que guardaste:\n\n${formato("Mañana", rutina.manana ?? [])}\n\n${formato("Noche", rutina.noche ?? [])}`, enlaceCuenta: true, productos: [] });
    }

    const productos = await prisma.product.findMany({
      where: { activo: true, stock: { gt: 0 } }, select: productosSelect, orderBy: { nombre: "asc" }, take: 150,
    });
    const configuracionEntrega = await obtenerConfiguracionEntrega();
    const presupuesto = extraerPresupuestoConsulta(contextoConversacion);
    const tasa = presupuesto?.moneda === "PYG" ? await obtenerTasaServer() : 1;
    const opcionesBusqueda = {
      categoria: inferirCategoriaConsulta(contextoConversacion),
      precioMaxUSD: presupuesto ? (presupuesto.moneda === "PYG" ? presupuesto.importe / tasa : presupuesto.importe) : undefined,
    };

    const consultaDeContextoNormalizada = contextoConversacion.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (/\b(compara|comparar|comparame|diferencia|diferencias|versus|vs|contra)\b/.test(consultaDeContextoNormalizada)) {
      const partes = consultaDeContextoNormalizada.match(/(?:entre|compara|comparar|comparame)\s+(.+?)\s+(?:y|con|vs|versus|contra)\s+(.+?)(?:\?|$)/)
        ?? consultaDeContextoNormalizada.match(/(.+?)\s+(?:vs|versus|contra)\s+(.+?)(?:\?|$)/);
      const puntuarNombre = (fragmento: string) => productos.map((producto) => {
        const tokensNombre = `${producto.nombre} ${producto.brand.nombre}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 2 && !["de", "del", "con", "para", "the", "and"].includes(token));
        let coincidencia = 0;
        for (let largo = 2; largo <= Math.min(5, tokensNombre.length); largo += 1) {
          for (let inicio = 0; inicio + largo <= tokensNombre.length; inicio += 1) {
            if (fragmento.includes(tokensNombre.slice(inicio, inicio + largo).join(" "))) coincidencia = Math.max(coincidencia, largo);
          }
        }
        return { producto, coincidencia };
      }).filter((item) => item.coincidencia >= 2).sort((a, b) => b.coincidencia - a.coincidencia);
      const opcionesA = partes ? puntuarNombre(partes[1]) : [];
      const opcionesB = partes ? puntuarNombre(partes[2]) : [];
      const productoA = opcionesA.length === 1 || opcionesA[0]?.coincidencia > (opcionesA[1]?.coincidencia ?? 0) ? opcionesA[0]?.producto : null;
      const productoB = opcionesB.length === 1 || opcionesB[0]?.coincidencia > (opcionesB[1]?.coincidencia ?? 0) ? opcionesB[0]?.producto : null;
      if (!productoA || !productoB || productoA.id === productoB.id) {
        return NextResponse.json({ respuesta: "Puedo compararlos usando los datos reales del catálogo. Escribí los dos nombres de producto completos, por ejemplo: “¿Qué diferencia hay entre [producto A] y [producto B]?”", productos: [] });
      }
      const datosProducto = (producto: typeof productos[number]) => {
        const tipos = leerListaJson(producto.tipoPiel);
        const preocupaciones = leerListaJson(producto.preocupaciones);
        const ingredientes = producto.ingredientes.map((item) => item.ingrediente.nombre);
        return `• ${producto.nombre} (${producto.brand.nombre}) — USD ${producto.precio.toFixed(2)}\n  Categoría: ${producto.category.slug}. Ingredientes registrados: ${ingredientes.slice(0, 5).join(", ") || "no especificados"}. Tipos de piel del catálogo: ${tipos.join(", ") || "no especificados"}. Necesidades asociadas: ${preocupaciones.join(", ") || "no especificadas"}. Uso: ${producto.modoUso.slice(0, 180)}`;
      };
      return NextResponse.json({ respuesta: `Comparación según las fichas actuales:\n${datosProducto(productoA)}\n${datosProducto(productoB)}\n\nLa diferencia que más importa depende de los ingredientes y de qué necesites priorizar. Esta comparación resume datos del catálogo; no garantiza resultados ni reemplaza una consulta dermatológica.`, productos: [productoA, productoB].map((producto) => ({ id: producto.id, slug: producto.slug, nombre: producto.nombre, marca: producto.brand.nombre, precio: producto.precio, imagen: producto.imagen })) });
    }

    const preferenciasConsentidas = perfil?.consentimientoPersonalizacion && perfil.tipoPiel
      ? ` Tipo de piel ${perfil.tipoPiel}; prioridades ${leerListaJson(perfil.preocupacionesPiel).join(", ") || "ninguna indicada"}.`
      : "";
    if (!iaExternaConfigurada()) {
      const resultado = responderSoporteLocal(`${contextoConversacion}${preferenciasConsentidas}`, productos, configuracionEntrega, opcionesBusqueda);
      return NextResponse.json(resultado);
    }

    const consultaConRecomendacion = /\b(recomiend|busco|necesito|producto|productos|piel|acne|granos|manchas|sensible|protector|limpiador|serum|hidratante)\b/.test(consultaDeContextoNormalizada);
    const catalogoRecomendacion = productos.filter((producto) =>
      !consultaConRecomendacion ||
      ((!opcionesBusqueda.categoria || producto.category.slug === opcionesBusqueda.categoria) &&
        (opcionesBusqueda.precioMaxUSD === undefined || producto.precio <= opcionesBusqueda.precioMaxUSD))
    );
    const catalogo = catalogoRecomendacion.map((producto) => ({
      id: producto.id,
      nombre: producto.nombre,
      marca: producto.brand.nombre,
      categoria: producto.category.slug,
      precio: producto.precio,
      descripcion: producto.descripcion.slice(0, 220),
      modoUso: producto.modoUso.slice(0, 350),
      ingredientes: producto.ingredientes.map((item) => item.ingrediente.nombre),
      disponible: true,
      stock: "disponible",
    }));
    const client = crearClienteIA();
    try {
      const result = await client.chat.completions.create({
        model: MODELO_IA,
        temperature: 0.35,
        max_tokens: 650,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Sos el asistente de atención de Glasskin, tienda de skincare en Paraguay. Respondé en español natural, amable y claro, con información útil (hasta 120 palabras). Puedes responder sobre catálogo, pedidos autenticados, precios, checkout, envíos y uso general de cosméticos. Compara productos solo con ingredientes, uso, tipos de piel y necesidades que aparezcan en sus fichas. No inventes beneficios ni concluyas cuál funciona mejor sin evidencia. Delivery: ${configuracionEntrega.envioGratisDesdeUsd <= 0 ? "gratis" : `gratis desde USD ${configuracionEntrega.envioGratisDesdeUsd.toFixed(2)}, costo USD ${configuracionEntrega.costoDeliveryUsd.toFixed(2)} debajo de ese umbral`}; el checkout informa una estimación de 1 a 3 días basada en la distancia aproximada. Retiro ${configuracionEntrega.retiroConfigurado ? `habilitado en ${configuracionEntrega.direccionRetiro}` : "no habilitado: falta configurar una dirección completa"}. El checkout todavía no procesa pagos reales en línea. No prometas una hora exacta ni un plazo mayor a tres días. Los horarios y la política de devoluciones no están configurados: dilo con transparencia e indica que puede usar el botón de atención humana para que el equipo revise su consulta. Nunca solicites datos de tarjeta. No inventes datos de pedidos, precios, stock, políticas, contacto ni efectos clínicos. Para recomendaciones, elige únicamente IDs del catálogo disponible y devuelve como máximo 3. No diagnostiques ni prometas resultados; ante una reacción intensa o persistente recomienda suspender el producto y consultar dermatología. Conserva el contexto de los mensajes recientes. Devuelve SOLO JSON: {"respuesta":"texto","productoIds":[1,2]}.${preferenciasConsentidas ? ` Contexto de personalización consentido por el cliente: ${preferenciasConsentidas} Úsalo solo para orientar recomendaciones.` : ""} Catálogo actual disponible: ${JSON.stringify(catalogo)}`,
          },
          ...parsed.data.messages.slice(-6),
        ],
      });
      const text = result.choices[0]?.message?.content ?? "";
      const clean = text.trim().replace(/^```json\s*|```\s*$/g, "");
      const data = JSON.parse(clean) as { respuesta?: unknown; productoIds?: unknown };
      const ids = Array.isArray(data.productoIds) ? data.productoIds.filter((id): id is number => Number.isInteger(id) && productos.some((producto) => producto.id === id)).slice(0, 3) : [];
      const productosRespuesta = productos.filter((producto) => ids.includes(producto.id)).map((producto) => ({
        id: producto.id, slug: producto.slug, nombre: producto.nombre, marca: producto.brand.nombre, precio: producto.precio, imagen: producto.imagen,
      }));
      const respuesta = typeof data.respuesta === "string" ? data.respuesta.slice(0, 1500) : "¿Podés contarme un poco más para orientarte mejor?";
      return NextResponse.json({ respuesta, productos: productosRespuesta });
    } catch (errorIA) {
      console.error("Asistente Glasskin: se usará respuesta local porque la IA no respondió:", errorIA);
      return NextResponse.json(responderSoporteLocal(`${contextoConversacion}${preferenciasConsentidas}`, productos, configuracionEntrega, opcionesBusqueda));
    }
  } catch (error) {
    console.error("POST /api/soporte/chat error:", error);
    return NextResponse.json({ error: "Ahora no pude responder. Probá de nuevo en un momento." }, { status: 503 });
  }
}
