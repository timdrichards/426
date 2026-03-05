#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const docsRoot = path.join(repoRoot, 'website', 'docs')
const assignmentsDocPath = path.join(docsRoot, 'assignments.md')
const weightsPath = path.join(docsRoot, 'config', 'weights.json')
const categoriesPath = path.join(docsRoot, 'config', 'categories.config.json')

const markerStart = '<!-- GENERATED:ASSIGNMENTS_OVERVIEW:START -->'
const markerEnd = '<!-- GENERATED:ASSIGNMENTS_OVERVIEW:END -->'

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function walkMarkdownFiles(rootDir, ignoreDirNames = new Set()) {
  if (!fs.existsSync(rootDir)) return []

  const results = []
  const entries = fs.readdirSync(rootDir, {withFileTypes: true})
  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name)
    if (entry.isDirectory()) {
      if (ignoreDirNames.has(entry.name)) continue
      results.push(...walkMarkdownFiles(fullPath, ignoreDirNames))
      continue
    }
    if (entry.isFile() && /\.(md|mdx)$/.test(entry.name)) {
      results.push(fullPath)
    }
  }
  return results
}

function parseFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  if (!content.startsWith('---\n')) return {}

  const endMarker = '\n---\n'
  const endIndex = content.indexOf(endMarker, 4)
  if (endIndex === -1) return {}

  const frontmatterBlock = content.slice(4, endIndex)
  const frontmatter = {}
  for (const line of frontmatterBlock.split('\n')) {
    const match = line.match(/^([A-Za-z0-9_]+):\s*(.+)\s*$/)
    if (!match) continue

    const key = match[1]
    let value = match[2]
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1)
    } else if (value === 'true' || value === 'false') {
      value = value === 'true'
    } else if (/^-?\d+$/.test(value)) {
      value = Number(value)
    }
    frontmatter[key] = value
  }
  return frontmatter
}

function parseDate(dateString) {
  if (typeof dateString !== 'string' || !dateString.trim()) return null
  const parsed = new Date(`${dateString}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDate(dateString) {
  const date = parseDate(dateString)
  if (!date) return 'TBD'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function daysUntil(dateString) {
  const due = parseDate(dateString)
  if (!due) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function pluralizeDays(count) {
  return `${count} day${count === 1 ? '' : 's'}`
}

function dueStatus(item) {
  const dueOffset = daysUntil(item.dueDate)
  if (dueOffset === null) return 'No due date'
  if (dueOffset > 0) return `${pluralizeDays(dueOffset)} left`
  if (dueOffset === 0) return 'Due today'

  const lateDays = Math.abs(dueOffset)
  const lateDaysAllowed = Number.isFinite(item.lateDaysAllowed) ? item.lateDaysAllowed : 0
  const closeDate = parseDate(item.closeDate)

  if (closeDate) {
    const closeOffset = daysUntil(item.closeDate)
    if (closeOffset !== null && closeOffset >= 0) {
      return `${pluralizeDays(lateDays)} late (late accepted until ${formatDate(item.closeDate)})`
    }
    return `Closed - late window ended (${pluralizeDays(lateDays)} past due)`
  }

  if (lateDaysAllowed <= 0) {
    return `Closed - no late submissions (${pluralizeDays(lateDays)} past due)`
  }

  if (lateDays <= lateDaysAllowed) {
    return `${pluralizeDays(lateDays)} late (${lateDays}/${lateDaysAllowed} late days used)`
  }

  return `Closed - late window exceeded (${pluralizeDays(lateDays)} past due)`
}

function titleCaseFromSlug(slug) {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function categoryLabel(slug, categoryConfig) {
  if (categoryConfig && typeof categoryConfig.kind === 'string' && categoryConfig.kind.trim()) {
    const kind = categoryConfig.kind.trim()
    if (kind.toLowerCase().startsWith('in-class')) return 'In-Class Activities'
    if (kind.toLowerCase() === 'exercise') return 'Exercises'
    return kind
  }
  if (slug === 'in-class-activities') return 'In-Class Activities'
  return titleCaseFromSlug(slug)
}

function categoryDetails(slug, config) {
  const defaults = config.defaults || {}
  const category = (config.categories && config.categories[slug]) || {}
  return {
    blurb: category.blurb || defaults.blurb || 'Course work grouped by assignment type.',
    releasePolicy:
      category.releasePolicy || defaults.releasePolicy || 'Release timing is listed in the assignment prompt.',
    submissionPolicy:
      category.submissionPolicy ||
      defaults.submissionPolicy ||
      'Submission instructions are listed in the assignment prompt.',
  }
}

function findAssignments() {
  const lectureRoot = path.join(docsRoot, 'lectures')
  const homeworkRoot = path.join(docsRoot, 'homework')
  const projectRoot = path.join(docsRoot, 'project')
  const ignoreDirs = new Set(['code', 'slides', 'img', 'images', 'excalidraw', 'public', 'node_modules', 'dist'])

  const candidateFiles = [
    ...walkMarkdownFiles(lectureRoot, ignoreDirs),
    ...walkMarkdownFiles(homeworkRoot, ignoreDirs),
    ...walkMarkdownFiles(projectRoot, ignoreDirs),
  ]

  return candidateFiles
    .map((filePath) => {
      const fm = parseFrontmatter(filePath)
      if (fm.isAssignment !== true) return null
      if (typeof fm.assignmentType !== 'string' || !fm.assignmentType.trim()) return null
      if (typeof fm.slug !== 'string' || !fm.slug.trim()) return null

      const link = fm.slug.startsWith('/') ? `/docs${fm.slug}` : `/docs/${fm.slug}`
      return {
        id: fm.id || path.basename(filePath, path.extname(filePath)),
        title: fm.title || path.basename(filePath, path.extname(filePath)),
        assignmentType: fm.assignmentType.trim(),
        dueDate: fm.dueDate,
        lateDaysAllowed: Number.isFinite(fm.lateDaysAllowed) ? fm.lateDaysAllowed : 0,
        closeDate: fm.closeDate,
        link,
      }
    })
    .filter(Boolean)
}

function buildGeneratedSection(weights, config) {
  return [
    'Live assignment timers update every second in your browser.',
    'Category weights are shown beside each category heading below.',
  ].join('\n')
}

function updateAssignmentsDoc() {
  const weights = readJson(weightsPath)
  const config = readJson(categoriesPath)
  const content = fs.readFileSync(assignmentsDocPath, 'utf8')

  if (!content.includes(markerStart) || !content.includes(markerEnd)) {
    throw new Error(
      `Missing markers in ${assignmentsDocPath}. Expected ${markerStart} and ${markerEnd}.`
    )
  }

  const generated = buildGeneratedSection(weights, config)
  const replacement = `${markerStart}\n${generated}\n${markerEnd}`
  const updated = content.replace(new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}`), replacement)

  fs.writeFileSync(assignmentsDocPath, updated, 'utf8')
  console.log(`Updated ${path.relative(repoRoot, assignmentsDocPath)}`)
}

updateAssignmentsDoc()
