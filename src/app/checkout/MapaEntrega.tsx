"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

export interface CoordenadasEntrega { latitud: number; longitud: number }

const ZOOM_MIN = 12;
const ZOOM_MAX = 18;
const TAMANO_TILE = 256;
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

function aMundo(latitud: number, longitud: number, zoom: number) {
  const escala = TAMANO_TILE * 2 ** zoom;
  const latLimitada = Math.max(-85.0511, Math.min(85.0511, latitud));
  const seno = Math.sin((latLimitada * Math.PI) / 180);
  return {
    x: ((longitud + 180) / 360) * escala,
    y: (0.5 - Math.log((1 + seno) / (1 - seno)) / (4 * Math.PI)) * escala,
  };
}

function desdeMundo(x: number, y: number, zoom: number): CoordenadasEntrega {
  const escala = TAMANO_TILE * 2 ** zoom;
  const longitud = (x / escala) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / escala;
  const latitud = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return { latitud, longitud };
}

export function MapaEntrega({ value, onChange }: { value: CoordenadasEntrega | null; onChange: (value: CoordenadasEntrega) => void }) {
  const mapaRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(15);
  const [centro, setCentro] = useState<CoordenadasEntrega>(value ?? { latitud: -25.56, longitud: -54.62 });
  const [geolocalizando, setGeolocalizando] = useState(false);
  const [errorUbicacion, setErrorUbicacion] = useState("");
  const [desplazamiento, setDesplazamiento] = useState({ x: 0, y: 0 });
  const gestoRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);

  useEffect(() => { if (value) setCentro(value); }, [value]);

  const mundo = aMundo(centro.latitud, centro.longitud, zoom);
  const ancho = mapaRef.current?.clientWidth ?? 360;
  const alto = mapaRef.current?.clientHeight ?? 220;
  const tileX = Math.floor(mundo.x / TAMANO_TILE);
  const tileY = Math.floor(mundo.y / TAMANO_TILE);
  const maxTiles = 2 ** zoom;
  const tiles: Array<{ x: number; y: number; left: number; top: number; key: string }> = [];
  for (let desplazamientoX = -1; desplazamientoX <= 1; desplazamientoX += 1) {
    for (let desplazamientoY = -1; desplazamientoY <= 1; desplazamientoY += 1) {
      const y = tileY + desplazamientoY;
      if (y < 0 || y >= maxTiles) continue;
      const xSinLimitar = tileX + desplazamientoX;
      const x = ((xSinLimitar % maxTiles) + maxTiles) % maxTiles;
      tiles.push({
        x, y,
        left: xSinLimitar * TAMANO_TILE - mundo.x + ancho / 2 + desplazamiento.x,
        top: y * TAMANO_TILE - mundo.y + alto / 2 + desplazamiento.y,
        key: `${zoom}/${x}/${y}`,
      });
    }
  }

  function iniciarGesto(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button, a")) return;
    if (event.button !== 0) return;
    gestoRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moverGesto(event: PointerEvent<HTMLDivElement>) {
    const inicio = gestoRef.current;
    if (!inicio || inicio.pointerId !== event.pointerId) return;
    setDesplazamiento({ x: event.clientX - inicio.x, y: event.clientY - inicio.y });
  }

  function terminarGesto(event: PointerEvent<HTMLDivElement>) {
    const inicio = gestoRef.current;
    if (!inicio || inicio.pointerId !== event.pointerId) return;
    const dx = event.clientX - inicio.x;
    const dy = event.clientY - inicio.y;
    const rect = event.currentTarget.getBoundingClientRect();
    const elegido = Math.hypot(dx, dy) > 6
      ? desdeMundo(mundo.x - dx, mundo.y - dy, zoom)
      : desdeMundo(mundo.x + event.clientX - rect.left - rect.width / 2, mundo.y + event.clientY - rect.top - rect.height / 2, zoom);
    gestoRef.current = null;
    setDesplazamiento({ x: 0, y: 0 });
    setCentro(elegido);
    onChange(elegido);
  }

  function cancelarGesto(event: PointerEvent<HTMLDivElement>) {
    if (gestoRef.current?.pointerId !== event.pointerId) return;
    gestoRef.current = null;
    setDesplazamiento({ x: 0, y: 0 });
  }

  function seleccionarCentro() {
    onChange(centro);
  }

  function seleccionarTeclado(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    seleccionarCentro();
  }

  function usarMiUbicacion() {
    setErrorUbicacion("");
    if (!navigator.geolocation) { setErrorUbicacion("Este navegador no permite obtener la ubicación."); return; }
    setGeolocalizando(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const punto = { latitud: coords.latitude, longitud: coords.longitude };
        setCentro(punto);
        onChange(punto);
        setGeolocalizando(false);
      },
      () => { setErrorUbicacion("No se pudo obtener tu ubicación. Puedes elegir el punto tocando el mapa."); setGeolocalizando(false); },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-stone-600">Ubicación exacta opcional · toca el mapa para marcarla.</p>
        <button type="button" onClick={usarMiUbicacion} disabled={geolocalizando} className="rounded-full border border-[#3f806e]/25 px-3 py-1.5 text-xs font-bold text-[#315141] hover:bg-[#edf3ef] disabled:opacity-50">{geolocalizando ? "Buscando…" : "Usar mi ubicación"}</button>
      </div>
      <div ref={mapaRef} role="button" tabIndex={0} aria-label="Mapa interactivo. Arrastra y toca para marcar la ubicación de entrega" onPointerDown={iniciarGesto} onPointerMove={moverGesto} onPointerUp={terminarGesto} onPointerCancel={cancelarGesto} onKeyDown={seleccionarTeclado} className="relative h-56 overflow-hidden rounded-2xl border border-stone-300 bg-[#e9eee8] outline-none focus:ring-2 focus:ring-[#3f806e]" style={{ cursor: "grab", touchAction: "none" }}>
        {tiles.map((tile) => <div key={tile.key} aria-hidden="true" className="pointer-events-none absolute h-64 w-64 bg-[#e9eee8]" style={{ left: tile.left, top: tile.top, backgroundImage: `url(${TILE_URL.replace("{z}", String(zoom)).replace("{x}", String(tile.x)).replace("{y}", String(tile.y))})`, backgroundPosition: "center", backgroundSize: "256px 256px" }} />)}
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full drop-shadow-md"><span className="relative block h-8 w-8 rounded-full border-[3px] border-white bg-[#315141] after:absolute after:left-1/2 after:top-6 after:h-3 after:w-3 after:-translate-x-1/2 after:rotate-45 after:border-b-[3px] after:border-r-[3px] after:border-white after:bg-[#315141]" /></div>
        <div className="absolute right-2 top-2 z-20 flex flex-col overflow-hidden rounded-lg border border-stone-300 bg-white shadow"><button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setZoom((actual) => Math.min(ZOOM_MAX, actual + 1)); }} aria-label="Acercar mapa" className="h-9 w-9 text-lg font-bold text-stone-700 hover:bg-stone-100">+</button><button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setZoom((actual) => Math.max(ZOOM_MIN, actual - 1)); }} aria-label="Alejar mapa" className="h-9 w-9 border-t border-stone-200 text-lg font-bold text-stone-700 hover:bg-stone-100">−</button></div>
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="absolute bottom-1 right-1 z-20 rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-stone-700">© OpenStreetMap</a>
        <span className="sr-only">Mapa de {ancho} por {alto} píxeles</span>
      </div>
      {value ? <p className="text-xs text-stone-500">Punto seleccionado: {value.latitud.toFixed(5)}, {value.longitud.toFixed(5)}. Se incluirá en los detalles del pedido.</p> : <p className="text-xs text-stone-500">Puedes marcar el mapa o usar tu ubicación actual. Si no puedes, escribe la dirección y continúa sin el punto exacto.</p>}
      {errorUbicacion && <p role="status" className="text-xs text-amber-800">{errorUbicacion}</p>}
      <p className="text-[11px] leading-4 text-stone-400">OpenStreetMap recibe la zona visible para cargar el mapa. La dirección y el punto exacto quedan en el pedido solo cuando lo confirmas.</p>
    </div>
  );
}
