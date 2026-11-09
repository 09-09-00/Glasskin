"use client";

import { FormEvent, useState } from "react";
import { formatearPrecio } from "@/lib/format-client";
import { ImagenProducto } from "@/components/ImagenProducto";

interface ProductoAdmin {
  id: number;
  slug: string;
  nombre: string;
  descripcion: string;
  modoUso: string;
  precio: number;
  stock: number;
  imagen: string | null;
  activo: boolean;
  brandId: number;
  categoryId: number;
  brand: { id: number; nombre: string };
  category: { id: number; nombre: string };
  imagenes?: ImagenAdmin[];
}

interface ImagenAdmin {
  id: number;
  url: string;
  alt: string | null;
  orden: number;
  principal: boolean;
  blurDataUrl?: string | null;
  width?: number | null;
  height?: number | null;
}

interface Props {
  initialProductos: ProductoAdmin[];
  categorias: { id: number; nombre: string }[];
  marcas: { id: number; nombre: string }[];
  categoriaInicial?: string | null;
}

interface ProductoForm {
  nombre: string;
  descripcion: string;
  modoUso: string;
  precio: number;
  stock: number;
  imagen: string;
  brandId: number;
  categoryId: number;
  activo: boolean;
}

export function ProductosClient({ initialProductos, categorias, marcas, categoriaInicial }: Props) {
  const [productos, setProductos] = useState<ProductoAdmin[]>(initialProductos);
  const [filtro, setFiltro] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [stockEdit, setStockEdit] = useState("");
  const [activoEdit, setActivoEdit] = useState(false);
  const [guardando, setGuardando] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [modalImagenesId, setModalImagenesId] = useState<number | null>(null);
  const [imagenesModal, setImagenesModal] = useState<ImagenAdmin[]>([]);
  const [subiendoImagen, setSubiendoImagen] = useState<number | null>(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState<number | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [reemplazandoId, setReemplazandoId] = useState<number | null>(null);
  const [formularioId, setFormularioId] = useState<number | "nuevo" | null>(null);
  const [guardandoFormulario, setGuardandoFormulario] = useState(false);
  const [formulario, setFormulario] = useState<ProductoForm>(() => ({
    nombre: "",
    descripcion: "",
    modoUso: "",
    precio: 0,
    stock: 0,
    imagen: "",
    brandId: marcas[0]?.id ?? 0,
    categoryId: categorias[0]?.id ?? 0,
    activo: true,
  }));

  const MAX_IMAGENES = 8;

  const productosFiltrados = productos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
      p.slug.includes(filtro) ||
      p.brand.nombre.toLowerCase().includes(filtro.toLowerCase())
  );

  async function alGuardar(id: number) {
    setGuardando(id);
    try {
      const res = await fetch(`/api/admin/productos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: Number(stockEdit), activo: activoEdit }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setProductos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, stock: Number(stockEdit), activo: activoEdit } : p))
      );
      setMensaje("✅ Guardado");
      setTimeout(() => setMensaje(""), 2000);
    } catch {
      setMensaje("❌ Error al guardar");
      setTimeout(() => setMensaje(""), 2000);
    }
    setGuardando(null);
    setEditandoId(null);
  }

  function iniciarEdicion(p: ProductoAdmin) {
    setEditandoId(p.id);
    setStockEdit(String(p.stock));
    setActivoEdit(p.activo);
  }

  function abrirNuevoProducto() {
    setFormularioId("nuevo");
    setFormulario({
      nombre: "",
      descripcion: "",
      modoUso: "",
      precio: 0,
      stock: 0,
      imagen: "",
      brandId: marcas[0]?.id ?? 0,
      categoryId: categorias[0]?.id ?? 0,
      activo: true,
    });
  }

  function abrirEdicionCompleta(producto: ProductoAdmin) {
    setFormularioId(producto.id);
    setFormulario({
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      modoUso: producto.modoUso,
      precio: producto.precio,
      stock: producto.stock,
      imagen: producto.imagenes?.find((imagen) => imagen.principal)?.url ?? producto.imagen ?? "",
      brandId: producto.brandId,
      categoryId: producto.categoryId,
      activo: producto.activo,
    });
  }

  async function guardarProducto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (formularioId === null) return;
    setGuardandoFormulario(true);
    setMensaje("");
    try {
      const esNuevo = formularioId === "nuevo";
      const response = await fetch(esNuevo ? "/api/admin/productos" : `/api/admin/productos/${formularioId}`, {
        method: esNuevo ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formulario),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar el producto");
      const producto: ProductoAdmin = data.producto;
      setProductos((actuales) =>
        esNuevo ? [producto, ...actuales] : actuales.map((item) => (item.id === producto.id ? producto : item)),
      );
      setFormularioId(null);
      setMensaje(esNuevo ? "✅ Producto creado y publicado" : "✅ Producto actualizado");
    } catch (error) {
      setMensaje(error instanceof Error ? `❌ ${error.message}` : "❌ No se pudo guardar");
    } finally {
      setGuardandoFormulario(false);
    }
  }

  async function eliminarProducto(producto: ProductoAdmin) {
    if (!confirm(`¿Eliminar “${producto.nombre}”? Esta acción no se puede deshacer.`)) return;
    const response = await fetch(`/api/admin/productos/${producto.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setMensaje(`❌ ${data.error ?? "No se pudo eliminar"}`);
      return;
    }
    setProductos((actuales) => actuales.filter((item) => item.id !== producto.id));
    setMensaje("✅ Producto eliminado");
  }

  async function abrirModalImagenes(productoId: number) {
    const producto = productos.find((p) => p.id === productoId);
    if (!producto) return;
    setModalImagenesId(productoId);
    setImagenesModal(producto.imagenes ?? []);
  }

  async function cargarImagenes(productoId: number) {
    try {
      const res = await fetch(`/api/admin/productos/${productoId}/imagenes`);
      const data = await res.json();
      setImagenesModal(data.imagenes ?? []);
    } catch {
      setMensaje("❌ Error al cargar imágenes");
    }
  }

  async function agregarImagen(productoId: number, url: string, alt: string) {
    if (!url.trim()) return;
    setSubiendoImagen(productoId);
    try {
      const esPrimera = imagenesModal.length === 0;
      const res = await fetch(`/api/admin/productos/${productoId}/imagenes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), alt: alt.trim() || undefined, orden: imagenesModal.length, principal: esPrimera }),
      });
      if (!res.ok) throw new Error("Error al agregar");
      const data = await res.json();
      // Usar la imagen completa devuelta por la API (incluye id)
      const nuevaImagen = data.imagen;
      setImagenesModal((prev) => [...prev, nuevaImagen]);
      // Actualizar lista principal
      setProductos((prev) =>
        prev.map((p) =>
          p.id === productoId
            ? { ...p, imagenes: [...(p.imagenes ?? []), nuevaImagen] }
            : p
        )
      );
      setMensaje("✅ Imagen agregada");
      setTimeout(() => setMensaje(""), 2000);
    } catch {
      setMensaje("❌ Error al agregar imagen");
    }
    setSubiendoImagen(null);
  }

  async function subirArchivos(productoId: number, files: File[], alt = "") {
    const disponibles = MAX_IMAGENES - imagenesModal.length;
    if (disponibles <= 0 || files.length > disponibles) {
      setMensaje(`❌ Máximo ${MAX_IMAGENES} imágenes por producto`);
      setTimeout(() => setMensaje(""), 3000);
      return;
    }
    setSubiendoArchivo(productoId);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      formData.append("alt", alt);
      const res = await fetch(`/api/admin/productos/${productoId}/imagenes/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error al subir archivo");
      }
      const data = await res.json();
      const nuevasImagenes: ImagenAdmin[] = data.imagenes ?? [data.imagen];
      setImagenesModal((prev) => [...prev, ...nuevasImagenes]);
      setProductos((prev) =>
        prev.map((p) =>
          p.id === productoId
            ? { ...p, imagenes: [...(p.imagenes ?? []), ...nuevasImagenes] }
            : p
        )
      );
      setMensaje(`✅ ${nuevasImagenes.length} imagen${nuevasImagenes.length === 1 ? "" : "es"} optimizada${nuevasImagenes.length === 1 ? "" : "s"}`);
      setTimeout(() => setMensaje(""), 2000);
    } catch (e) {
      setMensaje(e instanceof Error ? `❌ ${e.message}` : "❌ Error al subir archivo");
      setTimeout(() => setMensaje(""), 3000);
    }
    setSubiendoArchivo(null);
  }

  async function reemplazarArchivo(productoId: number, imagenId: number, file: File) {
    setReemplazandoId(imagenId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/admin/productos/${productoId}/imagenes/${imagenId}`, { method: "PATCH", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al reemplazar");
      await cargarImagenes(productoId);
      setProductos((prev) => prev.map((p) => p.id === productoId ? { ...p, imagenes: (p.imagenes ?? []).map((img) => img.id === imagenId ? data.imagen : img) } : p));
      setMensaje("✅ Imagen reemplazada y optimizada");
    } catch (error) {
      setMensaje(error instanceof Error ? `❌ ${error.message}` : "❌ Error al reemplazar");
    } finally {
      setReemplazandoId(null);
      setTimeout(() => setMensaje(""), 3000);
    }
  }

  async function actualizarImagen(productoId: number, imagenId: number, datos: Partial<ImagenAdmin>) {
    try {
      const res = await fetch(`/api/admin/productos/${productoId}/imagenes/${imagenId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      if (!res.ok) throw new Error("Error al actualizar");
      await cargarImagenes(productoId);
      // Actualizar lista principal
      setProductos((prev) =>
        prev.map((p) =>
          p.id === productoId
            ? { ...p, imagenes: (p.imagenes ?? []).map((img) => (img.id === imagenId ? { ...img, ...datos } : img)) }
            : p
        )
      );
      setMensaje("✅ Imagen actualizada");
      setTimeout(() => setMensaje(""), 2000);
    } catch {
      setMensaje("❌ Error al actualizar imagen");
    }
  }

  async function borrarImagen(productoId: number, imagenId: number) {
    if (!confirm("¿Borrar esta imagen?")) return;
    try {
      const res = await fetch(`/api/admin/productos/${productoId}/imagenes/${imagenId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al borrar");
      await cargarImagenes(productoId);
      setProductos((prev) =>
        prev.map((p) =>
          p.id === productoId
            ? { ...p, imagenes: (p.imagenes ?? []).filter((img) => img.id !== imagenId) }
            : p
        )
      );
      setMensaje("🗑️ Imagen eliminada");
      setTimeout(() => setMensaje(""), 2000);
    } catch {
      setMensaje("❌ Error al borrar imagen");
    }
  }

  async function sincronizarCarpeta(productoId: number, slug: string) {
    if (!confirm(`¿Escanear carpeta public/productos/${slug}/ y asociar imágenes encontradas?`)) return;
    setMensaje("⏳ Escaneando carpeta...");
    try {
      // Llamar a endpoint de sincronización (se crea después)
      const res = await fetch(`/api/admin/productos/${productoId}/sincronizar-imagenes`, { method: "POST" });
      if (!res.ok) throw new Error("Error al sincronizar");
      const data = await res.json();
      await cargarImagenes(productoId);
      setProductos((prev) =>
        prev.map((p) => (p.id === productoId ? { ...p, imagenes: data.imagenes } : p))
      );
      setMensaje(`✅ ${data.agregadas} imagen(es) agregada(s) de la carpeta`);
      setTimeout(() => setMensaje(""), 3000);
    } catch {
      setMensaje("❌ Error al sincronizar carpeta");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-stone-900">{categoriaInicial ? `Productos · ${categoriaInicial}` : "Productos"}</h2>
          <p className="mt-1 text-sm text-stone-500">
            {productos.length} productos · Crea, edita y organiza el catálogo
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <input
            type="search"
            placeholder="Buscar por nombre, slug o marca..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="w-full max-w-xs rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-[#3f806e] focus:outline-none"
          />
          <button type="button" onClick={abrirNuevoProducto} className="rounded-xl bg-[#203128] px-5 py-2.5 text-sm font-bold text-white">
            + Nuevo producto
          </button>
        </div>
      </div>

      {mensaje && (
        <div className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{mensaje}</div>
      )}

      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs font-semibold text-stone-400 uppercase bg-stone-50">
              <th className="p-4">Producto</th>
              <th className="p-4 hidden md:table-cell">Marca</th>
              <th className="p-4 hidden lg:table-cell">Categoría</th>
              <th className="p-4">Imágenes</th>
              <th className="p-4">Precio</th>
              <th className="p-4">Stock</th>
              <th className="p-4">Estado</th>
              <th className="p-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {productosFiltrados.map((p) => (
              <tr key={p.id} className={editandoId === p.id ? "bg-[#fbf8f1]" : ""}>
                <td className="p-4">
                  <p className="font-semibold text-stone-900">{p.nombre}</p>
                  <p className="text-xs text-stone-400">{p.slug}</p>
                </td>
                <td className="p-4 hidden md:table-cell text-sm text-stone-600">{p.brand.nombre}</td>
                <td className="p-4 hidden lg:table-cell text-sm text-stone-600">{p.category.nombre}</td>
                <td className="p-4">
                  {(p.imagenes?.length ?? 0) > 0 ? (
                    <div className="flex gap-1">
                      {p.imagenes!.slice(0, 3).map((img) => (
                        <ImagenProducto
                          key={img.id}
                          src={img.url}
                          alt={img.alt ?? p.nombre}
                          blurDataURL={img.blurDataUrl}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-lg bg-white object-contain border border-stone-200"
                        />
                      ))}
                      {p.imagenes!.length > 3 && (
                        <div className="h-10 w-10 rounded-lg bg-stone-100 flex items-center justify-center text-xs text-stone-500 border border-stone-200">
                          +{p.imagenes!.length - 3}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-stone-400">Sin imágenes</span>
                  )}
                </td>
                <td className="p-4 font-semibold text-stone-900">{formatearPrecio(p.precio)}</td>
                <td className="p-4">
                  {editandoId === p.id ? (
                    <input
                      type="number"
                      min="0"
                      max="999"
                      value={stockEdit}
                      onChange={(e) => setStockEdit(e.target.value)}
                      className="w-24 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-[#3f806e] focus:outline-none"
                    />
                  ) : (
                    <span className={p.stock < 5 ? "font-semibold text-red-600" : "text-stone-900"}>
                      {p.stock} {p.stock < 5 && "⚠️"}
                    </span>
                  )}
                </td>
                <td className="p-4">
                  {editandoId === p.id ? (
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={activoEdit}
                        onChange={(e) => setActivoEdit(e.target.checked)}
                        className="h-4 w-4 rounded border-stone-300 text-[#3f806e] focus:ring-[#3f806e]"
                      />
                      Activo
                    </label>
                  ) : (
                    <span className={p.activo ? "text-emerald-600" : "text-stone-400"}>
                      {p.activo ? "✓ Activo" : "✕ Inactivo"}
                    </span>
                  )}
                </td>
                <td className="p-4">
                  {editandoId === p.id ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => alGuardar(p.id)}
                        disabled={guardando === p.id}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {guardando === p.id ? "Guardando..." : "Guardar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditandoId(null)}
                        className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => iniciarEdicion(p)}
                        className="rounded-xl bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-200"
                      >
                        Stock/estado
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirEdicionCompleta(p)}
                        className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-200"
                      >
                        Editar datos
                      </button>
                      <button
                        type="button"
                        onClick={() => { abrirModalImagenes(p.id); cargarImagenes(p.id); }}
                        className="rounded-xl bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-200"
                      >
                        🖼️ Imágenes
                      </button>
                      <button
                        type="button"
                        onClick={() => sincronizarCarpeta(p.id, p.slug)}
                        className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-200"
                      >
                        📁 Sincronizar
                      </button>
                      <button
                        type="button"
                        onClick={() => eliminarProducto(p)}
                        className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {productosFiltrados.length === 0 && (
          <div className="p-12 text-center text-stone-500">No hay productos con ese filtro</div>
        )}
      </div>

      {/* Formulario completo de alta/edición. Se conserva la gestión avanzada de imágenes existente. */}
      {formularioId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setFormularioId(null)}>
          <form onSubmit={guardarProducto} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-2xl font-bold text-stone-900">{formularioId === "nuevo" ? "Nuevo producto" : "Editar producto"}</h3>
                <p className="mt-1 text-sm text-stone-500">Los cambios aparecen automáticamente en la tienda.</p>
              </div>
              <button type="button" onClick={() => setFormularioId(null)} className="text-2xl text-stone-400">✕</button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2 text-sm font-semibold text-stone-700">Nombre<input required value={formulario.nombre} onChange={(event) => setFormulario({ ...formulario, nombre: event.target.value })} className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 font-normal" /></label>
              <label className="sm:col-span-2 text-sm font-semibold text-stone-700">Descripción<textarea required rows={4} value={formulario.descripcion} onChange={(event) => setFormulario({ ...formulario, descripcion: event.target.value })} className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 font-normal" /></label>
              <label className="sm:col-span-2 text-sm font-semibold text-stone-700">Modo de uso<textarea required rows={3} value={formulario.modoUso} onChange={(event) => setFormulario({ ...formulario, modoUso: event.target.value })} className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 font-normal" /></label>
              <label className="text-sm font-semibold text-stone-700">Precio USD<input required type="number" min="0" step="0.01" value={formulario.precio} onChange={(event) => setFormulario({ ...formulario, precio: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 font-normal" /></label>
              <label className="text-sm font-semibold text-stone-700">Stock<input required type="number" min="0" step="1" value={formulario.stock} onChange={(event) => setFormulario({ ...formulario, stock: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 font-normal" /></label>
              <label className="text-sm font-semibold text-stone-700">Categoría<select required value={formulario.categoryId} onChange={(event) => setFormulario({ ...formulario, categoryId: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 font-normal">{categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}</select></label>
              <label className="text-sm font-semibold text-stone-700">Marca<select required value={formulario.brandId} onChange={(event) => setFormulario({ ...formulario, brandId: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 font-normal">{marcas.map((marca) => <option key={marca.id} value={marca.id}>{marca.nombre}</option>)}</select></label>
              <label className="sm:col-span-2 text-sm font-semibold text-stone-700">URL o ruta de imagen principal<input value={formulario.imagen} onChange={(event) => setFormulario({ ...formulario, imagen: event.target.value })} placeholder="/productos/mi-producto/foto.webp o https://..." className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 font-normal" /><span className="mt-1 block text-xs font-normal text-stone-400">También puedes subir archivos con el botón Imágenes después de guardar.</span></label>
              <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm font-semibold text-stone-700"><input type="checkbox" checked={formulario.activo} onChange={(event) => setFormulario({ ...formulario, activo: event.target.checked })} /> Mostrar en la tienda</label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setFormularioId(null)} className="rounded-xl border border-stone-300 px-5 py-2.5 text-sm font-semibold">Cancelar</button>
              <button disabled={guardandoFormulario} className="rounded-xl bg-[#203128] px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50">{guardandoFormulario ? "Guardando…" : "Guardar producto"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de imágenes */}
      {modalImagenesId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModalImagenesId(null)}>
          <div className="w-full max-w-3xl max-h-[90vh] rounded-2xl bg-white overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
              <h3 className="font-display text-xl font-bold text-stone-900">Gestionar imágenes</h3>
              <button onClick={() => setModalImagenesId(null)} className="text-stone-400 hover:text-stone-600 text-2xl">✕</button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Agregar imagen */}
              <div className="rounded-xl border-2 border-dashed border-stone-300 bg-white/50 p-4">
                <h4 className="font-semibold text-stone-900 mb-3">Agregar imagen (URL)</h4>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://ejemplo.com/imagen.jpg"
                    className="flex-1 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-[#3f806e] focus:outline-none"
                    id="nueva-imagen-url"
                  />
                  <input
                    type="text"
                    placeholder="Texto alternativo (opcional)"
                    className="w-48 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-[#3f806e] focus:outline-none"
                    id="nueva-imagen-alt"
                  />
                  <button
                    onClick={() => {
                      const urlInput = document.getElementById("nueva-imagen-url") as HTMLInputElement;
                      const altInput = document.getElementById("nueva-imagen-alt") as HTMLInputElement;
                      if (urlInput?.value) {
                        agregarImagen(modalImagenesId!, urlInput.value, altInput?.value ?? "");
                        urlInput.value = "";
                        altInput.value = "";
                      }
                    }}
                    disabled={subiendoImagen === modalImagenesId}
                    className="rounded-xl bg-[#3f806e] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2c5e50] disabled:opacity-50"
                  >
                    {subiendoImagen === modalImagenesId ? "Subiendo..." : "Agregar"}
                  </button>
                </div>
              </div>

              {/* Carga múltiple con arrastrar y soltar */}
              <div
                onDragEnter={(e) => { e.preventDefault(); setArrastrando(true); }}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={(e) => { e.preventDefault(); setArrastrando(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setArrastrando(false);
                  const files = Array.from(e.dataTransfer.files).filter((file) => file.type.startsWith("image/"));
                  if (files.length) void subirArchivos(modalImagenesId!, files);
                }}
                className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${arrastrando ? "border-[#3f806e] bg-[#fbf8f1]" : "border-stone-300 bg-white/50"}`}
              >
                <p className="font-semibold text-stone-900">Arrastrá aquí tus fotografías</p>
                <p className="mt-1 text-xs text-stone-500">JPG, PNG, WebP o AVIF · hasta 8 MB · se convierten automáticamente a WebP</p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  multiple
                  className="sr-only"
                  id="nueva-imagen-archivo"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length) void subirArchivos(modalImagenesId!, files);
                    e.target.value = "";
                  }}
                />
                <label htmlFor="nueva-imagen-archivo" className={`mt-4 inline-flex min-h-11 cursor-pointer items-center rounded-full bg-[#203128] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#3f806e] ${subiendoArchivo === modalImagenesId || imagenesModal.length >= MAX_IMAGENES ? "pointer-events-none opacity-50" : ""}`}>
                  {subiendoArchivo === modalImagenesId ? "Optimizando imágenes..." : "Seleccionar fotografías"}
                </label>
                {imagenesModal.length >= MAX_IMAGENES && (
                  <p className="mt-2 text-xs text-amber-600">Límite de {MAX_IMAGENES} imágenes alcanzado</p>
                )}
              </div>

              {/* Sincronizar carpeta */}
              {(() => {
                const prod = productos.find((p) => p.id === modalImagenesId);
                return (
                  <div className="rounded-xl border border-stone-200 bg-amber-50 p-4">
                    <p className="text-sm font-medium text-amber-800">📁 Carga masiva desde carpeta</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Coloca imágenes en <code className="bg-amber-100 px-1 rounded">public/productos/{prod?.slug}/</code>
                      y pulsa para asociarlas automáticamente.
                    </p>
                    <button
                      onClick={() => sincronizarCarpeta(modalImagenesId!, prod?.slug ?? "")}
                      className="mt-3 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                    >
                      📁 Sincronizar carpeta public/productos/{prod?.slug}/
                    </button>
                  </div>
                );
              })()}

              {/* Lista de imágenes */}
              {imagenesModal.length === 0 ? (
                <p className="text-center text-stone-500 py-8">Sin imágenes. Agrega una URL o sincroniza la carpeta.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {imagenesModal.map((img) => (
                    <div key={img.id} className="relative rounded-xl border border-stone-200 bg-white overflow-hidden">
                      {img.principal && (
                        <span className="absolute top-2 left-2 z-10 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">Principal</span>
                      )}
                      <ImagenProducto
                        src={img.url}
                        alt={img.alt ?? "Imagen producto"}
                        blurDataURL={img.blurDataUrl}
                        width={420}
                        height={420}
                        className="aspect-[4/4.55] w-full bg-white object-contain p-1"
                      />
                      <div className="p-3 space-y-2">
                        <input
                          type="text"
                          value={img.alt ?? ""}
                          onChange={(e) => actualizarImagen(modalImagenesId!, img.id, { alt: e.target.value })}
                          placeholder="Texto alternativo"
                          className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-[#3f806e] focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            value={img.orden}
                            onChange={(e) => actualizarImagen(modalImagenesId!, img.id, { orden: Number(e.target.value) })}
                            className="w-16 rounded-xl border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 focus:border-[#3f806e] focus:outline-none"
                          />
                          <button type="button" disabled={img.principal} onClick={() => actualizarImagen(modalImagenesId!, img.id, { principal: true })} className="flex-1 rounded-lg border border-[#3f806e]/30 px-2 py-1.5 text-xs font-semibold text-[#547565] disabled:bg-[#fbf8f1] disabled:text-[#203128]">
                            {img.principal ? "Foto principal" : "Definir principal"}
                          </button>
                        </div>
                        <input
                          id={`reemplazar-${img.id}`}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void reemplazarArchivo(modalImagenesId!, img.id, file);
                            e.target.value = "";
                          }}
                        />
                        <label htmlFor={`reemplazar-${img.id}`} className="block cursor-pointer rounded-xl border border-stone-200 px-3 py-2 text-center text-sm font-semibold text-stone-700 hover:bg-stone-50">
                          {reemplazandoId === img.id ? "Reemplazando..." : "Reemplazar foto"}
                        </label>
                        <button
                          onClick={() => borrarImagen(modalImagenesId!, img.id)}
                          className="w-full rounded-xl bg-red-100 px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-200"
                        >
                          🗑️ Borrar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
