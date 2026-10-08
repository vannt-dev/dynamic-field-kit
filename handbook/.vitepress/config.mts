import { defineConfig } from 'vitepress';

const REPO = 'https://github.com/vannt-dev/dynamic-field-kit';
const DEMOS = 'https://vannt-dev.github.io/dynamic-field-kit/';

export default defineConfig({
  // Set by the Pages workflow to '/dynamic-field-kit/handbook/'. Defaults to
  // '/' so `vitepress dev` and a plain build are unaffected.
  base: process.env.PAGES_BASE_PATH || '/',
  title: 'Dynamic Field Kit',
  cleanUrls: true,
  lastUpdated: false,
  // The pages are generated from READMEs that also link to local dev servers.
  ignoreDeadLinks: [/^https?:\/\/localhost/],

  // English is generated from the READMEs (scripts/sync.mjs). Vietnamese lives
  // in vi/ and is written by hand; it covers the guide, and links to the
  // English pages for the per-framework reference.
  locales: {
    root: {
      label: 'English',
      lang: 'en',
      description:
        'Handbook for dynamic-field-kit: schema-driven forms for React, Vue and Angular.',
      themeConfig: {
        nav: [
          {
            text: 'Guide',
            link: '/guide/getting-started',
            activeMatch: '^/guide/',
          },
          {
            text: 'Frameworks',
            items: [
              { text: 'React', link: '/frameworks/react' },
              { text: 'Vue 3', link: '/frameworks/vue' },
              { text: 'Angular', link: '/frameworks/angular' },
              { text: 'Svelte 5', link: '/frameworks/svelte' },
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
              { text: 'Svelte 5', link: '/frameworks/svelte' },
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
        editLink: {
          // Every English page is built from a file in the repository; "edit"
          // opens that one. (The function is serialised into the page, so it
          // cannot use `REPO`.)
          pattern: ({ frontmatter, filePath }) =>
            `https://github.com/vannt-dev/dynamic-field-kit/edit/develop/${
              frontmatter.source ?? `handbook/${filePath}`
            }`,
          text: 'Edit the source of this page on GitHub',
        },
        footer: { message: 'Released under the MIT License.' },
      },
    },

    vi: {
      label: 'Tiếng Việt',
      lang: 'vi',
      description:
        'Sổ tay dynamic-field-kit: dựng form từ schema cho React, Vue và Angular.',
      themeConfig: {
        nav: [
          {
            text: 'Hướng dẫn',
            link: '/vi/guide/getting-started',
            activeMatch: '^/vi/guide/',
          },
          {
            text: 'Framework (tiếng Anh)',
            items: [
              { text: 'React', link: '/frameworks/react' },
              { text: 'Vue 3', link: '/frameworks/vue' },
              { text: 'Angular', link: '/frameworks/angular' },
              { text: 'Svelte 5', link: '/frameworks/svelte' },
            ],
          },
          { text: 'Demo trực tiếp', link: DEMOS },
        ],
        sidebar: [
          {
            text: 'Khởi đầu',
            items: [
              { text: 'Bắt đầu', link: '/vi/guide/getting-started' },
              { text: 'Mô tả field', link: '/vi/guide/fields' },
            ],
          },
          {
            text: 'Dựng form',
            items: [
              { text: 'Field dẫn xuất', link: '/vi/guide/computed-fields' },
              { text: 'Validation và điều kiện', link: '/vi/guide/validation' },
              { text: 'Nhóm lặp lại', link: '/vi/guide/groups' },
              { text: 'Wizard nhiều bước', link: '/vi/guide/wizard' },
            ],
          },
          {
            text: 'Dữ liệu form',
            items: [
              { text: 'Field từ JSON Schema', link: '/vi/guide/json-schema' },
              { text: 'Lưu bản nháp', link: '/vi/guide/drafts' },
              { text: 'Undo và redo', link: '/vi/guide/undo-redo' },
            ],
          },
          {
            text: 'Thêm',
            items: [{ text: 'Registry', link: '/vi/guide/registries' }],
          },
          {
            text: 'Tham khảo (tiếng Anh)',
            items: [
              { text: 'React', link: '/frameworks/react' },
              { text: 'Vue 3', link: '/frameworks/vue' },
              { text: 'Angular', link: '/frameworks/angular' },
              { text: 'Svelte 5', link: '/frameworks/svelte' },
              { text: 'UI kit recipes', link: '/more/ui-kit-recipes' },
              { text: 'Migrating', link: '/more/migrating' },
            ],
          },
        ],
        outline: { level: [2, 3], label: 'Trong trang này' },
        docFooter: { prev: 'Trang trước', next: 'Trang sau' },
        darkModeSwitchLabel: 'Giao diện',
        sidebarMenuLabel: 'Mục lục',
        returnToTopLabel: 'Về đầu trang',
        langMenuLabel: 'Đổi ngôn ngữ',
        editLink: {
          pattern:
            'https://github.com/vannt-dev/dynamic-field-kit/edit/develop/handbook/:path',
          text: 'Sửa trang này trên GitHub',
        },
        footer: { message: 'Phát hành theo giấy phép MIT.' },
      },
    },
  },

  themeConfig: {
    outline: { level: [2, 3] },
    socialLinks: [{ icon: 'github', link: REPO }],
    search: {
      provider: 'local',
      options: {
        locales: {
          vi: {
            translations: {
              button: { buttonText: 'Tìm kiếm', buttonAriaLabel: 'Tìm kiếm' },
              modal: {
                noResultsText: 'Không có kết quả cho',
                resetButtonTitle: 'Xoá từ khoá',
                footer: {
                  selectText: 'chọn',
                  navigateText: 'di chuyển',
                  closeText: 'đóng',
                },
              },
            },
          },
        },
      },
    },
  },
});
