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

This command syncs course content from `../course/` into `docs/`, then starts a local development server.

## Build

```bash
npm run build
```

This command syncs course content, then generates static content into the `build` directory.

## Content preparation

Generated website docs come from source folders under `../course/`:

- lecture material: `../course/lectures/`
- homework docs: `../course/assignments/homework/`
- readings: `../course/readings/`

Key commands:

- Run content sync: `npm run sync:content`
- Prepare content before local dev/build: `npm run prepare:content`

## Deployment

```bash
npm run deploy
```

`deploy` also runs the content sync step before publishing.
