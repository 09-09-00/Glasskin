"use client";

// ============================================================
//  Lista de deseos (wishlist) con contexto de React + localStorage
// ============================================================
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** Datos mínimos de un producto para la wishlist. */
export interface ProductoWishlist {
  id: number;
  slug: string;
  nombre: string;
  marca: string;
  precio: number;
  imagen: string | null;
}

interface WishlistContexto {
  items: ProductoWishlist[];
  agregar: (producto: ProductoWishlist) => void;
  quitar: (id: number) => void;
  vaciar: () => void;
  tiene: (id: number) => boolean;
  alternar: (producto: ProductoWishlist) => void;
  listo: boolean;
  cantidad: number;
}

const CLAVE_ALMACENAMIENTO = "aurora-skin-wishlist";

const WishlistCtx = createContext<WishlistContexto | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ProductoWishlist[]>([]);
  const [listo, setListo] = useState(false);

  // Cargar la wishlist guardada solo la primera vez
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_ALMACENAMIENTO);
      if (guardado) {
        const parsed: unknown = JSON.parse(guardado);
        if (Array.isArray(parsed)) {
          setItems(
            parsed.filter(
              (i): i is ProductoWishlist =>
                typeof i === "object" &&
                i !== null &&
                typeof (i as ProductoWishlist).id === "number" &&
                typeof (i as ProductoWishlist).precio === "number"
            )
          );
        }
      }
    } catch {
      // Si la wishlist guardada está corrupta, se empieza vacía
    }
    setListo(true);
  }, []);

  // Guardar en localStorage en cada cambio
  useEffect(() => {
    if (!listo) return;
    try {
      localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(items));
    } catch {
      // localStorage puede fallar (modo privado); la wishlist sigue en memoria
    }
  }, [items, listo]);

  const valor = useMemo<WishlistContexto>(
    () => ({
      items,
      listo,
      agregar: (producto) => {
        setItems((prev) => {
          if (prev.some((i) => i.id === producto.id)) return prev;
          return [...prev, producto];
        });
      },
      quitar: (id) => setItems((prev) => prev.filter((i) => i.id !== id)),
      vaciar: () => setItems([]),
      tiene: (id) => items.some((i) => i.id === id),
      alternar: (producto) => {
        setItems((prev) =>
          prev.some((i) => i.id === producto.id)
            ? prev.filter((i) => i.id !== producto.id)
            : [...prev, producto]
        );
      },
      cantidad: items.length,
    }),
    [items, listo]
  );

  return <WishlistCtx.Provider value={valor}>{children}</WishlistCtx.Provider>;
}

/** Hook para usar la wishlist en cualquier componente cliente. */
export function useWishlist(): WishlistContexto {
  const ctx = useContext(WishlistCtx);
  if (!ctx) throw new Error("useWishlist debe usarse dentro de <WishlistProvider>");
  return ctx;
}