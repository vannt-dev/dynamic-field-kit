---
'@dynamic-field-kit/core': minor
'@dynamic-field-kit/react': minor
'@dynamic-field-kit/vue': minor
'@dynamic-field-kit/angular': minor
---

Add form state hooks, schema adapters, wizard engine, DevTools and extended renderers.

**Core**

- `zodValidator`, `yupValidator`, `valibotValidator` / `standardSchemaValidator`. Adapters parse **synchronously** so their result is usable by the synchronous `validateFields`; schemas with async refinements or async `.test()` rules return a Promise and must be validated through `validateFieldsAsync`.
- Adapters take an explicit `{ target: 'form' | 'field' }` option. `'form'` (the default) parses the form data object; `'field'` parses a single scalar value. The field-name shorthand — `zodValidator(schema, 'email')` — is unchanged.
- Wizard engine: `createWizardState`, `validateStep`, `canGoNext`, `canGoPrev`, plus the navigation the engine needs to be usable - `goNext`, `goPrev`, `goToStep`, `markStepCompleted`, `isStepCompleted`. `goNext` records the step it leaves, so `completedSteps` is actually maintained.
- Group array helpers: `moveGroupItem`, `swapGroupItems`, `insertGroupItem`, `focusFirstInvalidField`.
- `switch` is a first-class field type: it had a shipped renderer in react and vue but no `FieldTypeMap` entry, so `type: 'switch'` did not typecheck.

**React / Vue / Angular**

- `useDynamicForm` (React, Vue) and `createDynamicFormStore` (Angular Signals) now expose the same surface, including `isSubmitting` and `isSubmitted`.
- `handleSubmit(onValid, onInvalid)` returns a submit handler in every framework and calls `preventDefault` on the event it receives.
- Default HTML5 renderers for `radio`, `range`, `file`, `date`, `time`, `datetime-local` and `switch`.
- `DynamicFormDevTools` overlay for inspecting form data, errors, metadata and field descriptions, with an error-count badge in all three frameworks.
- `MultiFieldInput` reports blur through `onBlurField` (an `@Output` in Angular), so a form store's `handleBlur` / `touched` / `validateOnBlur` can be wired to it. Vue and Angular previously had no blur plumbing at all.
