# Assignment Authoring Notes (Not Published)

This file is for instructor/maintainer notes and is not part of the Docusaurus site rendering.

## Assignment Source Of Truth

Assignments are authored directly under `website/`.

General layout:

```text
website/
  assignments/
    exercises/
    homework/
    project/
    in-class-activities/
  code/
  slides/
  docs/
    assignments/
  static/
    code/
```

Website-first local preview:

```bash
npm run website:dev
```

Website-first build:

```bash
npm run website:build
```

Supported assignment types:

- `exercises`
- `homework`
- `project`
- `in-class-activities`

## Legacy Sync Workflow (Optional)

Old top-level sync/copy behavior still exists for migration purposes:

```bash
npm run publish:legacy-sync
```

## Add a New Homework Page

1. Create a new file in `website/docs/homework/` (example: `homework-02.md`).
2. Add frontmatter with at least:

```md
---
id: homework-02
title: "Homework 2: Title Here"
sidebar_position: 2
slug: /assignments/homework-02
releaseDate: "2026-03-06"
dueDate: "2026-03-13"
---
```

3. Add the assignment content below the frontmatter.

## Make It Appear on the Homepage

Add an import in `website/src/data/assignments.js` and include it in `rawAssignments`.

Example:

```js
import {frontMatter as homework02} from '@site/docs/homework/homework-02.md';

const rawAssignments = [homework01, homework02];
```

## Publish

1. Commit your changes
2. Push to `main`
3. GitHub Actions deploys the site to GitHub Pages
