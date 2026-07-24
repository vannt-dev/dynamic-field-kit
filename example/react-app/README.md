# React App

Next.js demo app for `@dynamic-field-kit/react`.

## What It Does

- Registers local field renderers from `lib/fieldRegistry.tsx`
- Renders a simple dynamic form in `app/page.tsx`
- Shows live JSON output for the current form data

Current demo fields:

- `name` as `text`
- `age` as `number`

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build

```bash
npm run build
npm run start
```

## Main Files

- `app/page.tsx`
- `app/layout.tsx`
- `app/globals.css`
- `lib/fieldRegistry.tsx`
