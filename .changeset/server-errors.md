---
'@dynamic-field-kit/core': minor
'@dynamic-field-kit/react': minor
'@dynamic-field-kit/vue': minor
'@dynamic-field-kit/svelte': minor
'@dynamic-field-kit/angular': minor
---

Errors from the server. Every form store (`useDynamicForm` in React and Vue, `createDynamicForm` in Svelte, `createDynamicFormStore` in Angular) gains `setServerErrors(errors)`, `clearServerErrors(name?)` and `serverErrors`: what a backend refused is shown in `errors` after a field's own errors, its fields are marked touched, and an error stays until the value it was about changes, until it is cleared or the form is reset, or until the next submit. `isValid` keeps speaking for the form's own rules. Core gains `serverErrorsFrom(body, { paths })`, which reads the usual response shapes (a field map, `errors` as a map or a list, Zod's `issues` and flattened error, JSON Pointers) into that map, and `FORM_ERROR_KEY` for errors that name no field.
