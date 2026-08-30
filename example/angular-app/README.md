# Angular App

Angular 19 demo app for `@dynamic-field-kit/angular`. Deployed at
https://vannt-dev.github.io/dynamic-field-kit/angular/

## What It Does

`src/app/app.component.html` holds four tabs, mirroring the Vue demo. The last
two show the demo's own source beside the running form.

| Tab                  | Source                                  | Shows                                                                                                                      |
| -------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Demo Cơ Bản (Legacy) | `app.component.ts` (`legacyFields`)     | `firstName` / `lastName`, a computed `fullName`, `age`, a repeatable `contacts` group                                      |
| Demo Tính Năng Mới   | `app.component.ts` (`newFields`)        | options that depend on another field, the built-in validators, async validation, `appearCondition` and `disabledCondition` |
| Enterprise           | `src/app/demos/enterprise.component.ts` | `createDynamicFormStore` (Angular Signals), the HTML5 renderers, `DynamicFormDevToolsComponent`                            |
| Wizard               | `src/app/demos/wizard.component.ts`     | the multi-step engine: `createWizardState`, `validateStep`, `goNext` / `goPrev`                                            |

Field components live in `src/app/components/` (text, number, select) and are
registered in `src/app/fieldRegistry.ts`.

## Run

This app depends on `file:../../packages/angular/dist`, so **build the workspace
first** — the path does not exist in a fresh checkout.

```bash
npm run build      # from the repo root, once
npm install        # here
npm start
```

## Build

```bash
npm run build
```

**Run it through npm, not `ng build` / `ng serve` directly.** The `prebuild` and
`prestart` hooks run `scripts/embed-demo-sources.js`, which generates
`src/app/demo-sources.ts` for the source panel. That file is gitignored, so
calling the Angular CLI binary directly skips the hook and the build fails on a
missing module. npm forwards extra args, so
`npm run build -- --base-href /dynamic-field-kit/angular/` is how the Pages
deploy builds it.

## Main Files

- `src/app/app.component.ts` / `.html` — the tabs and the two inline demos
- `src/app/demos/enterprise.component.ts`, `src/app/demos/wizard.component.ts`
- `src/app/fieldRegistry.ts`, `src/app/components/*.component.ts` — the custom renderers
- `scripts/embed-demo-sources.js` → `src/app/demo-sources.ts` (generated)
