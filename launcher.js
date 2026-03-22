import { spawn } from "node:child_process";
import path from "node:path";

const cwd = process.cwd();
const childProcesses = new Map();
let shuttingDown = false;

function startProcess(name, scriptPath) {
  const child = spawn(process.execPath, [path.resolve(cwd, scriptPath)], {
    cwd,
    env: process.env,
    stdio: "inherit"
  });

  childProcesses.set(name, child);

  child.on("exit", (code, signal) => {
    const normalizedCode = typeof code === "number" ? code : 0;
    childProcesses.delete(name);

    if (shuttingDown) {
      if (childProcesses.size === 0) {
        process.exit(normalizedCode);
      }
      return;
    }

    console.error(name + " process exited", { code: normalizedCode, signal });
    shutdown(normalizedCode === 0 ? 1 : normalizedCode);
  });

  return child;
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of childProcesses.values()) {
    child.kill("SIGTERM");
  }

  setTimeout(() => {
    for (const child of childProcesses.values()) {
      child.kill("SIGKILL");
    }
    process.exit(exitCode);
  }, 5000).unref();
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

startProcess("api", "index.js");
startProcess("workers", "works/index.js");
