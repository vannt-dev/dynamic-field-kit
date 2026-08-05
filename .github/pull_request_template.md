## What

<!-- What changed, in one or two sentences. -->

## Why

<!-- The problem this solves. Link the issue if there is one. -->

## How to test

<!-- Commands or steps a reviewer can actually run. -->

---

- [ ] Added a changeset (`npx changeset`) if any package under `packages/` changed
- [ ] Tests cover the change — a bug fix has a test that failed before it
- [ ] Public API changes are reflected in the README / package README
- [ ] Behaviour is consistent across react, vue and angular, or the difference is explained above

<!--
CI runs: lint, format, prod audit, build x4, typecheck, type tests,
per-package tests with coverage floors, the three example apps, the built
package smoke test, and the cross-framework verify scripts.
Run locally with: npm run lint && npm run typecheck && npm test
-->
