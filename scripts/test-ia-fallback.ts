import { buscarProductosLocal, crearRutinaLocal, crearRutinaPresupuestoLocal, type ProductoCatalogoIA } from "../src/lib/ia/fallback";

const productos: ProductoCatalogoIA[] = [
  { id: 1, slug: "gel-suave", nombre: "Gel limpiador suave", brand: { nombre: "Marca prueba" }, category: { slug: "limpiadores" }, precio: 10, tipoPiel: JSON.stringify(["mixta"]), preocupaciones: JSON.stringify(["poros"]), descripcion: "Limpieza suave", modoUso: "Enjuagar", imagen: "/foto.webp" },
  { id: 2, slug: "crema", nombre: "Crema hidratante", brand: { nombre: "Marca prueba" }, category: { slug: "hidratantes" }, precio: 12, tipoPiel: JSON.stringify(["mixta"]), preocupaciones: JSON.stringify(["deshidratacion"]), descripcion: "Hidratación diaria", modoUso: "Aplicar", imagen: "/crema.webp" },
];

const buscar = buscarProductosLocal("piel mixta con poros", productos);
const rutina = crearRutinaLocal(productos);
const presupuesto = crearRutinaPresupuestoLocal(productos, 30);

if (!buscar.productos.length || rutina.manana.length !== 4 || presupuesto.total !== 22) {
  throw new Error("El respaldo local de Skin AI no produjo una respuesta válida.");
}

console.log(`Skin AI local OK: ${buscar.productos.length} recomendación(es), ${rutina.manana.length} pasos, total $${presupuesto.total}.`);
