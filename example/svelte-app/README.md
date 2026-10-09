# Svelte App

Svelte 5 + Vite demo app for `@dynamic-field-kit/svelte`. Deployed at
https://vannt-dev.github.io/dynamic-field-kit/svelte/

## What It Does

`src/App.svelte` holds five tabs. The last three show the demo's own source beside
the running form.

| Tab                | Source                            | Shows                                                                                                                         |
| ------------------ | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Basics             | `src/App.svelte` (`legacyFields`) | `firstName` / `lastName`, a computed `fullName`, `age`, a repeatable `contacts` group                                         |
| Validation         | `src/App.svelte` (`newFields`)    | options that depend on another field, the built-in validators, async validation, `appearCondition` and `disabledCondition`    |
| Form state         | `src/demos/EnterpriseDemo.svelte` | `createDynamicForm`, the HTML5 renderers (`select`, `radio`, `range`, `email`, `date`, `switch`), blur wiring                 |
| Wizard             | `src/demos/WizardDemo.svelte`     | the multi-step engine: `createWizardState`, `validateStep`, `goNext` / `goPrev`                                               |
| JSON Schema + Undo | `src/demos/SchemaFormDemo.svelte` | a form built by `fieldsFromJsonSchema`, kept across reloads by `createFormDraft`, with undo and redo from `createFormHistory` |

The demos are in English and Vietnamese: the **EN / VI** switch in the navigation
reloads the page in the other language (`../shared/i18n.ts`; English is the
default unless the browser is set to Vietnamese).

Every field type the demos use has a renderer registered in
`src/lib/fieldRegistry.ts`: one Svelte component per type under `src/lib/`. The
look comes from `../shared/demo.css`, shared by all the example apps.

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
npm run build      # svelte-check && vite build
npm run preview
```

`PAGES_BASE_PATH` sets Vite's `base` for a GitHub Pages deploy; leave it unset
for local builds.

## Main Files

- `src/App.svelte` — the tabs, the two inline demos, the source panel
- `src/demos/EnterpriseDemo.svelte`, `src/demos/WizardDemo.svelte`, `src/demos/SchemaFormDemo.svelte`
- `src/lib/fieldRegistry.ts` and the `*Field.svelte` components — the custom renderers
- `src/main.ts`, `src/style.css`
