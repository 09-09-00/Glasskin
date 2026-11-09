"use client";

// ============================================================
//  Carrito de compras con contexto de React + localStorage
//  El carrito vive en el navegador; los precios reales se
//  recalculan en el servidor al crear el pedido.
// ============================================================
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** Datos mínimos de un producto para poder agregarlo al carrito. */
export interface ProductoCarrito {
  id: number;
  slug: string;
  nombre: string;
  marca: string;
  precio: number;
  imagen: string | null;
}

interface ItemCarrito extends ProductoCarrito {
  cantidad: number;
}

interface CarritoContexto {
  items: ItemCarrito[];
  agregar: (producto: ProductoCarrito, cantidad?: number) => void;
  quitar: (id: number) => void;
  cambiarCantidad: (id: number, cantidad: number) => void;
  vaciar: () => void;
  total: number;
  cantidadTotal: number;
  listo: boolean;
}

const CLAVE_ALMACENAMIENTO = "aurora-skin-carrito";
const CANTIDAD_MAXIMA = 20;

const CarritoCtx = createContext<CarritoContexto | null>(null);

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [listo, setListo] = useState(false);

  // Cargar el carrito guardado solo la primera vez
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_ALMACENAMIENTO);
      if (guardado) {
        const parsed: unknown = JSON.parse(guardado);
        if (Array.isArray(parsed)) {
          setItems(
            parsed.filter(
              (i): i is ItemCarrito =>
                typeof i === "object" &&
                i !== null &&
                typeof (i as ItemCarrito).id === "number" &&
                typeof (i as ItemCarrito).precio === "number" &&
                typeof (i as ItemCarrito).cantidad === "number"
            )
          );
        }
      }
    } catch {
      // Si el carrito guardado está corrupto, se empieza vacío
    }
    setListo(true);
  }, []);

  // Guardar en localStorage en cada cambio
  useEffect(() => {
    if (!listo) return;
    try {
      localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(items));
    } catch {
      // localStorage puede fallar (modo privado); el carrito sigue en memoria
    }
  }, [items, listo]);

  const valor = useMemo<CarritoContexto>(
    () => ({
      items,
      listo,
      agregar: (producto, cantidad = 1) => {
        setItems((prev) => {
          const existente = prev.find((i) => i.id === producto.id);
          if (existente) {
            return prev.map((i) =>
              i.id === producto.id
                ? { ...i, cantidad: Math.min(i.cantidad + cantidad, CANTIDAD_MAXIMA) }
                : i
            );
          }
          return [...prev, { ...producto, cantidad: Math.min(cantidad, CANTIDAD_MAXIMA) }];
        });
      },
      quitar: (id) => setItems((prev) => prev.filter((i) => i.id !== id)),
      cambiarCantidad: (id, cantidad) =>
        setItems((prev) =>
          prev.map((i) =>
            i.id === id
              ? { ...i, cantidad: Math.max(1, Math.min(cantidad, CANTIDAD_MAXIMA)) }
              : i
          )
        ),
      vaciar: () => setItems([]),
      total: items.reduce((acc, i) => acc + i.precio * i.cantidad, 0),
      cantidadTotal: items.reduce((acc, i) => acc + i.cantidad, 0),
    }),
    [items, listo]
  );

  return <CarritoCtx.Provider value={valor}>{children}</CarritoCtx.Provider>;
}

/** Hook para usar el carrito en cualquier componente cliente. */
export function useCarrito(): CarritoContexto {
  const ctx = useContext(CarritoCtx);
  if (!ctx) throw new Error("useCarrito debe usarse dentro de <CarritoProvider>");
  return ctx;
}
