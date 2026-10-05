# Angular App

Angular 19 demo app for `@dynamic-field-kit/angular`. Deployed at
https://vannt-dev.github.io/dynamic-field-kit/angular/

## What It Does

`src/app/app.component.html` holds five tabs, mirroring the Vue demo. The last
three show the demo's own source beside the running form.

| Tab                | Source                                  | Shows                                                                                                                         |
| ------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Cơ bản             | `app.component.ts` (`legacyFields`)     | `firstName` / `lastName`, a computed `fullName`, `age`, a repeatable `contacts` group                                         |
| Validation         | `app.component.ts` (`newFields`)        | options that depend on another field, the built-in validators, async validation, `appearCondition` and `disabledCondition`    |
| Form state         | `src/app/demos/enterprise.component.ts` | `createDynamicFormStore` (Angular Signals), the HTML5 renderers, `DynamicFormDevToolsComponent`                               |
| Wizard             | `src/app/demos/wizard.component.ts`     | the multi-step engine: `createWizardState`, `validateStep`, `goNext` / `goPrev`                                               |
| JSON Schema + Undo | `src/app/demos/schema.component.ts`     | a form built by `fieldsFromJsonSchema`, kept across reloads by `createFormDraft`, with undo and redo from `createFormHistory` |

Field components live in `src/app/components/fields.ts` - one for every field
type the demos use - and are registered in `src/app/fieldRegistry.ts`. The look
comes from `../shared/demo.css`, shared by the three example apps.

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
- `src/app/demos/enterprise.component.ts`, `src/app/demos/wizard.component.ts`, `src/app/demos/schema.component.ts`
- `src/app/fieldRegistry.ts`, `src/app/components/fields.ts` — the custom renderers
- `scripts/embed-demo-sources.js` → `src/app/demo-sources.ts` (generated)
