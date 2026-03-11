#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import process from 'process';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const assignmentsRoot = path.join(repoRoot, 'course', 'assignments');
const defaultMapPath = path.join(repoRoot, '.canvas-assignment-map.json');

function usage() {
  console.log(`Publish Canvas assignments that link back to GitHub Pages.

Required environment variables:
  CANVAS_BASE_URL         Example: https://canvas.instructure.com
  CANVAS_COURSE_ID        Canvas course id
  CANVAS_TOKEN            Canvas access token
  GITHUB_PAGES_BASE_URL   Example: https://richardst.github.io/426

Optional environment variables:
  CANVAS_ASSIGNMENT_MAP   Path to JSON file that stores local->Canvas assignment ids
  CANVAS_PUBLISH_DEFAULT  true/false fallback publish flag when front matter omits it

Optional front matter fields:
  canvasSync: true|false          Include or skip an assignment
  canvasAssignmentId: 12345       Explicit Canvas assignment id override
  canvasPublished: true|false     Publish state for the assignment
  canvasLinkText: "assignment instructions"
  dueDateTime: "2026-03-24T23:59:00"

Usage:
  node scripts/publish-canvas-assignments.mjs [--dry-run]
`);
}

function parseArgs(argv) {
  const options = {dryRun: false};
  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '-h' || arg === '--help') {
      usage();
      process.exit(0);
    }
    throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

function walkMarkdownFiles(rootDir, ignoreDirNames = new Set()) {
  if (!fs.existsSync(rootDir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(rootDir, {withFileTypes: true})) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (ignoreDirNames.has(entry.name)) continue;
      results.push(...walkMarkdownFiles(fullPath, ignoreDirNames));
      continue;
    }
    if (entry.isFile() && /\.(md|mdx)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function parseFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.startsWith('---\n')) return {};

  const endMarker = '\n---\n';
  const endIndex = content.indexOf(endMarker, 4);
  if (endIndex === -1) return {};

  const frontmatterBlock = content.slice(4, endIndex);
  const frontmatter = {};
  for (const line of frontmatterBlock.split('\n')) {
    const match = line.match(/^([A-Za-z0-9_]+):\s*(.+)\s*$/);
    if (!match) continue;

    const key = match[1];
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else if (value === 'true' || value === 'false') {
      value = value === 'true';
    } else if (/^-?\d+$/.test(value)) {
      value = Number(value);
    }
    frontmatter[key] = value;
  }
  return frontmatter;
}

function loadMap(mapPath) {
  if (!fs.existsSync(mapPath)) return {};
  return JSON.parse(fs.readFileSync(mapPath, 'utf8'));
}

function saveMap(mapPath, map) {
  fs.writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`, 'utf8');
}

function joinUrl(baseUrl, relativePath) {
  return `${baseUrl.replace(/\/+$/, '')}/${relativePath.replace(/^\/+/, '')}`;
}

function toCanvasDueAt(frontMatter) {
  const dateTime = frontMatter.dueDateTime;
  if (typeof dateTime === 'string' && dateTime.trim()) {
    const normalized = dateTime.trim();
    if (/[zZ]|[+-]\d{2}:\d{2}$/.test(normalized)) return normalized;
    return `${normalized}Z`;
  }

  const date = frontMatter.dueDate;
  if (typeof date === 'string' && date.trim()) {
    return `${date.trim()}T23:59:00Z`;
  }

  return null;
}

function toCanvasPublished(frontMatter) {
  if (typeof frontMatter.canvasPublished === 'boolean') return frontMatter.canvasPublished;
  const fallback = process.env.CANVAS_PUBLISH_DEFAULT;
  return fallback === 'true';
}

function buildAssignmentDescription(assignmentUrl, linkText) {
  const safeUrl = assignmentUrl.replace(/"/g, '&quot;');
  const safeText = linkText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<p>Please read the <a href="${safeUrl}">${safeText}</a>.</p>`;
}

