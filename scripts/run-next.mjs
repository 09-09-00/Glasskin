import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const nodePath = path.join(root, "node_modules");
const args = process.argv.slice(2);

const result = spawnSync(process.execPath, [nextBin, ...args], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_PATH: process.env.NODE_PATH ? `${nodePath}${path.delimiter}${process.env.NODE_PATH}` : nodePath,
  },
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
