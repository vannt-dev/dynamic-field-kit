# @dynamic-field-kit/core

Core types and shared registries for `dynamic-field-kit`.

`@dynamic-field-kit/core` is intentionally framework-agnostic. It does not import React, Vue, or Angular types in its public API. Applications define field schemas in `core`, then register framework-specific renderers through an adapter package such as `@dynamic-field-kit/react`, `@dynamic-field-kit/vue`, or `@dynamic-field-kit/angular`.

Demo app: https://github.com/vannt-dev/dynamic-field-kit-demo

## What this package provides

- `FieldDescription` for schema-driven field definitions
- `FieldRendererProps` as the shared renderer contract
- `FieldTypeMap` for module augmentation and custom field typing
- `fieldRegistry` as the shared runtime registry instance

## Install

```bash
npm install @dynamic-field-kit/core
```

Install a UI adapter alongside it when rendering forms:

```bash
npm install @dynamic-field-kit/core @dynamic-field-kit/react
# or
npm install @dynamic-field-kit/core @dynamic-field-kit/vue
# or
npm install @dynamic-field-kit/core @dynamic-field-kit/angular
```

## Core idea

The library does not hard-code field types like `"text" | "number"`.

Instead, apps extend `FieldTypeMap`:

```ts
export interface FieldTypeMap {}
```

That keeps the package open for custom field types without modifying the library.

## Define field types in your app

Create a declaration file such as `src/types/dynamic-field-kit.d.ts`:

```ts
import "@dynamic-field-kit/core"

declare module "@dynamic-field-kit/core" {
  interface FieldTypeMap {
    text: string
    number: number
    checkbox: boolean
    select: string
  }
}
```

Make sure that file is included by your app's `tsconfig.json`.

## Shared types

```ts
export interface FieldRendererProps<T = any> {
  value?: T
  onValueChange?: (value: T) => void
  label?: string
  placeholder?: string
  required?: boolean
  options?: Record<string, any>[]
  className?: string
  description?: any
}
```

```ts
export interface FieldDescription<T extends FieldTypeKey = FieldTypeKey> {
  name: string
  type: T
  label?: string
  placeholder?: string
  required?: boolean
  appearCondition?: (data: Record<string, any>) => boolean
  options?: Record<string, any>[]
  className?: string
  description?: any
}
```

## Register renderers through an adapter

`core` owns the shared registry instance, but renderer registration should happen through the framework adapter so the adapter can expose the correct renderer type for that framework.

Typical adapter imports:

```ts
import { fieldRegistry as reactRegistry } from "@dynamic-field-kit/react"
import { fieldRegistry as vueRegistry } from "@dynamic-field-kit/vue"
import { fieldRegistry as angularRegistry } from "@dynamic-field-kit/angular"
```

Then register a renderer using the adapter that matches your UI framework.

React:

```tsx
import { fieldRegistry } from "@dynamic-field-kit/react"

fieldRegistry.register("text", ({ value, onValueChange, label }) => (
  <label>
    <span>{label}</span>
    <input
      value={value ?? ""}
      onChange={(e) => onValueChange?.(e.target.value)}
    />
  </label>
))
```

Vue:

```ts
import { defineComponent, h } from "vue"
import { fieldRegistry } from "@dynamic-field-kit/vue"

fieldRegistry.register(
  "text",
  defineComponent({
    setup() {
      return () => h("input")
    },
  })
)
```

Angular:

```ts
import { fieldRegistry } from "@dynamic-field-kit/angular"
import { TextFieldComponent } from "./text-field.component"

fieldRegistry.register("text", TextFieldComponent as any)
```

## Example schema

```ts
import type { FieldDescription } from "@dynamic-field-kit/core"

const fields: FieldDescription[] = [
  { name: "username", type: "text", label: "Username" },
  {
    name: "age",
    type: "number",
    label: "Age",
    appearCondition: (data) => Boolean(data.username),
  },
]
```

## Notes

- `core` is runtime-shared across adapters.
- `core` does not ship UI components.
- The registry stores framework-specific renderers, but the framework-specific typing belongs in each adapter package.

## Related packages

- `@dynamic-field-kit/react`
- `@dynamic-field-kit/vue`
- `@dynamic-field-kit/angular`

## License

MIT
