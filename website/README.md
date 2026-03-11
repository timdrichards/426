# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Installation

```bash
npm install
```

## Local Development

```bash
npm start
```

This command performs an initial sync from `../course/` into `docs/`, keeps watching the source folders for changes, and starts the local development server.

When you edit supported source content under `../course/`, the sync script copies updates into `docs/` and Docusaurus can hot-reload the changed pages in the browser.

## Build

```bash
npm run build
```

This command syncs course content, then generates static content into the `build` directory.

## Content preparation

Generated website docs come from source folders under `../course/`:

- lecture material: `../course/lectures/`
- homework docs: `../course/assignments/homework/`
- in-class activities: `../course/assignments/ica/`
- readings: `../course/readings/`

Key commands:

- Run content sync: `npm run sync:content`
- Prepare content before local dev/build: `npm run prepare:content`

## Deployment

```bash
npm run deploy
```

`deploy` also runs the content sync step before publishing.
