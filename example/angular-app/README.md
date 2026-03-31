# Example Angular App

This folder is a minimal Angular app scaffold for `@dynamic-field-kit/angular`.

Use one of these two modes depending on what you want to test.

Mode 1: npm package mode

Use this mode when you want to test the same setup that another external Angular project will use.

`example/angular-app/package.json`

```json
{
  "dependencies": {
    "@dynamic-field-kit/core": "^1.0.10",
    "@dynamic-field-kit/angular": "^1.2.1"
  }
}
```

Commands:

```bash
cd example/angular-app
npm install
npm start
```

Notes:
- This mode installs packages from npm.
- Use this mode to verify the published package works in a normal consumer project.
- If you just published a new Angular package version, reinstall before testing.

Mode 2: local development mode

Use this mode when you are working inside this monorepo and want the example app to load the local package build.

`example/angular-app/package.json`

```json
{
  "dependencies": {
    "@dynamic-field-kit/core": "file:../../packages/core",
    "@dynamic-field-kit/angular": "file:../../packages/angular/dist"
  }
}
```

Commands:

```bash
cd packages/angular
npm run build

cd ../../example/angular-app
npm install
npm start
```

Notes:
- This mode links the example app to the local monorepo packages.
- `angular.json` sets `preserveSymlinks: true` so linked packages work reliably with Angular CLI.
- After rebuilding `packages/angular`, restart `npm start` so the dev server reloads the updated package.

Shared notes
- `AppModule` imports `DynamicFieldKitModule` from `@dynamic-field-kit/angular`.
- `src/app/fieldRegistry.ts` registers the local Angular field components into the shared `fieldRegistry`.
- See `example/angular-app/angular-instructions.md` for a copy-paste integration guide for another Angular app.
