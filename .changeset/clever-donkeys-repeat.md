---
'@dynamic-field-kit/angular': patch
'@dynamic-field-kit/core': patch
'@dynamic-field-kit/react': patch
'@dynamic-field-kit/vue': patch
---

Close the remaining documentation gaps in each package README, so every public
export is described somewhere. README ships in the npm tarball, so this reaches
the package pages only through a release.

- **Sync vs async validation** is now spelled out in core, with the consequence
  that was previously implicit: `validateField` / `validateFields` cannot await,
  so a `validate` hook returning a Promise is treated as valid on the sync path.
  `useDynamicForm` and `createDynamicFormStore` validate synchronously
  (including on submit), so async rules have to run through
  `validateFieldsAsync` explicitly. Each adapter README repeats the caveat and
  links to the core section.
- Document `validateFieldAsync`, `validateFieldsAsync`, `resolveOptions` and
  `validators` in the react, vue and angular export lists, separated from each
  adapter's own exports so it is clear they are core re-exports.
- Document the core types that appear in every signature but had no definition
  in the README: `Properties`, `ValidatorFn`, `FieldValidatorResult`,
  `FieldValidatorFunction`, and `FormStep` alongside `WizardState`.
- Angular: document `layoutRegistry` / `LayoutRegistry`, the `ColumnLayout` /
  `RowLayout` / `GridLayout` components and `BaseInputComponent`, with a custom
  layout example. Its layout registry holds standalone components rather than
  render functions, which is the one place the three adapters genuinely differ,
  and it was the only adapter not documenting its registry at all.
- Rename angular's `## What it exports` to `## Exports` to match react and vue.
- Link the demo sub-routes: react's enterprise-features and wizard pages, and
  from core the per-framework demos plus the wizard it documents.
