#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const WEBSITE_ROOT = process.cwd();
const REPO_ROOT = path.resolve(WEBSITE_ROOT, "..");

const SOURCE_ROOTS = {
  lectures: path.join(REPO_ROOT, "course", "lectures"),
  homework: path.join(REPO_ROOT, "course", "assignments", "homework"),
  ica: path.join(REPO_ROOT, "course", "assignments", "ica"),
  readings: path.join(REPO_ROOT, "course", "readings"),
};

const TARGET_ROOTS = {
  lectures: path.join(WEBSITE_ROOT, "docs", "lectures"),
  homework: path.join(WEBSITE_ROOT, "docs", "homework"),
  readings: path.join(WEBSITE_ROOT, "docs", "readings"),
};

async function ensureDir(target) {
  await fs.mkdir(target, { recursive: true });
}

async function resetDir(target) {
  await fs.rm(target, { recursive: true, force: true });
  await ensureDir(target);
}

async function copyFile(source, target) {
  await ensureDir(path.dirname(target));
  await fs.copyFile(source, target);
}

async function copyDirContents(source, target) {
  await ensureDir(target);
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      await copyDirContents(sourcePath, targetPath);
      continue;
    }

    if (entry.isFile()) {
      await copyFile(sourcePath, targetPath);
    }
  }
}

async function syncLectures() {
  await resetDir(TARGET_ROOTS.lectures);
  const entries = await fs.readdir(SOURCE_ROOTS.lectures, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    await copyDirContents(
      path.join(SOURCE_ROOTS.lectures, entry.name),
      path.join(TARGET_ROOTS.lectures, entry.name),
    );
  }
}

async function syncReadings() {
  await resetDir(TARGET_ROOTS.readings);
  await copyDirContents(SOURCE_ROOTS.readings, TARGET_ROOTS.readings);
}

async function syncHomework() {
  await resetDir(TARGET_ROOTS.homework);
  const entries = await fs.readdir(SOURCE_ROOTS.homework, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const sourceDir = path.join(SOURCE_ROOTS.homework, entry.name);
    const targetDir = path.join(TARGET_ROOTS.homework, entry.name);
    await ensureDir(targetDir);

    const childEntries = await fs.readdir(sourceDir, { withFileTypes: true });
    for (const child of childEntries) {
      if (child.name === "authoring") continue;

      const childSource = path.join(sourceDir, child.name);
      const childTarget = path.join(targetDir, child.name);

      if (child.isDirectory()) {
        await copyDirContents(childSource, childTarget);
      } else if (child.isFile()) {
        await copyFile(childSource, childTarget);
      }
    }
  }
}

async function syncIca() {
  const entries = await fs.readdir(SOURCE_ROOTS.ica, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const lectureId = entry.name;
    const sourceDir = path.join(SOURCE_ROOTS.ica, lectureId);
    const lectureTarget = path.join(TARGET_ROOTS.lectures, lectureId);

    const promptName = `ica-${lectureId}.md`;
    const promptSource = path.join(sourceDir, promptName);
    const promptTarget = path.join(lectureTarget, promptName);

    try {
      await fs.access(promptSource);
      await copyFile(promptSource, promptTarget);
    } catch {}

    const targetDirName = lectureId === "09" ? "ica" : `ica-${lectureId}`;
    const targetDir = path.join(lectureTarget, targetDirName);
    await resetDir(targetDir);

    const childEntries = await fs.readdir(sourceDir, { withFileTypes: true });
    for (const child of childEntries) {
      if (child.name === promptName) continue;

      const childSource = path.join(sourceDir, child.name);
      const childTarget = path.join(targetDir, child.name);

      if (child.isDirectory()) {
        await copyDirContents(childSource, childTarget);
      } else if (child.isFile()) {
        await copyFile(childSource, childTarget);
      }
    }
  }
}

await syncLectures();
await syncReadings();
await syncHomework();
await syncIca();

console.log("[sync-course-content] synced lectures, readings, homework, and ICAs into website/docs");
