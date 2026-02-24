# Example Angular App (development scaffold)

This folder is a minimal Angular app scaffold to help you wire the `@dynamic-field-kit/angular` source during development. It is intentionally small — you must install Angular CLI and dependencies locally before running.

Quick start

1. From the repository root, install dependencies for the example app (this will also install the local package references):

```bash
cd example/angular-app
npm install
```

2. Run the app (Angular CLI will serve it):

```bash
npm start
```

Notes
- This scaffold references monorepo packages using `file:` paths in `package.json`. After `npm install`, the example app will use the local `packages/core` and `packages/angular` sources.
- If you prefer not to run `npm install`, you can still follow the integration steps in `example/angular-instructions.md` to wire the Angular example into an existing Angular project.
