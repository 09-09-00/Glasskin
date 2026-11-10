// ============================================================
//  POST /api/ia/rutina - Generador de rutina mañana/noche
//  Input: { tipoPiel: string, preocupaciones: string[] }
//  Output: rutina ordenada con productos del catálogo
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { crearClienteIA, parsearJSONSeguro, MODELO_IA, iaExternaConfigurada } from "@/lib/ia/proveedor";
import { crearRutinaLocal } from "@/lib/ia/fallback";
import { PROMPT_RUTINA_COMPLETA, catalogoParaPrompt, validarIdsRecomendados } from "@/lib/ia/prompts";
import { z } from "zod";

const BodySchema = z.object({
  tipoPiel: z.enum(["seca", "grasa", "mixta", "sensible", "normal"]),
  preocupaciones: z.array(z.string()).optional().default([]),
  language: z.enum(["es", "en"]).optional().default("es"),
});

function crearRutinaLocalTraducida(productos: Parameters<typeof crearRutinaLocal>[0], language: "es" | "en") {
  const rutina = crearRutinaLocal(productos);
  if (language === "es") return rutina;
  const pasos: Record<string, { nombre: string; instrucciones: string }> = {
    Limpiador: { nombre: "Cleanser", instrucciones: "Massage onto damp skin and rinse with lukewarm water." },
    Sérum: { nombre: "Serum", instrucciones: "Apply two or three drops without rubbing too much." },
    Hidratante: { nombre: "Moisturizer", instrucciones: "Seal in hydration with a thin layer." },
    "Protector solar": { nombre: "Sunscreen", instrucciones: "Apply generously and reapply during the day." },
    Limpieza: { nombre: "Cleanse", instrucciones: "Remove sunscreen and dirt without leaving skin tight." },
    "Tónico o esencia": { nombre: "Toner or essence", instrucciones: "Pat onto clean skin with your hands." },
    Tratamiento: { nombre: "Treatment", instrucciones: "Start on alternate nights if it contains strong active ingredients." },
  };
  const traducirPasos = (lista: typeof rutina.manana) => lista.map((paso) => {
    const traduccion = pasos[paso.nombre];
    return { ...paso, ...(traduccion ?? {}), producto: paso.producto ? { ...paso.producto, motivo: `Selected for the ${traduccion?.nombre.toLowerCase() ?? "routine"} step.` } : null };
  });
  return {
    ...rutina,
    manana: traducirPasos(rutina.manana),
    noche: traducirPasos(rutina.noche),
    consejos: ["Introduce one new product at a time.", "Patch test before using an active ingredient.", "Consistency matters more than a long routine."],
    avisos: ["Recommendations use products available in the Glasskin catalog.", "This information does not replace professional medical advice.", "If irritation or a persistent skin condition occurs, consult a dermatologist."],
  };
}

export async function POST(req: NextRequest) {
  let respuestaLocal: (() => ReturnType<typeof NextResponse.json>) | null = null;
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "tipoPiel requerido: seca|grasa|mixta|sensible|normal" }, { status: 400 });
    }
    const { tipoPiel, preocupaciones, language } = parsed.data;

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
      orderBy: { nombre: "asc" },
    });

    if (productos.length === 0) {
      return NextResponse.json(
        { error: language === "en" ? "No products match this skin type and concern yet." : "No hay productos para ese tipo de piel/preocupaciones", sugerencia: language === "en" ? "Try changing your filters." : "Amplía los filtros" },
        { status: 404 }
      );
    }

    respuestaLocal = () => NextResponse.json({ ok: true, ...crearRutinaLocalTraducida(productos, language), modo: "local-respaldo" });

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

    // 2. Llamar a la IA
    const cliente = crearClienteIA();
    const respuesta = await cliente.chat.completions.create({
      model: MODELO_IA,
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${PROMPT_RUTINA_COMPLETA}\n\nWrite all customer-facing text fields in ${language === "en" ? "English" : "Spanish"}. Keep product names, brands, ingredients, and product catalog facts exactly as stored.` },
        {
          role: "user",
          content: `${language === "en" ? "SKIN TYPE" : "TIPO DE PIEL"}: ${tipoPiel}\n${language === "en" ? "CONCERNS" : "PREOCUPACIONES"}: ${preocupaciones.join(", ") || (language === "en" ? "none" : "ninguna")}\n\n${language === "en" ? "FILTERED CATALOG" : "CATÁLOGO FILTRADO"}:\n${catalogoTexto}`,
        },
      ],
    });

    const contenido = respuesta.choices[0]?.message?.content ?? "";
    const parseado = parsearJSONSeguro<{
      manana: Array<{ orden: number; nombre: string; productoId: number | null; productoNombre: string | null; instrucciones: string; esperaMinutos?: number }>;
      noche: Array<{ orden: number; nombre: string; productoId: number | null; productoNombre: string | null; instrucciones: string; esperaMinutos?: number }>;
      consejos: string[];
      mejoras: string[];
      avisos: string[];
    }>(contenido);

    if (!parseado.ok || !parseado.datos) {
      return NextResponse.json({ error: "Respuesta de IA inválida", detalle: parseado.error }, { status: 500 });
    }

    // 3. Validar IDs de productos recomendados
    const todosIds = [
      ...parseado.datos.manana.map((p) => p.productoId).filter((v): v is number => v !== null),
      ...parseado.datos.noche.map((p) => p.productoId).filter((v): v is number => v !== null),
    ];
    const idsUnicos = [...new Set(todosIds)];
    const idsValidos = new Set(validarIdsRecomendados(idsUnicos.map((id) => ({ id })), catalogoIds).map((v) => v.id));

    // 4. Obtener datos completos de productos válidos
    const productosCompletos = await prisma.product.findMany({
      where: { id: { in: [...idsValidos] } },
      include: { brand: true, category: true },
    });
    const mapaProductos = new Map(productosCompletos.map((p) => [p.id, p]));

    // 5. Enriquecer pasos con datos reales (o null si no válido)
    if (!parseado.datos) {
      return NextResponse.json({ error: "Datos de IA no válidos" }, { status: 500 });
    }

    type PasoRutina = typeof parseado.datos.manana[0];

    function enriquecer(paso: PasoRutina) {
      if (!paso.productoId || !idsValidos.has(paso.productoId)) {
        return { ...paso, productoId: null, productoNombre: null, producto: null };
      }
      const prod = mapaProductos.get(paso.productoId)!;
      return {
        ...paso,
        producto: {
          id: prod.id,
          slug: prod.slug,
          nombre: prod.nombre,
          marca: prod.brand.nombre,
          categoria: prod.category.slug,
          precio: prod.precio,
          imagen: prod.imagen,
        },
      };
    }

    return NextResponse.json({
      ok: true,
      manana: parseado.datos.manana.map(enriquecer),
      noche: parseado.datos.noche.map(enriquecer),
      consejos: parseado.datos.consejos,
      mejoras: parseado.datos.mejoras,
      avisos: [...new Set([...parseado.datos.avisos, language === "en" ? "Routine generated using products from the current catalog." : "Rutina generada con productos del catálogo actual."])],
    });
  } catch (e) {
    console.error("POST /api/ia/rutina error:", e);
    if (respuestaLocal) return respuestaLocal();
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
  }
}
