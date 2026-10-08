---
'@dynamic-field-kit/svelte': minor
---

New package: a Svelte 5 adapter. `MultiFieldInput`, `FieldInput` and `DynamicInput` render a `FieldDescription[]` through the shared field registry; `createDynamicForm` holds the form state (values, errors, touched, dirty, sync and async validation, submit) with the same surface as `useDynamicForm` in the React and Vue adapters; fourteen plain-HTML default renderers, the column / row / grid / responsive layouts and a layout registry, repeatable groups, async options and scoped registries are included. Not in this first version: the DevTools panel.
