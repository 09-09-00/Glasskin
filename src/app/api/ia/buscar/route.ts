// ============================================================
//  POST /api/ia/buscar - Buscador inteligente con IA
//  Input: { descripcion: string } - texto libre del usuario
//  Output: productos recomendados DEL CATÁLOGO + explicación
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { crearClienteIA, parsearJSONSeguro, MODELO_IA, iaExternaConfigurada } from "@/lib/ia/proveedor";
import { buscarProductosLocal, inferirCategoriaConsulta } from "@/lib/ia/fallback";
import { PROMPT_BUSQUEDA_INTELIGENTE, catalogoParaPrompt, validarIdsRecomendados } from "@/lib/ia/prompts";
import { extraerPresupuestoConsulta } from "@/lib/productos";
import { obtenerTasaServer } from "@/lib/format";
import { z } from "zod";

const BodySchema = z.object({
  descripcion: z.string().min(10).max(1000),
});

export async function POST(req: NextRequest) {
  let respuestaLocal: (() => ReturnType<typeof NextResponse.json>) | null = null;
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Descripción requerida (mín 10 caracteres)" }, { status: 400 });
    }
    const { descripcion } = parsed.data;

    // 1. Obtener catálogo activo (solo campos necesarios para el prompt)
    const productos = await prisma.product.findMany({
      where: { activo: true, stock: { gt: 0 } },
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
      orderBy: { nombre: "asc" },
    });

    const presupuesto = extraerPresupuestoConsulta(descripcion);
    const tasa = presupuesto?.moneda === "PYG" ? await obtenerTasaServer() : 1;
    const precioMaxUSD = presupuesto ? (presupuesto.moneda === "PYG" ? presupuesto.importe / tasa : presupuesto.importe) : undefined;
    const categoria = inferirCategoriaConsulta(descripcion);
    const elegibles = productos.filter((producto) =>
      (!categoria || producto.category.slug === categoria) &&
      (precioMaxUSD === undefined || producto.precio <= precioMaxUSD)
    );
    const opciones = { categoria, precioMaxUSD };
    respuestaLocal = () => NextResponse.json({ ok: true, ...buscarProductosLocal(descripcion, productos, opciones), modo: "local-respaldo" });

    if (!iaExternaConfigurada()) {
      return respuestaLocal();
    }

    if (elegibles.length === 0) return respuestaLocal();
    const catalogoIds = new Set(elegibles.map((p) => p.id));
    const catalogoTexto = catalogoParaPrompt(
      elegibles.map((p) => ({
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

    // 2. Llamar a la IA
    const cliente = crearClienteIA();
    const respuesta = await cliente.chat.completions.create({
      model: MODELO_IA,
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROMPT_BUSQUEDA_INTELIGENTE },
        {
          role: "user",
          content: `CATÁLOGO DISPONIBLE:\n${catalogoTexto}\n\nUSUARIO: "${descripcion}"`,
        },
      ],
    });

    const contenido = respuesta.choices[0]?.message?.content ?? "";
    const parseado = parsearJSONSeguro<{ productos: Array<{ id: number; motivo: string }>; explicacion: string; avisos: string[] }>(contenido);

    if (!parseado.ok || !parseado.datos) {
      return NextResponse.json({ error: "Respuesta de IA inválida", detalle: parseado.error }, { status: 500 });
    }

    // 3. Validar que los IDs existan en el catálogo (seguridad anti-alucinación)
    const productosValidos = validarIdsRecomendados(parseado.datos.productos, catalogoIds);

    // 4. Enriquecer con datos completos
    const productosCompletos = await prisma.product.findMany({
      where: { id: { in: productosValidos.map((p) => p.id) } },
      include: { brand: true, category: true },
    });

    const resultado = productosValidos.map((rec) => {
      const prod = productosCompletos.find((p) => p.id === rec.id)!;
      return {
        id: prod.id,
        slug: prod.slug,
        nombre: prod.nombre,
        marca: prod.brand.nombre,
        categoria: prod.category.slug,
        precio: prod.precio,
        imagen: prod.imagen,
        motivo: rec.motivo,
      };
    });

    return NextResponse.json({
      ok: true,
      productos: resultado,
      explicacion: parseado.datos.explicacion,
      avisos: [...new Set([...parseado.datos.avisos, "Solo se recomiendan productos del catálogo actual."])],
    });
  } catch (e) {
    console.error("POST /api/ia/buscar error:", e);
    if (respuestaLocal) return respuestaLocal();
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
  }
}
