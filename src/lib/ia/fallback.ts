export interface ProductoCatalogoIA {
  id: number;
  slug: string;
  nombre: string;
  brand: { nombre: string };
  category: { slug: string };
  precio: number;
  tipoPiel: string;
  preocupaciones: string;
  descripcion: string;
  modoUso: string;
  ingredientes?: Array<{ ingrediente: { nombre: string } }>;
  imagen?: string | null;
}

export interface OpcionesBusquedaLocal {
  precioMaxUSD?: number;
  categoria?: string;
  limite?: number;
}

const AVISOS = [
  "Recomendación calculada con productos disponibles en el catálogo Glasskin.",
  "Esta información no sustituye consejo médico profesional.",
  "Ante irritación o una condición persistente, consulta a un dermatólogo.",
];

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function listaJson(valor: string): string[] {
  try {
    const datos = JSON.parse(valor);
    return Array.isArray(datos) ? datos.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function serializarProducto(producto: ProductoCatalogoIA, motivo: string) {
  return { id: producto.id, slug: producto.slug, nombre: producto.nombre, marca: producto.brand.nombre, categoria: producto.category.slug, precio: producto.precio, imagen: producto.imagen ?? null, motivo };
}

export function inferirCategoriaConsulta(descripcion: string) {
  const consulta = normalizar(descripcion);
  if (/\b(protector(?:es)? solar(?:es)?|bloqueador(?:es)?|fotoprotector(?:es)?|spf)\b/.test(consulta)) return "protectores-solares";
  if (/\b(limpiador(?:es)?|limpieza facial|gel limpiador|espuma limpiadora)\b/.test(consulta)) return "limpiadores";
  if (/\b(serum|serums|suero facial|ampolla)\b/.test(consulta)) return "serums";
  if (/\b(tonico|tonicos|esencia|esencias)\b/.test(consulta)) return "tonicos-esencias";
  if (/\b(hidratante|hidratantes|crema hidratante|hidratacion)\b/.test(consulta)) return "hidratantes";
  return undefined;
}

export function buscarProductosLocal(
  descripcion: string,
  productos: ProductoCatalogoIA[],
  opciones: OpcionesBusquedaLocal = {},
) {
  const sinonimos: Record<string, string[]> = {
    acne: ["acne", "granos", "imperfecciones", "sebo", "salicilico", "bha"],
    manchas: ["manchas", "tono", "luminosidad", "vitamina c", "arbutina"],
    deshidratacion: ["deshidratada", "hidratacion", "tirantez", "hialuronico", "seca"],
    poros: ["poros", "textura", "puntos negros", "bha"],
    rojez: ["rojez", "sensible", "irritacion", "centella", "calmante"],
    arrugas: ["arrugas", "lineas", "firmeza", "retinol", "retinal", "peptidos"],
  };
  const consulta = normalizar(descripcion);
  const terminos = new Set(consulta.split(/\W+/).filter((item) => item.length > 2));
  for (const [clave, palabras] of Object.entries(sinonimos)) {
    if (palabras.some((palabra) => consulta.includes(normalizar(palabra)))) terminos.add(clave);
  }

  const categoria = opciones.categoria ?? inferirCategoriaConsulta(descripcion);
  const elegibles = productos.filter((producto) =>
    (!categoria || producto.category.slug === categoria) &&
    (opciones.precioMaxUSD === undefined || producto.precio <= opciones.precioMaxUSD)
  );
  const puntuados = elegibles.map((producto) => {
    const preocupaciones = listaJson(producto.preocupaciones);
    const pieles = listaJson(producto.tipoPiel);
    const texto = normalizar([producto.nombre, producto.brand.nombre, producto.category.slug, producto.descripcion, preocupaciones.join(" "), pieles.join(" ")].join(" "));
    let puntos = 0;
    const coincidencias: string[] = [];
    for (const termino of terminos) {
      if (texto.includes(termino)) { puntos += producto.nombre.toLowerCase().includes(termino) ? 4 : 1; coincidencias.push(termino); }
    }
    return { producto, puntos, coincidencias };
  }).sort((a, b) => b.puntos - a.puntos || a.producto.precio - b.producto.precio);

  const elegidos = (puntuados.some((item) => item.puntos > 0) ? puntuados.filter((item) => item.puntos > 0) : puntuados).slice(0, opciones.limite ?? 6);
  const categoriaNombre = categoria?.replaceAll("-", " ");
  const explicacion = !elegibles.length
    ? `No encontré ${categoriaNombre ? `opciones de ${categoriaNombre}` : "productos"}${opciones.precioMaxUSD !== undefined ? ` dentro de USD ${opciones.precioMaxUSD.toFixed(2)}` : ""} con stock. Puedes ampliar el presupuesto o consultar otra categoría.`
    : elegidos.length
      ? `Revisé el catálogo disponible${categoriaNombre ? ` y limité la búsqueda a ${categoriaNombre}` : ""}${opciones.precioMaxUSD !== undefined ? ` y a productos de hasta USD ${opciones.precioMaxUSD.toFixed(2)}` : ""}. Estas opciones coinciden mejor con lo que describiste.`
      : "No encontré una coincidencia exacta; puedo ayudarte si me cuentas un poco más sobre lo que buscas.";
  return {
    productos: elegidos.map(({ producto, coincidencias }) => {
      const pieles = listaJson(producto.tipoPiel);
      const pielConsultada = ["seca", "grasa", "mixta", "sensible", "normal"].find((tipo) => consulta.includes(tipo));
      const motivo = [
        categoriaNombre ? `Es de la categoría ${categoriaNombre}` : "Coincide con tu búsqueda",
        pielConsultada && pieles.includes(pielConsultada) ? `está indicado para piel ${pielConsultada}` : null,
        opciones.precioMaxUSD !== undefined ? `cuesta USD ${producto.precio.toFixed(2)}, dentro de tu presupuesto` : null,
        !categoriaNombre && !opciones.precioMaxUSD && coincidencias.length ? `coincide con ${coincidencias.slice(0, 2).join(" y ")}` : null,
      ].filter(Boolean).join("; ");
      return serializarProducto(producto, `${motivo}.`);
    }),
    explicacion,
    avisos: AVISOS,
  };
}

function elegir(productos: ProductoCatalogoIA[], categoria: string, usados: Set<number>) {
  return productos.filter((producto) => producto.category.slug === categoria && !usados.has(producto.id)).sort((a, b) => a.precio - b.precio)[0] ?? null;
}

export function crearRutinaLocal(productos: ProductoCatalogoIA[]) {
  const usados = new Set<number>();
  const crearPaso = (categoria: string, nombre: string, orden: number, instrucciones: string) => {
    const producto = elegir(productos, categoria, usados);
    if (producto) usados.add(producto.id);
    return { orden, nombre, productoId: producto?.id ?? null, productoNombre: producto?.nombre ?? null, producto: producto ? serializarProducto(producto, `Seleccionado para el paso ${nombre.toLowerCase()}.`) : null, instrucciones, esperaMinutos: categoria === "serums" ? 1 : 0 };
  };
  const manana = [
    crearPaso("limpiadores", "Limpiador", 1, "Masajeá sobre la piel húmeda y enjuagá con agua tibia."),
    crearPaso("serums", "Sérum", 2, "Aplicá dos o tres gotas sin frotar en exceso."),
    crearPaso("hidratantes", "Hidratante", 3, "Sellá la hidratación con una capa fina."),
    crearPaso("protectores-solares", "Protector solar", 4, "Usá una cantidad generosa y reaplicá durante el día."),
  ];
  usados.clear();
  const noche = [
    crearPaso("limpiadores", "Limpieza", 1, "Retirá protector solar y suciedad sin dejar tirantez."),
    crearPaso("tonicos-esencias", "Tónico o esencia", 2, "Aplicá con las manos sobre la piel limpia."),
    crearPaso("serums", "Tratamiento", 3, "Comenzá en noches alternas si contiene activos intensos."),
    crearPaso("hidratantes", "Hidratante", 4, "Finalizá con una capa uniforme para apoyar la barrera."),
  ];
  return { manana, noche, consejos: ["Introducí un producto nuevo por vez.", "Hacé una prueba de parche antes de usar un activo.", "La constancia importa más que una rutina larga."], mejoras: [], avisos: AVISOS };
}

export function crearRutinaPresupuestoLocal(productos: ProductoCatalogoIA[], presupuesto: number) {
  const categorias = ["limpiadores", "hidratantes", "protectores-solares", "serums", "tonicos-esencias", "contornos-ojos"];
  const seleccionados: ReturnType<typeof serializarProducto>[] = [];
  const usados = new Set<number>();
  let total = 0;
  for (const categoria of categorias) {
    const producto = elegir(productos, categoria, usados);
    if (producto && total + producto.precio <= presupuesto) {
      usados.add(producto.id);
      total += producto.precio;
      seleccionados.push(serializarProducto(producto, `Aporta el paso ${categoria.replaceAll("-", " ")} sin superar tu presupuesto.`));
    }
  }
  total = Math.round(total * 100) / 100;
  return { productos: seleccionados, total, presupuesto, sobra: Math.round((presupuesto - total) * 100) / 100, avisos: [...AVISOS, "El total se calcula directamente con los precios actuales del catálogo."] };
}
