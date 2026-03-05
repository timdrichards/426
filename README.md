# 426 Repository

This repository contains course materials and a Docusaurus site used to publish course documentation to GitHub Pages.

## Repo layout

- `website/`: source of truth for published docs and assets (edit here first)
- `lectures/`: legacy/archival lecture content
- `.github/workflows/`: automation, including GitHub Pages deployment

## Run the site locally

```bash
npm run website:dev
```

Docusaurus will print a local URL (typically `http://localhost:3000/426/` for this repo setup).

## Build the site locally

```bash
npm run website:build
```

## Publish Workflow

Default publish is website-first and does not copy/sync from lecture content folders under `website/docs/lectures/*`:

```bash
npm run publish:website
```

If you explicitly want the old sync/copy behavior:

```bash
npm run publish:legacy-sync
```

## Deployment

This repo deploys the Docusaurus site to GitHub Pages via GitHub Actions.

- Workflow file: `.github/workflows/deploy-docusaurus.yml`
- Production URL: <https://timdrichards.github.io/426/>

Pushes to `main` trigger a deploy.
