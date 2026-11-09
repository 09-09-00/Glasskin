import "dotenv/config";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { get } from "node:http";
import { Socket } from "node:net";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const logPath = path.join(root, "glasskin-server.log");
const statePath = path.join(root, ".glasskin-server.json");
const addressesPath = path.join(root, "DIRECCIONES-GLASSKIN.txt");
const startupInstaller = path.join(root, "scripts", "install-glasskin-startup.ps1");

function checkGlasskin(port) {
  return new Promise((resolve) => {
    const request = get(`http://127.0.0.1:${port}/api/health`, (response) => {
      response.resume();
      resolve(response.statusCode === 200 && response.headers["x-glasskin-health"] === "ok");
    });
    request.setTimeout(1200, () => request.destroy());
    request.on("error", () => resolve(false));
  });
}

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new Socket();
    const finish = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(800);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, "127.0.0.1");
  });
}

async function waitUntilReady(port) {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    if (await checkGlasskin(port)) return;
    await new Promise((resolve) => setTimeout(resolve, 900));
  }
  throw new Error(`Glasskin tardó demasiado en iniciar. Revisa ${logPath}`);
}

function installPersistentStartup(port) {
  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      startupInstaller,
      "-ProjectRoot",
      root,
      "-NodePath",
      process.execPath,
      "-Port",
      String(port),
    ],
    {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
    },
  );
  if (result.status !== 0) {
    const detail = `${result.stderr || result.stdout || "Error desconocido"}`.trim();
    throw new Error(`No se pudo registrar el inicio persistente: ${detail}`);
  }
}

function stopPersistentServer() {
  if (!existsSync(statePath)) return;
  try {
    const state = JSON.parse(readFileSync(statePath, "utf8"));
    const pid = Number(state.supervisorPid || state.pid);
    if (Number.isInteger(pid) && pid > 0) {
      spawnSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    }
  } catch {
    // Un archivo de estado viejo no debe impedir un nuevo intento.
  }
}

async function startOrFindServer() {
  for (let port = 3000; port <= 3010; port += 1) {
    if (await checkGlasskin(port)) return { port, running: true };
    if (await checkPort(port)) continue;

    try {
      stopPersistentServer();
      installPersistentStartup(port);
      await waitUntilReady(port);
      return { port, running: false };
    } catch (error) {
      stopPersistentServer();
      if (port < 3010) continue;
      throw error;
    }
  }
  throw new Error("No hay un puerto utilizable entre 3000 y 3010.");
}

function localAddresses(port) {
  const addresses = [];
  for (const items of Object.values(networkInterfaces())) {
    for (const item of items ?? []) {
      if (item.family === "IPv4" && !item.internal) addresses.push(`http://${item.address}:${port}`);
    }
  }
  return addresses;
}

function openBrowser(url) {
  const opener = spawn("cmd.exe", ["/d", "/s", "/c", "start", "", url], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  opener.unref();
}

async function main() {
  if (!existsSync(nextBin)) {
    throw new Error("Faltan las dependencias. Ejecuta npm install una vez dentro de la carpeta sistema.");
  }
  if (!process.env.DATABASE_URL?.startsWith("postgres")) {
    throw new Error("DATABASE_URL falta o no es una conexión PostgreSQL válida.");
  }

  const selected = await startOrFindServer();
  const localUrl = `http://localhost:${selected.port}`;

  console.log("Glasskin está listo.");
  console.log(`En esta computadora: ${localUrl}`);
  const networkUrls = localAddresses(selected.port);
  for (const address of networkUrls) console.log(`En tu red Wi-Fi: ${address}`);
  writeFileSync(addressesPath, [
    "GLASSKIN - DIRECCIONES PARA ABRIR",
    "",
    `En esta computadora: ${localUrl}`,
    ...networkUrls.map((address) => `En otro dispositivo del mismo Wi-Fi: ${address}`),
    "",
    "Si la direccion Wi-Fi cambia, vuelve a ejecutar ABRIR-GLASSKIN.cmd.",
  ].join("\r\n"));
  if (!process.argv.includes("--no-open")) openBrowser(localUrl);
}

main().catch((error) => {
  console.error(`No se pudo iniciar Glasskin: ${error.message}`);
  if (existsSync(logPath)) {
    const tail = readFileSync(logPath, "utf8").split(/\r?\n/).slice(-12).join("\n");
    if (tail.trim()) console.error(`\nÚltimos mensajes del servidor:\n${tail}`);
  }
  process.exitCode = 1;
});
