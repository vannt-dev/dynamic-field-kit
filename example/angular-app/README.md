# Angular App

Angular demo app for `@dynamic-field-kit/angular`.

## What It Does

- Registers Angular field components in `src/app/fieldRegistry.ts`
- Renders a dynamic form from `src/app/app.component.ts`
- Updates and displays the submitted object as field values change

Current demo fields:

- `name` as `text`
- `age` as `number`

## Run

```bash
npm install
npm start
```

## Build

```bash
npm run build
```

## Main Files

- `src/app/app.component.ts`
- `src/app/app.component.html`
- `src/app/fieldRegistry.ts`
- `src/app/components/text-field.component.ts`
- `src/app/components/number-field.component.ts`
