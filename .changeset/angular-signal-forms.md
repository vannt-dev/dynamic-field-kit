---
'@dynamic-field-kit/angular': minor
---

Add `@dynamic-field-kit/angular/signal-forms`, an opt-in entry point for Angular 22+ that backs a
dynamic form with an Angular Signal Form. `createSignalFormStore` keeps the bindings
`<dfk-multi-field-input>` already uses (`data`, `errors`, `touched`, `handleChange`, `handleBlur`,
`handleSubmit`) and adds `form`, the Signal Forms field tree. `dynamicFieldsSchema(fields)` turns
the field descriptions' validation, visibility, disabled and read-only rules into a Signal Forms
schema. `@angular/forms` is a new optional peer dependency; the main entry point and
`createDynamicFormStore` do not change.
