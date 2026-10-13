# @dynamic-field-kit/svelte

## 1.11.0

### Minor Changes

- Input masks, titled sections and errors from the server; the built-in controls of the Vue and Angular adapters keep the focus and stay one element.
- b7ffb5c: Input masks. A field takes `mask`: a pattern such as `'(999) 999-9999'` (`9` a digit, `a` a letter, `*` either, anything else fixed) or a `{ format, parse }` pair. The renderer receives the formatted text as `value`, the form stores the unformatted value (`'5551234567'`), and validators, `computeValue`, drafts and `onSubmit` see that stored value. A separator appears with the character after it, a character that does not fit is neither stored nor left on screen, and Backspace on a separator removes the character before it. Renderers need no change. Core gains `createInputMask(pattern)` for the same formatting outside a form, the `InputMask` and `FieldMask` types, and `applyMask` / `parseInput` on `buildFieldRendererProps` for adapters; a mask takes effect when both core and the adapter are 1.11 or newer.
- 4326470: Sections. A field with `section: FieldDescription[]` is a titled section: `data[name]` is one object shaped by the nested fields, the non-repeating sibling of a group. Every adapter's `MultiFieldInput` renders it as a `<fieldset>` with `label` as its `<legend>`. Errors, pending rules and touched flags of the fields inside are keyed by path (`address.street`), `appearCondition` and `disabled` / `disabledCondition` on the section apply to all of it, and sections nest in groups and in each other. `validateFields`, `validateFieldsAsync` and `collectFieldPaths` look inside sections; `fieldsFromJsonSchema` now turns a nested object into a section instead of reporting it, and `fieldsToJsonSchema` writes a section as a nested object. Core gains `isFieldSection` and `sectionPathMap`. Sections need core and the adapter at 1.11 or newer.
- 5eaa3ca: Errors from the server. Every form store (`useDynamicForm` in React and Vue, `createDynamicForm` in Svelte, `createDynamicFormStore` in Angular) gains `setServerErrors(errors)`, `clearServerErrors(name?)` and `serverErrors`: what a backend refused is shown in `errors` after a field's own errors, its fields are marked touched, and an error stays until the value it was about changes, until it is cleared or the form is reset, or until the next submit. `isValid` keeps speaking for the form's own rules. Core gains `serverErrorsFrom(body, { paths })`, which reads the usual response shapes (a field map, `errors` as a map or a list, Zod's `issues` and flattened error, JSON Pointers) into that map, and `FORM_ERROR_KEY` for errors that name no field.

## 1.10.0

### Minor Changes

- Add the Svelte 5 adapter, @dynamic-field-kit/svelte, with its demo app
- 5fff8a6: New package: a Svelte 5 adapter. `MultiFieldInput`, `FieldInput` and `DynamicInput` render a `FieldDescription[]` through the shared field registry; `createDynamicForm` holds the form state (values, errors, touched, dirty, sync and async validation, submit) with the same surface as `useDynamicForm` in the React and Vue adapters; fourteen plain-HTML default renderers, the column / row / grid / responsive layouts and a layout registry, repeatable groups, async options and scoped registries are included. Not in this first version: the DevTools panel.

### Patch Changes

- 4f64937: `MultiFieldInput` no longer brings back an edit that was just undone. It kept the user's last change for as long as the `properties` object it was made on was the one handed in, so an undo history that hands back that same object showed the undone change again. The change is now dropped as soon as other properties arrive, and stays dropped.
