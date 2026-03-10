# 426 Repository

This repository contains course source materials plus the Docusaurus site used to publish them to GitHub Pages.

## Repo layout

- `course/`: source-of-truth authored course material
  - `course/lectures/`: lecture units with slides, code, and lecture assets
  - `course/assignments/`: homework, in-class activities, exercises, and project material
  - `course/readings/`: reading chapters and reading assets
  - `course/weeks/`: week overview and schedule-linked pages
  - `course/shared/`: reusable templates and shared assets
- `website/`: Docusaurus publish target
- `syllabus/`: syllabus and schedule artifacts
- `archive/`: older or legacy course material
- `.github/workflows/`: automation, including GitHub Pages deployment

## Build flow

The website is now a generated destination rather than the main authoring home.

Before each site build, content is synced from `course/` into `website/docs/`.

`cd website && npm run sync:content` performs the current sync pass:

- sync lecture directories from `course/lectures/`
- sync readings from `course/readings/`
- sync homework docs from `course/assignments/homework/`
- sync in-class activities from `course/assignments/ica/` into lecture doc locations

## Run the site locally

```bash
npm run website:dev
```

Docusaurus will print a local URL (typically `http://localhost:3000/426/` for this repo setup).

## Build the site locally

```bash
npm run website:build
```

## Deployment

This repo deploys the Docusaurus site to GitHub Pages via GitHub Actions.

- Workflow file: `.github/workflows/deploy-docusaurus.yml`
- Production URL: <https://timdrichards.github.io/426/>

Pushes to `main` trigger a deploy.
