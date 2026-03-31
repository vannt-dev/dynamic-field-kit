# @dynamic-field-kit/react

React renderer for `@dynamic-field-kit/core`.

This package provides React components that render dynamic fields from `FieldDescription[]` and resolve field renderers through the shared `fieldRegistry`.

---

## 📦 Packages

| Package | Description |
|------|------------|
| `@dynamic-field-kit/core` | Core types and field registry |
| `@dynamic-field-kit/react` | React components (FieldInput, MultiFieldInput, DynamicInput) |

---
## Installation

```bash
npm install @dynamic-field-kit/core @dynamic-field-kit/react react
```

Peer dependency:

```txt
react >= 17
```

## Exports

- `DynamicInput`
- `FieldInput`
- `MultiFieldInput`
- `layoutRegistry`
- `fieldRegistry`
- `FieldDescription`, `FieldTypeKey`, `FieldRendererProps`

Default layouts are registered automatically when you import the package root.

Built-in layout types:

- `column`
- `row`
- `grid`
- `responsive`

## Register field renderers

Register React components or functions in `fieldRegistry` before rendering your form:

```tsx
import { fieldRegistry } from "@dynamic-field-kit/react"

fieldRegistry.register("text", ({ value, onValueChange, label }) => (
  <label style={{ display: "grid", gap: 4 }}>
    <span>{label}</span>
    <input
      value={value ?? ""}
      onChange={(e) => onValueChange?.(e.target.value)}
    />
  </label>
))

fieldRegistry.register("number", ({ value, onValueChange, label }) => (
  <label style={{ display: "grid", gap: 4 }}>
    <span>{label}</span>
    <input
      type="number"
      value={value ?? ""}
      onChange={(e) => onValueChange?.(Number(e.target.value))}
    />
  </label>
))
```

## Basic usage

```tsx
import { useState } from "react"
import { MultiFieldInput } from "@dynamic-field-kit/react"
import type { FieldDescription } from "@dynamic-field-kit/core"

const fields: FieldDescription[] = [
  { name: "name", type: "text", label: "Name" },
  { name: "age", type: "number", label: "Age" },
]

export function Example() {
  const [data, setData] = useState({})

  return (
    <MultiFieldInput
      fieldDescriptions={fields}
      properties={data}
      onChange={setData}
    />
  )
}
```

## Layouts

Use a simple layout name:

```tsx
<MultiFieldInput
  fieldDescriptions={fields}
  layout="grid"
/>
```

Use a layout config object:

```tsx
<MultiFieldInput
  fieldDescriptions={fields}
  layout={{ type: "grid", columns: 3, gap: 16 }}
/>
```

Use the built-in responsive layout:

```tsx
<MultiFieldInput
  fieldDescriptions={fields}
  layout={{
    type: "responsive",
    mobile: "column",
    desktop: { type: "grid", columns: 2, gap: 12 },
  }}
/>
```

You can also register custom layouts:

```tsx
import { layoutRegistry } from "@dynamic-field-kit/react"

layoutRegistry.register("stack-tight", ({ children }) => (
  <div style={{ display: "grid", gap: 8 }}>{children}</div>
))
```

## Type augmentation

Add your app field types through module augmentation:

```ts
import "@dynamic-field-kit/core"

declare module "@dynamic-field-kit/core" {
  interface FieldTypeMap {
    text: string
    number: number
  }
}
```

## Notes

- The library does not ship built-in field UI. Your app owns renderer registration.
- `MultiFieldInput` filters fields using `appearCondition`.
- `DynamicInput` shows `Unknown field type: ...` if a renderer is missing.
