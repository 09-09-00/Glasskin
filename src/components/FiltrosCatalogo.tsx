"use client";

// ============================================================
//  Filtros del catálogo: marca, categoría, tipo de piel,
//  precio máximo, preocupación y orden.
//  Actualizan la URL (searchParams) para que el servidor
//  vuelva a consultar la base de datos.
// ============================================================
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { TIPOS_PIEL, PREOCUPACIONES } from "@/lib/constantes";

interface Props {
  marcas: { slug: string; nombre: string }[];
  categorias: { slug: string; nombre: string; icono: string | null }[];
}

export function FiltrosCatalogo({ marcas, categorias }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [abierto, setAbierto] = useState(false);
  const [precioMax, setPrecioMax] = useState(searchParams.get("precioMax") ?? "");

  /** Cambia un filtro en la URL (borra la clave si el valor queda vacío). */
  function actualizar(clave: string, valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (valor) params.set(clave, valor);
    else params.delete(clave);
    router.push(`/catalogo?${params.toString()}`);
  }

  /** Limpia todos los filtros. */
  function limpiar() {
    setPrecioMax("");
    router.push("/catalogo");
  }

  const claseSelect =
    "w-full rounded-xl border border-[#203128]/15 bg-white px-3 py-2.5 text-sm text-stone-700 focus:border-[#3f806e] focus:outline-none focus:ring-4 focus:ring-[#3f806e]/10";

  return (
    <div>
      {/* Botón para mostrar filtros en móvil */}
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="mb-3 w-full rounded-xl border border-[#203128]/15 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 lg:hidden"
      >
        {abierto ? "✕ Ocultar filtros" : "☰ Mostrar filtros"}
      </button>

      <div className={`${abierto ? "block" : "hidden"} space-y-5 rounded-[24px] border border-[#203128]/10 bg-white p-5 lg:sticky lg:top-28 lg:block`}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900">Filtros</h2>
          <button
            type="button"
            onClick={limpiar}
            className="text-xs font-bold text-[#3f806e] hover:underline"
          >
            Limpiar todo
          </button>
        </div>

        {/* Búsqueda por texto */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-stone-500" htmlFor="filtro-q">
            Buscar
          </label>
          <input
            id="filtro-q"
            type="search"
            defaultValue={searchParams.get("q") ?? ""}
            placeholder="Producto, necesidad o ingrediente…"
            className={claseSelect}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                actualizar("q", (e.target as HTMLInputElement).value);
              }
            }}
            onBlur={(e) => {
              if (e.target.value !== (searchParams.get("q") ?? "")) {
                actualizar("q", e.target.value);
              }
            }}
          />
          <p className="mt-1.5 text-[11px] leading-4 text-stone-400">Prueba: “piel sensible con manchas” o el nombre de un ingrediente.</p>
        </div>

        {/* Marca */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-stone-500" htmlFor="filtro-marca">
            Marca
          </label>
          <select
            id="filtro-marca"
            value={searchParams.get("marca") ?? ""}
            onChange={(e) => actualizar("marca", e.target.value)}
            className={claseSelect}
          >
            <option value="">Todas las marcas</option>
            {marcas.map((m) => (
              <option key={m.slug} value={m.slug}>{m.nombre}</option>
            ))}
          </select>
        </div>

        {/* Categoría */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-stone-500" htmlFor="filtro-categoria">
            Categoría
          </label>
          <select
            id="filtro-categoria"
            value={searchParams.get("categoria") ?? ""}
            onChange={(e) => actualizar("categoria", e.target.value)}
            className={claseSelect}
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.slug} value={c.slug}>{`${c.icono ?? ""} ${c.nombre}`.trim()}</option>
            ))}
          </select>
        </div>

        {/* Tipo de piel */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-stone-500" htmlFor="filtro-piel">
            Tipo de piel
          </label>
          <select
            id="filtro-piel"
            value={searchParams.get("piel") ?? ""}
            onChange={(e) => actualizar("piel", e.target.value)}
            className={claseSelect}
          >
            <option value="">Cualquier tipo</option>
            {TIPOS_PIEL.map((t) => (
              <option key={t.valor} value={t.valor}>{t.etiqueta}</option>
            ))}
          </select>
        </div>

        {/* Preocupación */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-stone-500" htmlFor="filtro-preocupacion">
            Preocupación
          </label>
          <select
            id="filtro-preocupacion"
            value={searchParams.get("preocupacion") ?? ""}
            onChange={(e) => actualizar("preocupacion", e.target.value)}
            className={claseSelect}
          >
            <option value="">Todas</option>
            {PREOCUPACIONES.map((p) => (
              <option key={p.valor} value={p.valor}>{p.etiqueta}</option>
            ))}
          </select>
        </div>

        {/* Precio máximo */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-stone-500" htmlFor="filtro-precio">
            Precio máximo
          </label>
          <div className="flex gap-2">
            <input
              id="filtro-precio"
              type="number"
              min="0"
              step="1"
              value={precioMax}
              onChange={(e) => setPrecioMax(e.target.value)}
              placeholder="Ej: 25"
              className={claseSelect}
              onKeyDown={(e) => {
                if (e.key === "Enter") actualizar("precioMax", precioMax);
              }}
            />
            <button
              type="button"
              onClick={() => actualizar("precioMax", precioMax)}
              className="rounded-xl bg-[#203128] px-4 text-sm font-semibold text-white transition hover:bg-[#3f806e]"
            >
              Ir
            </button>
          </div>
        </div>

        {/* Orden */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-stone-500" htmlFor="filtro-orden">
            Ordenar por
          </label>
          <select
            id="filtro-orden"
            value={searchParams.get("orden") ?? ""}
            onChange={(e) => actualizar("orden", e.target.value)}
            className={claseSelect}
          >
            <option value="">{searchParams.get("q") ? "Más relevantes" : "Más recientes"}</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
            <option value="nombre">Nombre (A-Z)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
