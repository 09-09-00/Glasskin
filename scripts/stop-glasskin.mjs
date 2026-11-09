import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const statePath = path.join(root, ".glasskin-server.json");
const startupShortcut = path.join(
  process.env.APPDATA ?? "",
  "Microsoft",
  "Windows",
  "Start Menu",
  "Programs",
  "Startup",
  "Glasskin Local Server.lnk",
);

if (startupShortcut && existsSync(startupShortcut)) rmSync(startupShortcut, { force: true });

if (!existsSync(statePath)) {
  console.log("Servidor Glasskin detenido.");
  process.exit(0);
}

const { pid, supervisorPid } = JSON.parse(readFileSync(statePath, "utf8"));
const targetPid = Number(supervisorPid || pid);
if (Number.isInteger(targetPid) && targetPid > 0) {
  spawnSync("taskkill.exe", ["/PID", String(targetPid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
}
rmSync(statePath, { force: true });
console.log("Servidor Glasskin detenido.");
