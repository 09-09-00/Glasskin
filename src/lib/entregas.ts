import { prisma } from "@/lib/prisma";
import { TIENDA } from "@/lib/config";

export const ENTREGA_DEFAULTS = {
  direccionRetiro: TIENDA.ubicacion,
  costoDeliveryUsd: 0,
  envioGratisDesdeUsd: 0,
  latitudLocal: -25.56,
  longitudLocal: -54.62,
};

export async function obtenerConfiguracionEntrega() {
  const claves = ["direccion_retiro", "costo_delivery_usd", "envio_gratis_desde_usd", "latitud_local", "longitud_local"];
  const settings = await prisma.setting.findMany({ where: { clave: { in: claves } } });
  const valores = new Map(settings.map((setting) => [setting.clave, setting.valor]));
  const numero = (clave: string, defecto: number) => {
    const valor = Number(valores.get(clave));
    return Number.isFinite(valor) && valor >= 0 ? valor : defecto;
  };
  return {
    direccionRetiro: valores.get("direccion_retiro")?.trim() || ENTREGA_DEFAULTS.direccionRetiro,
    retiroConfigurado: Boolean(valores.get("direccion_retiro")?.trim() && valores.get("direccion_retiro")?.trim() !== ENTREGA_DEFAULTS.direccionRetiro),
    costoDeliveryUsd: numero("costo_delivery_usd", ENTREGA_DEFAULTS.costoDeliveryUsd),
    envioGratisDesdeUsd: numero("envio_gratis_desde_usd", ENTREGA_DEFAULTS.envioGratisDesdeUsd),
    latitudLocal: Number(valores.get("latitud_local")) || ENTREGA_DEFAULTS.latitudLocal,
    longitudLocal: Number(valores.get("longitud_local")) || ENTREGA_DEFAULTS.longitudLocal,
  };
}

/** Estimación orientativa por distancia en línea recta desde el local; nunca supera tres días. */
export function estimarDiasDelivery(destino: { latitud: number; longitud: number }, origen: { latitud: number; longitud: number }) {
  const rad = (grados: number) => grados * Math.PI / 180;
  const dLat = rad(destino.latitud - origen.latitud);
  const dLon = rad(destino.longitud - origen.longitud);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(origen.latitud)) * Math.cos(rad(destino.latitud)) * Math.sin(dLon / 2) ** 2;
  const distanciaKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.min(3, distanciaKm <= 20 ? 1 : distanciaKm <= 100 ? 2 : 3);
}
