#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { execFile as execFileCallback } from 'node:child_process'
import { promisify } from 'node:util'

const execFile = promisify(execFileCallback)

const DEFAULT_URL = 'https://timdrichards.github.io/426/'
const DEFAULT_INTERVAL_MS = 5000
const DEFAULT_REMOTE = 'origin'
const DEFAULT_BRANCH = 'gh-pages'
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
}

function parseArgs(argv) {
  const options = {
    url: DEFAULT_URL,
    intervalMs: DEFAULT_INTERVAL_MS,
    remote: DEFAULT_REMOTE,
    branch: DEFAULT_BRANCH,
    once: false,
    verbose: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    if (arg === '--url') {
      options.url = argv[i + 1] ?? options.url
      i += 1
      continue
    }

    if (arg === '--interval-ms') {
      const value = Number.parseInt(argv[i + 1] ?? '', 10)
      if (Number.isFinite(value) && value > 0) {
        options.intervalMs = value
      }
      i += 1
      continue
    }

    if (arg === '--remote') {
      options.remote = argv[i + 1] ?? options.remote
      i += 1
      continue
    }

    if (arg === '--branch') {
      options.branch = argv[i + 1] ?? options.branch
      i += 1
      continue
    }

    if (arg === '--once') {
      options.once = true
    }

    if (arg === '--verbose') {
      options.verbose = true
    }
  }

  return options
}

function timestamp() {
  return new Date().toISOString()
}

function shortHash(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 12)
}

function extractAssetFingerprints(html) {
  const matches = [...html.matchAll(/(?:href|src)="([^"]+\.(?:js|css))"/g)]
    .map((match) => match[1])
    .filter((value) => !value.startsWith('https://fonts.googleapis.com'))

  return matches.slice(0, 6)
}

async function checkBranch(remote, branch) {
  try {
    const { stdout } = await execFile('git', ['ls-remote', '--heads', remote, branch])
    const trimmed = stdout.trim()

    if (!trimmed) {
      return { exists: false, sha: null }
    }

    const [sha] = trimmed.split(/\s+/)
    return { exists: true, sha }
  }
  catch (error) {
    return {
      exists: false,
      sha: null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function checkSite(url) {
  const startedAt = Date.now()

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'cache-control': 'no-cache',
        pragma: 'no-cache',
      },
    })

    const text = await response.text()
    const headers = {
      etag: response.headers.get('etag'),
      lastModified: response.headers.get('last-modified'),
      contentType: response.headers.get('content-type'),
    }

    const htmlHash = shortHash(text)
    const assetFingerprints = extractAssetFingerprints(text)

    return {
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - startedAt,
      finalUrl: response.url,
      headers,
      htmlHash,
      assetFingerprints,
    }
  }
  catch (error) {
    return {
      ok: false,
      status: null,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function colorize(color, message) {
  return `${COLORS[color]}${message}${COLORS.reset}`
}

function logLine(color, message) {
  console.log(`${colorize('gray', `[${timestamp()}]`)} ${colorize(color, message)}`)
}

function logVerbose(options, message) {
  if (options.verbose) {
    logLine('gray', message)
  }
}

function summarizeState(branchState, siteState) {
  if (branchState.error) {
    return {
      key: `branch-error:${branchState.error}`,
      color: 'red',
      message: `branch check failed: ${branchState.error}`,
    }
  }

  if (siteState.error) {
    return {
      key: `site-error:${siteState.error}`,
      color: 'red',
      message: `site request failed: ${siteState.error}`,
    }
  }

  if (!branchState.exists && !siteState.ok) {
    return {
      key: `pending:no-branch:http-${siteState.status ?? 'none'}`,
      color: 'yellow',
      message: `pending: ${branchState.exists ? 'branch exists' : 'gh-pages missing'}, site status ${siteState.status ?? 'unreachable'}`,
    }
  }

  if (!branchState.exists && siteState.ok) {
    return {
      key: `live-no-branch:${siteState.htmlHash}`,
      color: 'yellow',
      message: `site reachable, but gh-pages does not exist yet; live hash ${siteState.htmlHash}`,
    }
  }

  if (!siteState.ok) {
    return {
      key: `branch-live-not-ready:${branchState.sha}:${siteState.status ?? 'none'}`,
      color: 'blue',
      message: `gh-pages ${branchState.sha.slice(0, 10)} present, site not ready yet (${siteState.status ?? 'unreachable'})`,
    }
  }

  const assetFingerprint = siteState.assetFingerprints.join('|') || 'no-assets-detected'
  return {
    key: `deployed:${branchState.sha}:${siteState.htmlHash}:${assetFingerprint}`,
    color: 'green',
    message: `deployed: gh-pages ${branchState.sha.slice(0, 10)}, live hash ${siteState.htmlHash}`,
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  logVerbose(
    options,
    `watching url=${options.url} remote=${options.remote} branch=${options.branch} interval=${options.intervalMs}ms`,
  )

  let previousStateKey = null
  let running = false

  async function tick() {
    if (running) {
      logVerbose(options, 'skipping check because the previous cycle is still running')
      return
    }

    running = true
    logVerbose(options, 'checking site and gh-pages status')

    try {
      const [branchState, siteState] = await Promise.all([
        checkBranch(options.remote, options.branch),
        checkSite(options.url),
      ])

      const summary = summarizeState(branchState, siteState)
      if (summary.key !== previousStateKey) {
        logLine(summary.color, summary.message)
      }

      previousStateKey = summary.key
    }
    finally {
      running = false
    }
  }

  await tick()

  if (options.once) {
    return
  }

  const timer = setInterval(() => {
    void tick()
  }, options.intervalMs)

  const stop = (signal) => {
    clearInterval(timer)
    logVerbose(options, `stopping watcher on ${signal}`)
    process.exit(0)
  }

  process.on('SIGINT', () => stop('SIGINT'))
  process.on('SIGTERM', () => stop('SIGTERM'))
}

await main()
