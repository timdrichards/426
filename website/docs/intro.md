---
sidebar_position: 1
slug: /intro
---

# Welcome to the 426 Course Hub

This site is the documentation layer for the `426` repository. It is designed to host course-facing material such as:

- lecture references and supporting notes
- assignment instructions and project guidance
- setup walkthroughs for tools used in class
- links into code/demo material stored elsewhere in the repo

## Repository layout (current baseline)

- `lectures/`: lecture content, demos, and related course assets
- `website/`: the Docusaurus site (docs, theme, homepage, build config)
- `.github/workflows/`: GitHub Actions workflows, including Pages deployment

## Editing workflow

Run the docs site locally from the `website/` directory:

```bash
cd website
npm install
npm start
```

Open [http://localhost:3000/426/](http://localhost:3000/426/) (or the local URL Docusaurus prints). Changes in `website/docs` and `website/src` reload automatically.

## Publishing

This repository is configured to deploy the Docusaurus build to GitHub Pages using GitHub Actions when changes are pushed to `main`.

- Production URL: [https://timdrichards.github.io/426/](https://timdrichards.github.io/426/)
- Workflow: `Deploy Docusaurus to GitHub Pages`

## Next recommended content

Replace this baseline with your course-specific content:

1. Syllabus / policies
2. Lecture schedule and links
3. Assignment and project pages
4. Setup guides for tooling used in class
