# @dynamic-field-kit/react

React adapter for `@dynamic-field-kit/core`.

This package provides React components for rendering `FieldDescription[]` and exports a React-typed `fieldRegistry`, so registered renderers can be used directly as JSX components.

Demo app: https://github.com/vannt-dev/dynamic-field-kit-demo

## Install

```bash
npm install @dynamic-field-kit/core @dynamic-field-kit/react react
```

## Exports

- `DynamicInput`
- `FieldInput`
- `MultiFieldInput`
- `layoutRegistry`
- `fieldRegistry`
- `ReactFieldRenderer`
- `ReactFieldRegistry`
- `FieldDescription`
- `FieldTypeKey`
- `FieldRendererProps`

Default layouts are registered automatically when you import the package root.

Built-in layouts:

- `column`
- `row`
- `grid`
- `responsive`

## Register field renderers

Register React components or function components through the React adapter:

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

Use a layout name:

```tsx
<MultiFieldInput fieldDescriptions={fields} layout="grid" />
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

Register a custom layout:

```tsx
import { layoutRegistry } from "@dynamic-field-kit/react"

layoutRegistry.register("stack-tight", ({ children }) => (
  <div style={{ display: "grid", gap: 8 }}>{children}</div>
))
```

## Type augmentation

Add your app's field types through module augmentation:

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

- `@dynamic-field-kit/core` stays framework-agnostic and does not export React-specific JSX types.
- `@dynamic-field-kit/react` narrows the shared registry to React component types so `fieldRegistry.get(type)` can be rendered safely in TSX.
- `MultiFieldInput` filters fields using `appearCondition`.
- `DynamicInput` renders `Unknown field type: ...` when a renderer is missing.

## License

MIT
