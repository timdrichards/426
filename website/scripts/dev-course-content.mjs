#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEBSITE_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(WEBSITE_ROOT, "..");

const WATCH_ROOTS = [
  path.join(REPO_ROOT, "course", "lectures"),
  path.join(REPO_ROOT, "course", "assignments", "homework"),
  path.join(REPO_ROOT, "course", "assignments", "ica"),
  path.join(REPO_ROOT, "course", "readings"),
];

let isSyncRunning = false;
let pendingSync = false;
let debounceTimer = null;
let shuttingDown = false;

function log(message) {
  console.log(`[dev-course-content] ${message}`);
}

function runSync(reason) {
  if (shuttingDown) return;

  if (isSyncRunning) {
    pendingSync = true;
    return;
  }

  isSyncRunning = true;
  log(`syncing content (${reason})`);

  const child = spawn(process.execPath, ["scripts/sync-course-content.mjs"], {
    cwd: WEBSITE_ROOT,
    stdio: "inherit",
  });

  child.on("exit", (code, signal) => {
    isSyncRunning = false;

    if (signal) {
      log(`sync exited from signal ${signal}`);
    } else if (code !== 0) {
      log(`sync failed with exit code ${code}`);
    }

    if (pendingSync && !shuttingDown) {
      pendingSync = false;
      scheduleSync("queued change");
    }
  });
}

function scheduleSync(reason) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    runSync(reason);
  }, 150);
}

function watchRoot(root) {
  try {
    const watcher = fs.watch(root, { recursive: true }, (eventType, filename) => {
      const changedPath = filename ? path.join(root, filename.toString()) : root;
      log(`${eventType} ${path.relative(REPO_ROOT, changedPath)}`);
      scheduleSync("source change");
    });

    watcher.on("error", (error) => {
      log(`watch error for ${root}: ${error.message}`);
    });

    return watcher;
  } catch (error) {
    log(`failed to watch ${root}: ${error.message}`);
    return null;
  }
}

const watchers = WATCH_ROOTS.map(watchRoot).filter(Boolean);

if (watchers.length === 0) {
  log("no watch roots available");
  process.exit(1);
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  for (const watcher of watchers) {
    watcher.close();
  }

  log(`stopping (${signal})`);
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

runSync("startup");
log("watching course content for changes");

const docusaurusArgs = process.argv.slice(2);
const docusaurus = spawn("npm", ["run", "docusaurus", "--", "start", ...docusaurusArgs], {
  cwd: WEBSITE_ROOT,
  env: { ...process.env, WATCHPACK_POLLING: "true" },
  stdio: "inherit",
  shell: process.platform === "win32",
});

docusaurus.on("exit", (code, signal) => {
  shutdown(signal ?? `exit:${code ?? 0}`);
});
