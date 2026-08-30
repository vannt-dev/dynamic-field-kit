# React App

Next.js demo app for `@dynamic-field-kit/react`. Deployed at
https://vannt-dev.github.io/dynamic-field-kit/react/

## What It Does

Three pages, linked by `app/DemoNav.tsx`. Each one is wrapped in
`app/DemoShell.tsx`, which can show the demo's own source beside it — read at
build time by `app/lib/readDemoSource.ts`, so the panel always matches the code
that is running.

| Page            | Source                      | Shows                                                                                                                |
| --------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `/`             | `app/demo.tsx`              | `firstName` / `lastName`, a computed `fullName`, `age`, a repeatable `contacts` group, responsive layout             |
| `/new-features` | `app/new-features/demo.tsx` | `useDynamicForm`, the HTML5 renderers (`select`, `radio`, `range`, `email`, `date`, `switch`), `DynamicFormDevTools` |
| `/wizard`       | `app/wizard/demo.tsx`       | `createWizardState`, `validateStep`, `goNext` / `goPrev` across three steps                                          |

Custom field renderers are registered in `lib/fieldRegistry.tsx`.

## Run

The app consumes the packages through `file:../../packages/*`, so **build the
workspace first** — a `file:` dependency resolves to `dist`, which does not
exist in a fresh checkout.

```bash
npm run build      # from the repo root, once
npm install        # here
npm run dev
```

Open `http://localhost:3000`.

## Build

```bash
npm run build
npm run start
```

`PAGES_BASE_PATH` prefixes the asset URLs for a GitHub Pages deploy; leave it
unset for local builds.

## Main Files

- `app/page.tsx`, `app/new-features/page.tsx`, `app/wizard/page.tsx` — the routes
- `app/demo.tsx`, `app/new-features/demo.tsx`, `app/wizard/demo.tsx` — the demos themselves
- `app/DemoNav.tsx`, `app/DemoShell.tsx`, `app/lib/readDemoSource.ts` — nav and source panel
- `lib/fieldRegistry.tsx` — the custom renderers
- `app/layout.tsx`, `app/globals.css`
