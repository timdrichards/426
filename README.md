# 426 Repository

This repository contains course materials and a Docusaurus site used to publish course documentation to GitHub Pages.

## Repo layout

- `lectures/`: lecture content, demos, and related assets
- `website/`: Docusaurus site (docs, theme, config)
- `.github/workflows/`: automation, including GitHub Pages deployment

## Run the site locally

```bash
cd website
npm install
npm start
```

Docusaurus will print a local URL (typically `http://localhost:3000/426/` for this repo setup).

## Build the site locally

```bash
cd website
npm run build
```

## Deployment

This repo deploys the Docusaurus site to GitHub Pages via GitHub Actions.

- Workflow file: `.github/workflows/deploy-docusaurus.yml`
- Production URL: <https://timdrichards.github.io/426/>

Pushes to `main` trigger a deploy.
