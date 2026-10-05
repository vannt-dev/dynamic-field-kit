import { defineConfig } from 'vitepress';

const REPO = 'https://github.com/vannt-dev/dynamic-field-kit';
const DEMOS = 'https://vannt-dev.github.io/dynamic-field-kit/';

export default defineConfig({
  // Set by the Pages workflow to '/dynamic-field-kit/handbook/'. Defaults to
  // '/' so `vitepress dev` and a plain build are unaffected.
  base: process.env.PAGES_BASE_PATH || '/',
  lang: 'en',
  title: 'Dynamic Field Kit',
  description:
    'Handbook for dynamic-field-kit: schema-driven forms for React, Vue and Angular.',
  cleanUrls: true,
  lastUpdated: false,
  // The pages are generated from READMEs that also link to local dev servers.
  ignoreDeadLinks: [/^https?:\/\/localhost/],

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started', activeMatch: '/guide/' },
      {
        text: 'Frameworks',
        items: [
          { text: 'React', link: '/frameworks/react' },
          { text: 'Vue 3', link: '/frameworks/vue' },
          { text: 'Angular', link: '/frameworks/angular' },
        ],
      },
      { text: 'Live demos', link: DEMOS },
    ],

    sidebar: [
      {
        text: 'Start here',
        items: [
          { text: 'Getting started', link: '/guide/getting-started' },
          { text: 'Describing fields', link: '/guide/fields' },
        ],
      },
      {
        text: 'Building forms',
        items: [
          { text: 'Computed fields', link: '/guide/computed-fields' },
          { text: 'Validation and conditions', link: '/guide/validation' },
          { text: 'Repeatable groups', link: '/guide/groups' },
          { text: 'Multi-step wizard', link: '/guide/wizard' },
        ],
      },
      {
        text: 'Form data',
        items: [
          { text: 'Fields from a JSON Schema', link: '/guide/json-schema' },
          { text: 'Saving a draft', link: '/guide/drafts' },
          { text: 'Undo and redo', link: '/guide/undo-redo' },
        ],
      },
      {
        text: 'Frameworks',
        items: [
          { text: 'React', link: '/frameworks/react' },
          { text: 'Vue 3', link: '/frameworks/vue' },
          { text: 'Angular', link: '/frameworks/angular' },
        ],
      },
      {
        text: 'More',
        items: [
          { text: 'Registries', link: '/guide/registries' },
          { text: 'UI kit recipes', link: '/more/ui-kit-recipes' },
          { text: 'Migrating', link: '/more/migrating' },
        ],
      },
    ],

    outline: { level: [2, 3] },
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: REPO }],

    // Every page is built from a file in the repository; "edit" opens that one.
    // (The function is serialised into the page, so it cannot use `REPO`.)
    editLink: {
      pattern: ({ frontmatter, filePath }) =>
        `https://github.com/vannt-dev/dynamic-field-kit/edit/develop/${
          frontmatter.source ?? `handbook/${filePath}`
        }`,
      text: 'Edit the source of this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License.',
    },
  },
});
