// ============================================================
//  POST /api/ia/rutina-presupuesto - Rutina por presupuesto
//  Input: { tipoPiel: string, presupuestoMax: number, preocupaciones?: string[] }
//  Output: lista de productos cuya suma NO supera el presupuesto
//  (la suma se calcula EN CÓDIGO, nunca por el modelo)
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { crearClienteIA, parsearJSONSeguro, MODELO_IA, iaExternaConfigurada } from "@/lib/ia/proveedor";
import { crearRutinaPresupuestoLocal } from "@/lib/ia/fallback";
import { PROMPT_RUTINA_PRESUPUESTO, catalogoParaPrompt, validarIdsRecomendados } from "@/lib/ia/prompts";
import { z } from "zod";

const BodySchema = z.object({
  tipoPiel: z.enum(["seca", "grasa", "mixta", "sensible", "normal"]),
  presupuestoMax: z.number().positive().max(1000),
  preocupaciones: z.array(z.string()).optional().default([]),
});

export async function POST(req: NextRequest) {
  let respuestaLocal: (() => ReturnType<typeof NextResponse.json>) | null = null;
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "tipoPiel y presupuestoMax requeridos. presupuestoMax: número > 0" },
        { status: 400 }
      );
    }
    const { tipoPiel, presupuestoMax, preocupaciones } = parsed.data;

    // 1. Filtrar catálogo por tipo de piel y preocupaciones
    const where: Record<string, unknown> = { activo: true, tipoPiel: { contains: `"${tipoPiel}"` } };
    if (preocupaciones.length > 0) {
      where.OR = preocupaciones.map((p) => ({ preocupaciones: { contains: `"${p}"` } }));
    }

    const productos = await prisma.product.findMany({
      where,
      select: {
        id: true,
        slug: true,
        nombre: true,
        brand: { select: { nombre: true } },
        category: { select: { slug: true } },
        precio: true,
        tipoPiel: true,
        preocupaciones: true,
        descripcion: true,
        modoUso: true,
        imagen: true,
      },
      orderBy: { precio: "asc" },
    });

    if (productos.length === 0) {
      return NextResponse.json(
        { error: "No hay productos para ese tipo de piel/preocupaciones" },
        { status: 404 }
      );
    }

    respuestaLocal = () => NextResponse.json({ ok: true, ...crearRutinaPresupuestoLocal(productos, presupuestoMax), modo: "local-respaldo" });

    if (!iaExternaConfigurada()) {
      return respuestaLocal();
    }

    const catalogoIds = new Set(productos.map((p) => p.id));
    const catalogoTexto = catalogoParaPrompt(
      productos.map((p) => ({
        id: p.id,
        slug: p.slug,
        nombre: p.nombre,
        marca: p.brand.nombre,
        categoria: p.category.slug,
        precio: p.precio,
        tipoPiel: JSON.parse(p.tipoPiel ?? "[]"),
        preocupaciones: JSON.parse(p.preocupaciones ?? "[]"),
        descripcion: p.descripcion,
        modoUso: p.modoUso,
      }))
    );

    // 2. Llamar a la IA (ella propone lista, pero NO calcula el total)
    const cliente = crearClienteIA();
    const respuesta = await cliente.chat.completions.create({
      model: MODELO_IA,
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROMPT_RUTINA_PRESUPUESTO },
        {
          role: "user",
          content: `TIPO DE PIEL: ${tipoPiel}\nPRESUPUESTO MÁXIMO: $${presupuestoMax}\nPREOCUPACIONES: ${preocupaciones.join(", ") || "ninguna"}\n\nCATÁLOGO FILTRADO:\n${catalogoTexto}`,
        },
      ],
    });

    const contenido = respuesta.choices[0]?.message?.content ?? "";
    const parseado = parsearJSONSeguro<{
      productos: Array<{ id: number; motivo: string }>;
      avisos: string[];
    }>(contenido);

    if (!parseado.ok || !parseado.datos) {
      return NextResponse.json({ error: "Respuesta de IA inválida", detalle: parseado.error }, { status: 500 });
    }

    // 3. Validar IDs y obtener datos completos
    const productosValidos = validarIdsRecomendados(parseado.datos.productos, catalogoIds);
    const productosCompletos = await prisma.product.findMany({
      where: { id: { in: productosValidos.map((p) => p.id) } },
      include: { brand: true, category: true },
    });
    const mapaProductos = new Map(productosCompletos.map((p) => [p.id, p]));

    // 4. CALCULAR TOTAL EN CÓDIGO (nunca confiar en el modelo)
    // Ordenamos por prioridad de rutina y vamos añadiendo mientras quepa
    const prioridadCategoria: Record<string, number> = {
      limpiadores: 1,
      hidratantes: 2,
      "protectores-solares": 3,
      serums: 4,
      "tonicos-esencias": 5,
      "contornos-ojos": 6,
      "tratamientos-acne": 7,
      "tratamientos-antiedad": 8,
      exfoliantes: 9,
      mascarillas: 10,
    };

    const productosOrdenados = productosValidos
      .map((rec) => {
        const prod = mapaProductos.get(rec.id)!;
        return {
          ...rec,
          producto: prod,
          prioridad: prioridadCategoria[prod.category.slug] ?? 99,
        };
      })
      .sort((a, b) => a.prioridad - b.prioridad || a.producto.precio - b.producto.precio);

    let total = 0;
    const seleccionados = [];
    for (const item of productosOrdenados) {
      if (total + item.producto.precio <= presupuestoMax) {
        total += item.producto.precio;
        seleccionados.push({
          id: item.producto.id,
          slug: item.producto.slug,
          nombre: item.producto.nombre,
          marca: item.producto.brand.nombre,
          categoria: item.producto.category.slug,
          precio: item.producto.precio,
          imagen: item.producto.imagen,
          motivo: item.motivo,
        });
      }
    }

    const sobra = Math.round((presupuestoMax - total) * 100) / 100;

    return NextResponse.json({
      ok: true,
      productos: seleccionados,
      total,
      presupuesto: presupuestoMax,
      sobra,
      avisos: [
        ...new Set([
          ...parseado.datos.avisos,
          "El total se calcula en código, nunca por el modelo.",
          `Sobran $${sobra.toFixed(2)} del presupuesto.`,
        ]),
      ],
    });
  } catch (e) {
    console.error("POST /api/ia/rutina-presupuesto error:", e);
    if (respuestaLocal) return respuestaLocal();
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
  }
}
