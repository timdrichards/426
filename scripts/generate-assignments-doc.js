#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const docsRoot = path.join(repoRoot, 'website', 'docs')
const assignmentsDocPath = path.join(docsRoot, 'assignments.md')
const weightsPath = path.join(docsRoot, 'assignments', 'weights.json')
const categoriesPath = path.join(docsRoot, 'assignments', 'categories.config.json')

const markerStart = '<!-- GENERATED:ASSIGNMENTS_OVERVIEW:START -->'
const markerEnd = '<!-- GENERATED:ASSIGNMENTS_OVERVIEW:END -->'

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
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

function buildGeneratedSection(weights, config) {
  const categories = Object.keys(weights)

  const weightsLines = categories.map((slug) => {
    const label = categoryLabel(slug, config.categories && config.categories[slug])
    return `- ${label}: ${weights[slug]}`
  })

  const policyLines = categories.flatMap((slug) => {
    const label = categoryLabel(slug, config.categories && config.categories[slug])
    const details = categoryDetails(slug, config)
    return [
      `### ${label}`,
      '',
      `- Description: ${details.blurb}`,
      `- Release: ${details.releasePolicy}`,
      `- Submission: ${details.submissionPolicy}`,
      '',
    ]
  })

  return [
    '## Categories and Weights',
    '',
    ...weightsLines,
    '',
    '## Release and Submission',
    '',
    ...policyLines,
    'See the homepage for a category-by-category view with current due dates.',
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
