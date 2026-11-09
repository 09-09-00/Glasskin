import "dotenv/config";
import { procesarRecordatoriosReposicion } from "../src/lib/recordatorios-reposicion";

const minutos = Number(process.env.RECORDATORIOS_INTERVALO_MINUTOS ?? 60);
const intervaloMs = Math.min(24 * 60, Math.max(5, Number.isFinite(minutos) ? minutos : 60)) * 60 * 1000;
let procesando = false;

async function procesar() {
  if (procesando) return;
  procesando = true;
  try {
    const resultado = await procesarRecordatoriosReposicion();
    if (resultado.preparados || resultado.pendientes || resultado.errores) {
      console.log(`[recordatorios ${new Date().toISOString()}] ${JSON.stringify(resultado)}`);
    }
  } catch (error) {
    console.error(`[recordatorios ${new Date().toISOString()}] No se pudo procesar la cola:`, error);
  } finally {
    procesando = false;
  }
}

console.log(`[recordatorios] Trabajador activo; revisión cada ${Math.round(intervaloMs / 60_000)} minutos.`);
void procesar();
setInterval(() => void procesar(), intervaloMs);
