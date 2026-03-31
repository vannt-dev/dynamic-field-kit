# Example Angular App (development scaffold)

This folder is a minimal Angular app scaffold that demonstrates the recommended integration for `@dynamic-field-kit/angular`.

Quick start

1. Build the Angular package first:

```bash
cd packages/angular
npm run build
```

2. Install dependencies for the example app:

```bash
cd example/angular-app
npm install
```

3. Run the app:

```bash
npm start
```

Notes
- This scaffold references `@dynamic-field-kit/core` from `../../packages/core` and `@dynamic-field-kit/angular` from `../../packages/angular/dist`.
- `AppModule` imports `DynamicFieldKitModule` from `@dynamic-field-kit/angular`.
- `src/app/fieldRegistry.ts` registers the local Angular field components into the shared `fieldRegistry`.
- `angular.json` sets `preserveSymlinks: true` so the linked local package works reliably with Angular CLI.
- After rebuilding `packages/angular`, restart `npm start` so the dev server reloads the updated linked package.
- See `example/angular-instructions.md` for a copy-paste integration guide for another Angular app.
