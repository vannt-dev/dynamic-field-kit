# Handbook

The documentation site at <https://vannt-dev.github.io/dynamic-field-kit/handbook/>,
built with [VitePress](https://vitepress.dev).

Its pages are **generated**: `scripts/sync.mjs` cuts the package READMEs, the
root README and `docs/` into pages and rewrites their links. To change what a
page says, edit the file it comes from (each page's "Edit" link opens it). To
add or reorder pages, edit `PAGES` in `scripts/sync.mjs` and the sidebar in
`.vitepress/config.mts`.

```bash
cd handbook
npm install
npm run dev      # sync, then serve with hot reload
npm run build    # sync, then build to .vitepress/dist
```

Only `index.md` (the home page) is written by hand. `guide/`, `frameworks/` and
`more/` are build output and gitignored.

## Vietnamese

`vi/` holds the Vietnamese handbook. Unlike the English pages it is **written by
hand**: the home page and the ten guide pages are translated, and the
per-framework reference, the recipes and the migration notes are short pages
that point to the English ones. When a README section changes, update its page
under `vi/guide/` too - nothing regenerates it. The locale, its navigation and
its sidebar are set in `.vitepress/config.mts`.

The Pages workflow builds the handbook next to the three example apps and
serves it under `/handbook/`.
