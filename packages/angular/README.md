# @dynamic-field-kit/angular

Lightweight Angular adapters for `@dynamic-field-kit/core`.

This package mirrors the React package structure and exposes Angular components that integrate with the shared `fieldRegistry` from `@dynamic-field-kit/core`.

Quick overview
- Exports a minimal Angular integration: `DynamicInput`, `FieldInput`, `MultiFieldInput`, layout components and `DynamicFieldKitModule` (see `src/public-api.ts`).
- Designed for local development (source import) and can be packaged with `ng-packagr` for distribution.

Usage (consumer Angular app)

1. Install the package (recommended: use packaged artifact or local `file:` during development):

```bash
# from your Angular app
npm install @dynamic-field-kit/core @dynamic-field-kit/angular
```

2. Import the module in your `AppModule`:

```ts
import { DynamicFieldKitModule } from '@dynamic-field-kit/angular'

@NgModule({
	imports: [BrowserModule, DynamicFieldKitModule],
})
export class AppModule {}
```

3. Register Angular component classes into the shared registry at app startup (example):

```ts
// src/main.ts
import '@dynamic-field-kit/angular/src/examples' // registers example component into fieldRegistry
```

Then use the Angular adapter components (`dfk-multi-field-input`, etc.) in templates.

Local development
- You can import the package source directly in your Angular app using `file:` references in `package.json` (see `example/angular-instructions.md` and `example/angular-app/` for a scaffold).

Build & publish
- This package supports `ng-packagr`. To build locally:

```bash
cd packages/angular
npm install --no-audit --no-fund --save-dev ng-packagr rimraf
npm run build
```

- To publish to npm (scoped package), ensure `publishConfig.access` is `public` and run:

```bash
cd packages/angular
npm publish --access public
```

Notes & caveats
- The Angular adapter expects consumers to register Angular component classes (not React components) in `fieldRegistry` when using the Angular runtime.
- The package exports a `DynamicFieldKitModule` to simplify consumer imports, and also provides standalone components for more advanced composition.

Examples & docs
- See `example/angular-instructions.md` for detailed wiring steps.
- Try the local scaffold at `example/angular-app/` for a hands-on demo.
