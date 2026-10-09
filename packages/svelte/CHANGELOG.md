# @dynamic-field-kit/svelte

## 1.10.0

### Minor Changes

- Add the Svelte 5 adapter, @dynamic-field-kit/svelte, with its demo app
- 5fff8a6: New package: a Svelte 5 adapter. `MultiFieldInput`, `FieldInput` and `DynamicInput` render a `FieldDescription[]` through the shared field registry; `createDynamicForm` holds the form state (values, errors, touched, dirty, sync and async validation, submit) with the same surface as `useDynamicForm` in the React and Vue adapters; fourteen plain-HTML default renderers, the column / row / grid / responsive layouts and a layout registry, repeatable groups, async options and scoped registries are included. Not in this first version: the DevTools panel.

### Patch Changes

- 4f64937: `MultiFieldInput` no longer brings back an edit that was just undone. It kept the user's last change for as long as the `properties` object it was made on was the one handed in, so an undo history that hands back that same object showed the undone change again. The change is now dropped as soon as other properties arrive, and stays dropped.
