import type { NextConfig } from "next";
import { existsSync, mkdirSync, symlinkSync } from "node:fs";
import path from "node:path";

const esBuildProduccion = process.env.NEXT_PHASE === "phase-production-build"
  || process.argv.some((argumento) => argumento === "build" || argumento === "start");
const directorioPredeterminado = esBuildProduccion ? ".glasskin-build-output" : ".glasskin-runtime";
let directorioDeSalida = process.env.NEXT_DIST_DIR || directorioPredeterminado;

// La salida de desarrollo queda dentro del proyecto para que Node resuelva los
// paquetes externos desde node_modules. La compilación de producción usa una
// caché separada de AppData para que OneDrive no gestione sus archivos temporales.
if (esBuildProduccion && process.platform === "win32" && process.env.LOCALAPPDATA && !process.env.NEXT_DIST_DIR) {
  try {
    const baseLocal = path.join(process.env.LOCALAPPDATA, "Glasskin");
    const destino = path.join(baseLocal, "build-runtime", "dist");
    const enlace = path.join(process.cwd(), directorioDeSalida);
    mkdirSync(destino, { recursive: true });
    if (!existsSync(enlace)) {
      symlinkSync(destino, enlace, "junction");
    }
  } catch {
    // Windows sin permiso de enlaces simbólicos: usar una carpeta local.
    directorioDeSalida = ".next";
  }
}

const nextConfig: NextConfig = {
  output: process.env.NEXT_OUTPUT_STANDALONE === "true" ? "standalone" : undefined,
  // OneDrive bloquea archivos temporales de Webpack de forma intermitente.
  // La caché generada vive en AppData; el código y los datos siguen aquí.
  distDir: directorioDeSalida,
  // Configuración para Turbopack (Next 15)
  turbopack: {
    root: process.cwd(),
  },
  // Next 15 ejecutado con Node 24 puede fallar en el hash WASM del worker
  // de compilación. El compilador principal es estable y produce el mismo build.
  experimental: {
    webpackBuildWorker: false,
  },
  webpack(config) {
    // Evita reutilizar hashes WASM incompatibles/corruptos entre Node 24 y
    // compilaciones interrumpidas. La aplicación es pequeña y prioriza estabilidad.
    config.cache = false;
    return config;
  },
};

export default nextConfig;
