---
sidebar_position: 3
---

# Site Workflow

This repo uses a subfolder Docusaurus setup:

- Docusaurus app: `website/`
- Deploy target: GitHub Pages
- Deploy mechanism: GitHub Actions

## Local development

```bash
cd website
npm install
npm start
```

## Production build check

Before pushing layout/content changes, you can verify the site builds:

```bash
cd website
npm run build
```

## Deployment behavior

The workflow in `.github/workflows/deploy-docusaurus.yml` runs on pushes to `main` (and `master`) and deploys `website/build` to GitHub Pages.

## Common customizations

- Edit `website/docusaurus.config.js` for title, navbar, footer, and repo metadata.
- Edit `website/src/pages/index.js` and `website/src/pages/index.module.css` for homepage layout/design.
- Edit `website/src/css/custom.css` for global theme colors and typography.
- Add docs under `website/docs/`.
