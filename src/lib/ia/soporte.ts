import { buscarProductosLocal, inferirCategoriaConsulta, type OpcionesBusquedaLocal, type ProductoCatalogoIA } from "@/lib/ia/fallback";
import { ENTREGA_DEFAULTS } from "@/lib/entregas";

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Respuestas seguras sin proveedor externo, basadas en las reglas reales de Glasskin. */
export function responderSoporteLocal(
  consulta: string,
  catalogo: ProductoCatalogoIA[],
  entrega: { direccionRetiro: string; costoDeliveryUsd: number; envioGratisDesdeUsd: number } = ENTREGA_DEFAULTS,
  opcionesBusqueda: OpcionesBusquedaLocal = {},
  idioma: "es" | "en" = "es",
) {
  const en = idioma === "en";
  const texto = normalizar(consulta);
  const productoMencionado = catalogo.find((producto) => {
    const nombre = normalizar(producto.nombre);
    const marca = normalizar(producto.brand.nombre);
    return (nombre.length > 4 && texto.includes(nombre)) || (marca.length > 3 && texto.includes(marca));
  });

  if (/\b(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|saludos|hello|hi|good morning|good afternoon)\b/.test(texto)) {
    return { respuesta: en ? "Hi! I can help with products, routines, shipping, orders, prices, and general skincare questions. What would you like to know?" : "¡Hola! Puedo ayudarte con productos, rutinas, envíos, pedidos, precios y el uso general del skincare. ¿Qué necesitas saber?", productos: [] };
  }
  if (/\b(envio|envios|entrega|entregan|demora|demoran|llega|llegan|costo de envio|shipping|delivery|ship|arrive)\b/.test(texto)) {
    const costo = new Intl.NumberFormat(en ? "en-US" : "es-PY", { style: "currency", currency: "USD" }).format(entrega.costoDeliveryUsd);
    const regla = entrega.envioGratisDesdeUsd > 0 ? (en ? `Delivery is free on orders over USD ${entrega.envioGratisDesdeUsd.toFixed(2)} and costs ${costo} below that amount.` : `El delivery es gratis desde USD ${entrega.envioGratisDesdeUsd.toFixed(2)} y cuesta ${costo} para compras menores.`) : (en ? "Delivery is free." : "El delivery es gratis.");
    return { respuesta: en ? `${regla} The store estimates delivery within 3 days, depending on distance. Free pickup may also be available at ${entrega.direccionRetiro}; check the checkout options.` : `${regla} Para delivery, la tienda muestra una fecha estimada de hasta 3 días según la distancia al local. También puedes retirar gratis en ${entrega.direccionRetiro}, cuando esa opción esté habilitada en el checkout.`, productos: [] };
  }
  if (/\b(pago|pagar|pagos|tarjeta|transferencia|efectivo|cuotas|cobran|payment|pay|card|cash|installments)\b/.test(texto)) {
    return { respuesta: en ? "Checkout records your order but does not process real online payments yet. Do not enter card details in the store. Sign in to My Account to check an order you have placed." : "El checkout permite registrar el pedido, pero por ahora no procesa pagos reales en línea. No ingreses datos de tarjeta en la tienda. Si ya creaste un pedido, puedes ver su estado iniciando sesión en Mi perfil.", productos: [] };
  }
  if (/\b(devoluci|reembolso|reintegro|cambio de producto|garantia|garantía)\w*/.test(texto)) {
    return { respuesta: en ? "I can't confirm the store's return or exchange terms because a policy is not published. Use the contact option below the chat so the team can review your case." : "No encuentro una política de cambios o devoluciones publicada para confirmarte las condiciones. Pulsa «¿Necesitás que te contacte una persona?» debajo del chat y el equipo podrá revisar tu caso.", productos: [] };
  }
  if (/\b(horario|abren|abierto|ubicacion|direccion|dirección|donde queda|dónde queda|hours|location|address|where are you)\b/.test(texto)) {
    return { respuesta: en ? "Glasskin is based in Presidente Franco, Paraguay. Store hours and a full street address are not published; use the contact option in this chat to arrange a visit." : "Glasskin está en Presidente Franco, Paraguay. No tengo un horario ni una dirección detallada publicados; si necesitas coordinar una visita, envía una consulta al equipo desde este chat.", productos: [] };
  }
  if (/\b(rutina|orden de productos|que va primero|qué va primero|como empiezo|cómo empiezo|pasos|routine|where do i start|what goes first)\b/.test(texto)) {
    return { respuesta: en ? "A simple routine can be: cleanse, moisturize, and apply sunscreen in the morning; cleanse and moisturize at night. Introduce treatments one at a time, patch test first, and follow the package directions. Tell me your skin type and concerns and I can look for catalog options." : "Una rutina sencilla puede ser: por la mañana, limpieza, hidratante y protector solar; por la noche, limpieza e hidratante. Incorpora tratamientos de a uno, prueba primero en una zona pequeña y sigue las instrucciones del envase. Si me dices tu tipo de piel y qué quieres mejorar, busco opciones del catálogo.", productos: [] };
  }
  if (productoMencionado && /\b(ingrediente|ingredientes|contiene|composicion|composición)\b/.test(texto)) {
    const ingredientes = productoMencionado.ingredientes?.map((item) => item.ingrediente.nombre) ?? [];
    return { respuesta: ingredientes.length ? (en ? `${productoMencionado.nombre} lists these highlighted ingredients: ${ingredientes.join(", ")}. Check the package for the full INCI list.` : `${productoMencionado.nombre} incluye estos ingredientes destacados: ${ingredientes.join(", ")}. Revisa el envase para confirmar la lista INCI completa.`) : (en ? `I don't have the ingredient list for ${productoMencionado.nombre}. Check the product label or contact the team.` : `No tengo los ingredientes cargados para ${productoMencionado.nombre}. Puedes revisar la etiqueta del envase o enviar una consulta al equipo.`), productos: [] };
  }
  if (productoMencionado && /\b(usar|uso|aplicar|aplicacion|aplicación|como se usa|cómo se usa)\b/.test(texto)) {
    return { respuesta: productoMencionado.modoUso ? (en ? `For ${productoMencionado.nombre}: ${productoMencionado.modoUso}` : `Para ${productoMencionado.nombre}: ${productoMencionado.modoUso}`) : (en ? `I don't have specific directions for ${productoMencionado.nombre}. Follow the package and patch test first.` : `No tengo instrucciones específicas cargadas para ${productoMencionado.nombre}. Sigue el envase y realiza una prueba de parche antes de usarlo.`), productos: [] };
  }
  if (/\b(precio|cuesta|cuestan|vale|valor|price|cost|how much)\b/.test(texto)) {
    if (productoMencionado) {
      const precio = new Intl.NumberFormat(en ? "en-US" : "es-PY", { style: "currency", currency: "USD" }).format(productoMencionado.precio);
      return { respuesta: en ? `${productoMencionado.nombre} costs ${precio}. Prices are stored in USD; you can change the currency in the store menu.` : `${productoMencionado.nombre} cuesta ${precio}. El precio está guardado en USD; puedes cambiar la moneda desde el menú de la tienda.`, productos: [{ id: productoMencionado.id, slug: productoMencionado.slug, nombre: productoMencionado.nombre, marca: productoMencionado.brand.nombre, precio: productoMencionado.precio, imagen: productoMencionado.imagen }] };
    }
    return { respuesta: en ? "Which product would you like a price for? Tell me its name or brand and I'll look it up in the catalog." : "¿De qué producto quieres consultar el precio? Dime su nombre o marca y lo busco en el catálogo disponible.", productos: [] };
  }
  if (/\b(usar|uso|aplicar|aplicacion|aplicación|cada cuanto|cada cuánto|mezclar|combinar|ingrediente|ingredientes|retinol|acido|ácido|niacinamida|vitamina c|exfoliar|exfoliante)\b/.test(texto)) {
    return { respuesta: en ? "Follow each product's directions, introduce one active ingredient at a time, and patch test first. Tell me the exact product names and I can review the information available. For severe burning, swelling, or a persistent reaction, stop using the product and consult a dermatologist." : "Sigue el modo de uso indicado en cada producto, introduce un activo nuevo por vez y haz una prueba de parche. No puedo confirmar compatibilidad sin saber los productos exactos; dime sus nombres y te ayudo a revisar la información disponible. Si tienes ardor intenso, hinchazón o una reacción persistente, suspende el producto y consulta a dermatología.", productos: [] };
  }
  if (/\b(catalogo|catalog|product|products|recomiend|recommend|looking for|need|skin|acne|blemish|dark spot|dry|oily|combination|sensitive|pores|wrinkles|sunscreen|cleanser|serum|moisturizer|piel|acne|granos|manchas|seca|grasa|mixta|sensible|poros|arrugas|protector solar|limpiador|serum|hidratante)\b/.test(texto)) {
    const encontrados = buscarProductosLocal(consulta, catalogo, {
      categoria: opcionesBusqueda.categoria ?? inferirCategoriaConsulta(consulta),
      precioMaxUSD: opcionesBusqueda.precioMaxUSD,
      limite: 3,
    }).productos;
    return {
      respuesta: encontrados.length
        ? (en ? "I searched the available catalog and selected options based on their skin type, category, and description. Tell me what you want to address to refine the results." : "Busqué en los productos disponibles del catálogo y elegí estas opciones por su tipo de piel, categoría y descripción. Si me cuentas qué buscas lograr o cuál es tu tipo de piel, puedo afinar la selección.")
        : (en ? "I couldn't find a clear match. Tell me your skin type and concern, such as hydration, dark spots, or acne." : "No encontré una coincidencia clara entre los productos disponibles. Prueba decirme tu tipo de piel (seca, grasa, mixta o sensible) y qué quieres mejorar, por ejemplo hidratación, manchas o acné."),
      productos: encontrados.map((producto) => ({ id: producto.id, slug: producto.slug, nombre: producto.nombre, marca: producto.marca, precio: producto.precio, imagen: producto.imagen })),
    };
  }

  return { respuesta: en ? "I can help with the catalog, basic routines, product use, delivery, and orders. Tell me what product or topic you have in mind. For help with a specific order or policy, use the contact option below the chat." : "Puedo orientarte sobre el catálogo disponible, rutinas básicas, uso general de productos, envíos y pedidos. Para ayudarte mejor, cuéntame qué producto o tema tienes en mente. Si necesitas una respuesta específica sobre una compra o una política, pulsa «¿Necesitás que te contacte una persona?» debajo del chat.", productos: [] };
}
