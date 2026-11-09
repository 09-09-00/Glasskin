import { prisma } from "@/lib/prisma";

function inicioDelDiaEnParaguay() {
  const ahora = new Date();
  const fechaLocal = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Asuncion",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
  return new Date(`${fechaLocal}T00:00:00-03:00`);
}

export async function obtenerResumenCopiloto() {
  const hoy = inicioDelDiaEnParaguay();
  const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const hace60Dias = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [productosActivos, pedidos, pendientes, pendientesAtrasados, stockBajo, agotados, consultasAbiertas, consultasAtrasadas, ventasHoy, ventas30Dias, ultimosPedidos, inventarioConVentas] = await Promise.all([
    prisma.product.count({ where: { activo: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { estado: "pendiente" } }),
    prisma.order.count({ where: { estado: "pendiente", createdAt: { lt: hace24Horas } } }),
    prisma.product.count({ where: { activo: true, stock: { gt: 0, lt: 5 } } }),
    prisma.product.count({ where: { activo: true, stock: 0 } }),
    prisma.supportCase.count({ where: { estado: "abierta" } }),
    prisma.supportCase.count({ where: { estado: "abierta", createdAt: { lt: hace24Horas } } }),
    prisma.order.aggregate({ where: { createdAt: { gte: hoy }, estado: { not: "cancelado" } }, _sum: { total: true }, _count: true }),
    prisma.order.aggregate({ where: { createdAt: { gte: hace30Dias }, estado: { not: "cancelado" } }, _sum: { total: true }, _count: true }),
    prisma.order.findMany({
      take: 12,
      orderBy: { createdAt: "desc" },
      select: {
        numero: true,
        estado: true,
        total: true,
        createdAt: true,
        items: { select: { cantidad: true, producto: { select: { nombre: true } } } },
      },
    }),
    prisma.product.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      select: {
        id: true, nombre: true, stock: true, precio: true, createdAt: true, descripcion: true, modoUso: true,
        ingredientes: { select: { ingredientId: true } }, brand: { select: { nombre: true } },
        orderItems: {
          where: { order: { createdAt: { gte: hace60Dias }, estado: { not: "cancelado" } } },
          select: { cantidad: true, order: { select: { createdAt: true } } },
        },
      },
    }),
  ]);

  // Cubre 30 días al ritmo reciente con un 20% de margen. Es una propuesta
  // explicable, no una compra ni una promesa de demanda futura.
  const prioridadAlerta = (producto: { stock: number; demandaEnAumento: boolean; sinMovimiento30Dias: boolean }) =>
    producto.stock === 0 ? 0 : producto.demandaEnAumento ? 1 : producto.stock < 5 ? 2 : producto.sinMovimiento30Dias ? 3 : 4;
  const productosPorReponer = inventarioConVentas
    .map((producto) => {
      const unidadesVendidas30Dias = producto.orderItems.reduce((total, item) => total + (item.order.createdAt >= hace30Dias ? item.cantidad : 0), 0);
      const unidadesPeriodoAnterior = producto.orderItems.reduce((total, item) => total + (item.order.createdAt < hace30Dias ? item.cantidad : 0), 0);
      const unidadesDiarias = unidadesVendidas30Dias / 30;
      const diasDeStockEstimados = unidadesDiarias > 0 ? Math.floor(producto.stock / unidadesDiarias) : null;
      const sugerenciaReposicion = Math.max(0, Math.ceil(unidadesVendidas30Dias * 1.2 - producto.stock));
      const demandaEnAumento = unidadesVendidas30Dias >= 3 && unidadesPeriodoAnterior > 0 && unidadesVendidas30Dias >= unidadesPeriodoAnterior * 1.5;
      const sinMovimiento30Dias = producto.stock > 0 && producto.createdAt < hace30Dias && unidadesVendidas30Dias === 0;
      return { id: producto.id, nombre: producto.nombre, stock: producto.stock, precio: producto.precio, brand: producto.brand, unidadesVendidas30Dias, unidadesPeriodoAnterior, diasDeStockEstimados, sugerenciaReposicion, demandaEnAumento, sinMovimiento30Dias };
    })
    .filter((producto) => producto.stock < 5 || producto.sugerenciaReposicion > 0 || producto.demandaEnAumento || producto.sinMovimiento30Dias)
    .sort((a, b) => {
      return prioridadAlerta(a) - prioridadAlerta(b)
        || (a.diasDeStockEstimados ?? Number.MAX_SAFE_INTEGER) - (b.diasDeStockEstimados ?? Number.MAX_SAFE_INTEGER)
        || b.sugerenciaReposicion - a.sugerenciaReposicion;
    })
    .slice(0, 15);

  const fichasIncompletas = inventarioConVentas.map((producto) => {
    const faltantes = [
      producto.descripcion.trim().length < 60 ? "descripción detallada" : null,
      producto.modoUso.trim().length < 25 ? "modo de uso" : null,
      producto.ingredientes.length === 0 ? "ingredientes clave" : null,
    ].filter((item): item is string => Boolean(item));
    return { id: producto.id, nombre: producto.nombre, marca: producto.brand.nombre, faltantes };
  }).filter((producto) => producto.faltantes.length > 0).slice(0, 15);

  return {
    actualizado: new Date().toISOString(),
    moneda: "USD",
    indicadores: {
      productosActivos,
      pedidos,
      pedidosPendientes: pendientes,
      pedidosPendientesMas24Horas: pendientesAtrasados,
      consultasAbiertas,
      consultasAbiertasMas24Horas: consultasAtrasadas,
      stockBajo,
      agotados,
      pedidosHoy: ventasHoy._count,
      importePedidosHoy: ventasHoy._sum.total ?? 0,
      pedidos30Dias: ventas30Dias._count,
      importePedidos30Dias: ventas30Dias._sum.total ?? 0,
    },
    productosPorReponer,
    fichasIncompletas,
    ultimosPedidos: ultimosPedidos.map((pedido) => ({
      numero: pedido.numero,
      estado: pedido.estado,
      total: pedido.total,
      creado: pedido.createdAt.toISOString(),
      articulos: pedido.items.map((item) => ({ nombre: item.producto.nombre, cantidad: item.cantidad })),
    })),
  };
}

