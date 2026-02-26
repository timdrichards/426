// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const repository = process.env.GITHUB_REPOSITORY ?? '';
const [repoOwnerFromEnv, repoNameFromEnv] = repository.split('/');
const organizationName = repoOwnerFromEnv || 'YOUR_GITHUB_USERNAME';
const projectName = repoNameFromEnv || '426';
const githubPagesUrl = `https://${organizationName}.github.io`;
const baseUrl = process.env.DOCUSAURUS_BASE_URL ?? `/${projectName}/`;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: '426 Course Hub',
  tagline: 'Lecture notes, demos, and reference material',
  favicon: 'img/favicon.svg',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: githubPagesUrl,
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl,

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName, // Usually your GitHub org/user name.
  projectName, // Usually your repo name.

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/social-card.svg',
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: '426',
        hideOnScroll: true,
        logo: {
          alt: '426 Course Hub Logo',
          src: 'img/logo-mark.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Docs',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Course Site',
            items: [
              {
                label: 'Start Here',
                to: '/docs/intro',
              },
              {
                label: 'Course Structure',
                to: '/docs/course-structure',
              },
            ],
          },
          {
            title: 'Workflow',
            items: [
              {
                label: 'Site Workflow',
                to: '/docs/site-workflow',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Tim Richards. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
