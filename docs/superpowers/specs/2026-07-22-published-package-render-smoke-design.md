# Published-Package Render Smoke Test Design

**Date:** 2026-07-22
**Branch:** `feat/published-package-smoke` (based on `develop`)
**Backlog origin:** the trailing "also worth considering" note in `project_test_improvement_backlog` — "no example-app/e2e smoke test that the published packages render in a real app."

## Problem

Every existing test exercises **source**, not the **built artifact** a consumer installs:

- Each package's vitest suite imports from `../src` (compiled on the fly by the vite/analog plugins). A packaging break — a wrong `exports` map, a missing file in `dist`, a bad tsup/ng-packagr emit — would not fail any of those suites.
- `scripts/integration-cross-registry.js` **does** load the built `dist` of all four packages, but only at the module level: it `require()`/`import()`s the dist and invokes the adapter registry wrappers as plain functions, asserting cross-registry wiring. It never mounts a component through the real framework runtime, so it cannot catch "the built component fails to render."
- Three example apps (`example/react-app` Next.js, `example/vue-app` Vite, `example/angular-app` Angular CLI) consume the packages via `file:` links, but they are **not wired into CI**, so nothing runs them automatically.

The gap is specifically **rendering fidelity of the built package**: nothing asserts that a component imported from the published `dist` actually renders to DOM through React/Vue/Angular.

## Goal

- A CI-blocking smoke test that imports each adapter as a real consumer would (bare specifier → `dist` via the package `exports` map), mounts a component through the real framework runtime on jsdom, and asserts DOM output.
- Complement, not duplicate, `integration-cross-registry.js` (module wiring) — this adds the render step.
- Keep it fast and browser-free (jsdom), separate from the per-package source suites and their coverage floors.

## Decisions (locked)

- **Fidelity: jsdom render-smoke against `dist`**, not full browser e2e on the example apps and not an example-app build-only check. Highest value per cost: it catches "built package doesn't render" without a browser or three bundler builds.
- **Consumer-path resolution:** tests import the **bare specifier** (`@dynamic-field-kit/react`, `…/vue`, `…/core`). All three packages' `main`/`module`/`exports` point exclusively to `dist`, so a workspace importing the bare specifier resolves to the built artifact — the real-consumer path. (Verified 2026-07-22.)
- **Placement: a dedicated private `smoke/` workspace**, not plain node scripts (keeps RTL / `@vue/test-utils` ergonomics) and not co-located in each package's `test/` dir (would pollute the source suites and the coverage numbers just floored in item 5).
- **Framework scope: React + Vue now; Angular if feasible.** React/Vue render against built `dist` cleanly. Angular from `dist` via `TestBed` (built fesm2022 is AOT-compiled with `ɵcmp`, needs zone.js/platform bootstrap) is higher-risk; attempt it, include only if it runs cleanly, otherwise document why and leave Angular at its existing import-wiring level.
- **CI: blocking, in the existing `verify` job**, which already builds all packages then runs the integration scripts.

## Design

### The `smoke/` workspace

- **`smoke/package.json`** — private `@dynamic-field-kit/smoke`.
  - `dependencies`: `@dynamic-field-kit/core`, `@dynamic-field-kit/react`, `@dynamic-field-kit/vue` (workspace links; resolve to their `dist`).
  - `devDependencies`: `vitest`, `@testing-library/react`, `@vue/test-utils`, `jsdom`, `@vitejs/plugin-react`, `react`, `react-dom`, `vue`.
  - `scripts.test`: `vitest run`.
- **`smoke/vitest.config.ts`** — `plugins: [react()]`, `test: { environment: 'jsdom', globals: true }`. **No `coverage` block** — this suite asserts artifact behavior, not line coverage.
- **`smoke/react.smoke.test.tsx`** — `import { DynamicInput, FieldRegistryProvider, FieldRegistry } from '@dynamic-field-kit/react'`; make a fresh `FieldRegistry`, register a trivial renderer, render `<DynamicInput type="text" value="hi" />` wrapped in `FieldRegistryProvider` (reusing the DI landed in item 6), assert the DOM text.
- **`smoke/vue.smoke.test.ts`** — same shape via `@vue/test-utils` `mount` + `global.provide` DI with `FieldRegistryKey` from `@dynamic-field-kit/vue`.
- **Dist preflight** — a small `beforeAll` (or a shared helper) that checks each imported package's `dist/index.*` exists and fails with a clear "run `npm run build` first" message, so a forgotten build produces a readable error rather than a raw module-resolution stack.

### Angular (best-effort)

- Attempt **`smoke/angular.smoke.test.ts`**: import the built `@dynamic-field-kit/angular`, bootstrap zone.js + the dynamic testing platform, register a renderer via the `FIELD_REGISTRY` token, create `DynamicInput` with `TestBed`, assert DOM.
- If it runs cleanly and deterministically on jsdom, include it. If it needs the JIT compiler or other real-app bootstrapping that makes it fragile, drop the Angular smoke, add a short comment in the workspace README/spec explaining that Angular stays at the `integration-cross-registry.js` import-wiring level, and move on.

### CI

- Add one step to the `verify` job after the existing "Build packages" step and alongside the "Run verification scripts" step (order relative to the three scripts does not matter — all are post-build artifact checks):
  `npm run test --workspace=@dynamic-field-kit/smoke`
- Blocking. The `verify` job already runs on `ubuntu-latest`, builds all four packages, and runs the three verification scripts; the smoke fits the same "post-build, real-artifact" phase.

## Testing

The smoke *is* the test. Verification of the work itself:

- Build packages, run `npm run test --workspace=@dynamic-field-kit/smoke` → green.
- Prove it bites: temporarily break a package's `exports` (or delete a `dist` file) and confirm the smoke fails with the preflight/render error, then revert.
- Full local gate unaffected: `npm run lint && npm run format-check`, per-package suites, and the three verify scripts still pass.

## Out of scope

- The example apps' committed build caches (`example/angular-app/.angular/cache`, `build.log`, `tsconfig.tsbuildinfo`) — unrelated hygiene.
- Full browser e2e / driving the example apps.
- Angular is best-effort only, per the decision above.
