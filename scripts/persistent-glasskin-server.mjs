import "dotenv/config";
import { closeSync, openSync, writeFileSync, writeSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const tsxBin = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
const workerScript = path.join(root, "scripts", "recordatorios-worker.ts");
const logPath = path.join(root, "glasskin-server.log");
const statePath = path.join(root, ".glasskin-server.json");
const taskName = "GlasskinLocalServer";
const portIndex = process.argv.indexOf("--port");
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : 3000);

const log = openSync(logPath, "a");
writeSync(log, `\n[${new Date().toISOString()}] Supervisor persistente iniciando Glasskin en ${port}\n`);

if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  writeSync(log, "DATABASE_URL falta o no es PostgreSQL.\n");
  closeSync(log);
  process.exit(1);
}

const child = spawn(process.execPath, [nextBin, "dev", "--hostname", "0.0.0.0", "-p", String(port)], {
  cwd: root,
  windowsHide: true,
  stdio: ["ignore", log, log],
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: "1",
    NODE_PATH: process.env.NODE_PATH
      ? `${path.join(root, "node_modules")}${path.delimiter}${process.env.NODE_PATH}`
      : path.join(root, "node_modules"),
  },
});

const worker = spawn(process.execPath, [tsxBin, workerScript], {
  cwd: root,
  windowsHide: true,
  stdio: ["ignore", log, log],
  env: {
    ...process.env,
    NODE_PATH: process.env.NODE_PATH
      ? `${path.join(root, "node_modules")}${path.delimiter}${process.env.NODE_PATH}`
      : path.join(root, "node_modules"),
  },
});

writeFileSync(
  statePath,
  JSON.stringify(
    { pid: child.pid, supervisorPid: process.pid, port, taskName, startedAt: new Date().toISOString() },
    null,
    2,
  ),
);
closeSync(log);

function detener() {
  if (child.exitCode === null) child.kill("SIGTERM");
  if (worker.exitCode === null) worker.kill("SIGTERM");
}

process.on("SIGINT", detener);
process.on("SIGTERM", detener);
child.on("exit", (code) => {
  detener();
  process.exitCode = code ?? 1;
});

worker.on("error", (error) => {
  const workerLog = openSync(logPath, "a");
  writeSync(workerLog, `[${new Date().toISOString()}] No se pudo iniciar el trabajador de recordatorios: ${error.message}\n`);
  closeSync(workerLog);
});

worker.on("exit", (code) => {
  if (code && child.exitCode === null) {
    const workerLog = openSync(logPath, "a");
    writeSync(workerLog, `[${new Date().toISOString()}] El trabajador de recordatorios terminó con código ${code}.\n`);
    closeSync(workerLog);
  }
});
