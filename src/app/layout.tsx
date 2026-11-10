// ============================================================
//  Layout raíz: fuentes, carrito, wishlist, encabezado y pie de página
// ============================================================
import type { Metadata } from "next";
import "./globals.css";
import { CarritoProvider } from "@/components/CarritoProvider";
import { MonedaProvider } from "@/lib/moneda-provider";
import { WishlistProvider } from "@/components/WishlistProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TIENDA } from "@/lib/config";
import { AsistenteContacto } from "@/components/AsistenteContacto";
import { IdiomaProvider } from "@/lib/idioma-provider";
import { obtenerIdiomaServer } from "@/lib/idioma-server";

export const metadata: Metadata = {
  title: {
    default: `${TIENDA.nombre} — ${TIENDA.lema}`,
    template: `%s | ${TIENDA.nombre}`,
  },
  description: TIENDA.descripcion,
  keywords: ["skincare", "dermocosmética", "cosmética coreana", "marcas internacionales", "rutina facial", "protector solar", "Glasskin", "Presidente Franco"],
  openGraph: {
    title: `${TIENDA.nombre} — ${TIENDA.lema}`,
    description: TIENDA.descripcion,
    type: "website",
    locale: "es_PY",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const idioma = await obtenerIdiomaServer();
  return (
    <html lang={idioma}>
      <body className="font-sans antialiased">
        <CarritoProvider>
          <MonedaProvider>
            <IdiomaProvider idioma={idioma}>
              <WishlistProvider>
                <Header />
                <main className="min-h-[70vh]">{children}</main>
                <Footer />
                <AsistenteContacto />
              </WishlistProvider>
            </IdiomaProvider>
          </MonedaProvider>
        </CarritoProvider>
      </body>
    </html>
  );
}
