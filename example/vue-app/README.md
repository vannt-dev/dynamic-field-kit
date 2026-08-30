# Vue App

Vue 3 + Vite demo app for `@dynamic-field-kit/vue`. Deployed at
https://vannt-dev.github.io/dynamic-field-kit/vue/

## What It Does

`src/App.vue` holds four tabs. The last two show the demo's own source beside the
running form.

| Tab                  | Source                         | Shows                                                                                                                             |
| -------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Demo Cơ Bản (Legacy) | `src/App.vue` (`legacyFields`) | `firstName` / `lastName`, a computed `fullName`, `age`, a repeatable `contacts` group                                             |
| Demo Tính Năng Mới   | `src/App.vue` (`newFields`)    | options that depend on another field, the built-in validators, async validation, `appearCondition` and `disabledCondition`        |
| Enterprise           | `src/demos/EnterpriseDemo.vue` | `useDynamicForm`, the HTML5 renderers (`select`, `radio`, `range`, `email`, `date`, `switch`), blur wiring, `DynamicFormDevTools` |
| Wizard               | `src/demos/WizardDemo.vue`     | the multi-step engine: `createWizardState`, `validateStep`, `goNext` / `goPrev`                                                   |

Custom field renderers are registered in `src/lib/fieldRegistry.ts`.

## Run

The app consumes the packages through `file:../../packages/*`, so **build the
workspace first** — a `file:` dependency resolves to `dist`, which does not exist
in a fresh checkout.

```bash
npm run build      # from the repo root, once
npm install        # here
npm run dev
```

## Build

```bash
npm run build      # vue-tsc -b && vite build
npm run preview
```

`PAGES_BASE_PATH` sets Vite's `base` for a GitHub Pages deploy; leave it unset
for local builds.

## Main Files

- `src/App.vue` — the tabs, the two inline demos, the source panel
- `src/demos/EnterpriseDemo.vue`, `src/demos/WizardDemo.vue`
- `src/lib/fieldRegistry.ts` — the custom renderers
- `src/main.ts`, `src/style.css`