function discoverAssignments() {
  const ignoreDirs = new Set(['code', 'img', 'images', 'slides', 'node_modules', 'dist']);
  return walkMarkdownFiles(assignmentsRoot, ignoreDirs)
    .map((filePath) => {
      const frontMatter = parseFrontmatter(filePath);
      if (frontMatter.isAssignment !== true) return null;
      if (frontMatter.canvasSync === false) return null;
      if (typeof frontMatter.title !== 'string' || !frontMatter.title.trim()) return null;
      if (typeof frontMatter.slug !== 'string' || !frontMatter.slug.trim()) return null;

      const key = frontMatter.id || path.relative(repoRoot, filePath);
      return {
        key,
        filePath,
        title: frontMatter.title.trim(),
        slug: frontMatter.slug.trim(),
        dueAt: toCanvasDueAt(frontMatter),
        published: toCanvasPublished(frontMatter),
        explicitCanvasId:
          Number.isFinite(frontMatter.canvasAssignmentId) ? frontMatter.canvasAssignmentId : null,
        linkText:
          typeof frontMatter.canvasLinkText === 'string' && frontMatter.canvasLinkText.trim()
            ? frontMatter.canvasLinkText.trim()
            : 'assignment instructions',
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.filePath.localeCompare(b.filePath));
}

async function canvasRequest(method, pathname, body) {
  const baseUrl = process.env.CANVAS_BASE_URL;
  const token = process.env.CANVAS_TOKEN;
  const url = joinUrl(baseUrl, pathname);
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${method} ${url} failed: ${response.status} ${response.statusText}\n${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function createAssignment(courseId, payload) {
  return canvasRequest('POST', `/api/v1/courses/${courseId}/assignments`, {assignment: payload});
}

async function updateAssignment(courseId, assignmentId, payload) {
  return canvasRequest('PUT', `/api/v1/courses/${courseId}/assignments/${assignmentId}`, {
    assignment: payload,
  });
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const courseId = requiredEnv('CANVAS_COURSE_ID');
  const githubPagesBaseUrl = requiredEnv('GITHUB_PAGES_BASE_URL');
  requiredEnv('CANVAS_BASE_URL');
  requiredEnv('CANVAS_TOKEN');

  const mapPath = process.env.CANVAS_ASSIGNMENT_MAP
    ? path.resolve(process.env.CANVAS_ASSIGNMENT_MAP)
    : defaultMapPath;
  const assignmentMap = loadMap(mapPath);
  const assignments = discoverAssignments();

  if (assignments.length === 0) {
    console.log('No Canvas-synced assignments found.');
    return;
  }

  for (const assignment of assignments) {
    const assignmentUrl = joinUrl(githubPagesBaseUrl, `docs${assignment.slug}`);
    const payload = {
      name: assignment.title,
      description: buildAssignmentDescription(assignmentUrl, assignment.linkText),
      published: assignment.published,
      due_at: assignment.dueAt,
      submission_types: ['none'],
    };

    const knownId = assignment.explicitCanvasId ?? assignmentMap[assignment.key]?.canvasAssignmentId;

    if (options.dryRun) {
      console.log(
        `${knownId ? 'UPDATE' : 'CREATE'} ${assignment.title} -> ${assignmentUrl}${knownId ? ` (Canvas ${knownId})` : ''}`
      );
      continue;
    }

    const result = knownId
      ? await updateAssignment(courseId, knownId, payload)
      : await createAssignment(courseId, payload);

    assignmentMap[assignment.key] = {
      canvasAssignmentId: result.id,
      title: assignment.title,
      slug: assignment.slug,
      filePath: path.relative(repoRoot, assignment.filePath),
      url: assignmentUrl,
      updatedAt: new Date().toISOString(),
    };

    console.log(`${knownId ? 'Updated' : 'Created'} Canvas assignment ${result.id}: ${assignment.title}`);
  }

  if (!options.dryRun) {
    saveMap(mapPath, assignmentMap);
    console.log(`Saved assignment map to ${path.relative(repoRoot, mapPath)}`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