type ResumenCopiloto = Awaited<ReturnType<typeof obtenerResumenCopiloto>>;

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function respuestaLocalCopiloto(pregunta: string, resumen: ResumenCopiloto) {
  const consulta = normalizar(pregunta);
  const { indicadores } = resumen;
  const fmt = (valor: number) => `USD ${valor.toLocaleString("es-PY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (/stock|agotad|reponer|inventario/.test(consulta)) {
    const listado = resumen.productosPorReponer.length
      ? resumen.productosPorReponer.map((producto) => `• ${producto.nombre} (${producto.brand.nombre}): quedan ${producto.stock}; vendió ${producto.unidadesVendidas30Dias} en los últimos 30 días${producto.diasDeStockEstimados === null ? "; sin demanda reciente medida" : `; stock estimado para ${producto.diasDeStockEstimados} días`}${producto.demandaEnAumento ? `; demanda subió frente al período anterior (${producto.unidadesPeriodoAnterior} → ${producto.unidadesVendidas30Dias})` : ""}${producto.sinMovimiento30Dias ? "; sin ventas registradas en 30 días" : ""}; sugerencia orientativa: reponer ${producto.sugerenciaReposicion} unidades`).join("\n")
      : "No hay productos activos con menos de 5 unidades.";
    return `Hay ${indicadores.stockBajo} productos con stock bajo y ${indicadores.agotados} agotados.\n\n${listado}`;
  }
  if (/consulta|soporte|reclamo|cliente/.test(consulta)) {
    return `Hay ${indicadores.consultasAbiertas} consultas de clientes abiertas; ${indicadores.consultasAbiertasMas24Horas} llevan más de 24 horas esperando seguimiento. Puedes revisar la bandeja en Administración → Consultas.`;
  }
  if (/sin movimiento|estancad|sin ventas|no se vende|no se venden|no vende/.test(consulta)) {
    const sinMovimiento = resumen.productosPorReponer.filter((producto) => producto.sinMovimiento30Dias);
    return sinMovimiento.length
      ? `Estos productos con stock no registraron ventas en los últimos 30 días:\n${sinMovimiento.slice(0, 8).map((producto) => `• ${producto.nombre}: ${producto.stock} unidades`).join("\n")}\n\nEs una señal para revisar, no una recomendación automática de descuento.`
      : "No detecté productos con stock y sin ventas en los últimos 30 días.";
  }
  if (/demanda|crec|aument|tendencia/.test(consulta)) {
    const enAumento = resumen.productosPorReponer.filter((producto) => producto.demandaEnAumento);
    return enAumento.length
      ? `La demanda aumentó al menos un 50% frente a los 30 días anteriores en estos productos:\n${enAumento.slice(0, 8).map((producto) => `• ${producto.nombre}: ${producto.unidadesPeriodoAnterior} → ${producto.unidadesVendidas30Dias} unidades`).join("\n")}\n\nEs una comparación de ventas recientes; conviene revisar existencias antes de reponer.`
      : "No detecté productos con un aumento claro de demanda en los últimos 30 días.";
  }
  if (/venta|ingreso|factur|recaud/.test(consulta)) {
    return `Hoy se registraron ${indicadores.pedidosHoy} pedidos por un importe de ${fmt(indicadores.importePedidosHoy)}. En los últimos 30 días: ${indicadores.pedidos30Dias} pedidos por ${fmt(indicadores.importePedidos30Dias)}. Los cancelados no se incluyen; el sistema no confirma si estos importes ya fueron cobrados.`;
  }
  if (/pedido|orden|compra|pendiente/.test(consulta)) {
    const recientes = resumen.ultimosPedidos.slice(0, 5).map((pedido) => `• ${pedido.numero}: ${pedido.estado}, ${fmt(pedido.total)}`).join("\n");
    return `Hay ${indicadores.pedidosPendientes} pedidos pendientes; ${indicadores.pedidosPendientesMas24Horas} llevan más de 24 horas sin actualizar. También hay ${indicadores.consultasAbiertas} consultas de clientes abiertas. En total hay ${indicadores.pedidos} pedidos.\n\nPedidos recientes:\n${recientes || "Todavía no hay pedidos."}`;
  }
  if (/ficha|descripcion|ingrediente|modo de uso|informacion faltante/.test(consulta)) {
    const faltan = resumen.fichasIncompletas;
    return faltan.length
      ? `Detecté ${faltan.length} fichas con información incompleta. Puedes priorizar estas:\n${faltan.slice(0, 10).map((producto) => `• ${producto.nombre} (${producto.marca}): falta ${producto.faltantes.join(", ")}`).join("\n")}\n\nSon campos vacíos o muy breves en el catálogo; conviene verificarlos antes de completar una descripción.`
      : "Las fichas activas tienen descripción, modo de uso e ingredientes registrados según los criterios básicos del catálogo.";
  }
  if (/producto|catalogo|catalog|articulo/.test(consulta)) {
    return `El catálogo tiene ${indicadores.productosActivos} productos activos. ${indicadores.stockBajo} tienen stock bajo y ${indicadores.agotados} están agotados. Detecté ${resumen.productosPorReponer.filter((producto) => producto.demandaEnAumento).length} con demanda en aumento y ${resumen.productosPorReponer.filter((producto) => producto.sinMovimiento30Dias).length} sin ventas en 30 días.`;
  }
  return `Ya tengo los datos actuales de Glasskin. Hay ${indicadores.pedidosPendientes} pedidos pendientes, ${indicadores.consultasAbiertas} consultas sin resolver, ${indicadores.stockBajo} productos con poco stock y ${indicadores.agotados} agotados. También reviso demanda en aumento y artículos sin ventas recientes. Preguntame por pedidos, clientes, ventas o inventario.`;
}
