# Assignment Authoring Notes (Not Published)

This file is for instructor/maintainer notes and is not part of the Docusaurus site rendering.

## Assignment Source Of Truth

Assignments are authored from the top-level `assignments/` directory and synced into `website/` outputs.

General layout:

```text
assignments/
  exercises/
    .gitkeep
    exercise-6.8/
      exercise-6.8.md
      exercise-6.8/
        # exercise code
  homework/
    .gitkeep
    homework-01/
      homework-01.md
      # optional homework-01/ code folder
  project/
    .gitkeep
    project-01/
      project-01.md
      # optional project-01/ code folder
  in-class-activities/
    .gitkeep
    activity-01/
      activity-01.md
      # optional activity-01/ code folder
```

Sync command:

```bash
npm run sync:assignments
```

Include drafts (preview only):

```bash
npm run sync:assignments:drafts
```

The sync script will:

1. Copy markdown into `website/docs/assignments/<type>/`.
2. Zip code into `website/static/code/<assignment-name>.zip` when a matching code folder exists.
3. Publish no zip when code folder is absent.
4. Remove stale published markdown/zip files when source assignments are removed or moved to draft.

Supported assignment types:

- `exercises`
- `homework`
- `project`
- `in-class-activities`

## Drafts

Draft assignments are excluded from default sync.

Two supported draft styles:

1. Prefix the assignment folder with `_` (example: `_exercise-6.9`).
2. Add `draft: true` in markdown frontmatter.

Default sync skips drafts:

```bash
npm run sync:assignments
```

Preview sync includes drafts:

```bash
npm run sync:assignments:drafts
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
