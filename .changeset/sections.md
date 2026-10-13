---
'@dynamic-field-kit/core': minor
'@dynamic-field-kit/react': minor
'@dynamic-field-kit/vue': minor
'@dynamic-field-kit/svelte': minor
'@dynamic-field-kit/angular': minor
---

Sections. A field with `section: FieldDescription[]` is a titled section: `data[name]` is one object shaped by the nested fields, the non-repeating sibling of a group. Every adapter's `MultiFieldInput` renders it as a `<fieldset>` with `label` as its `<legend>`. Errors, pending rules and touched flags of the fields inside are keyed by path (`address.street`), `appearCondition` and `disabled` / `disabledCondition` on the section apply to all of it, and sections nest in groups and in each other. `validateFields`, `validateFieldsAsync` and `collectFieldPaths` look inside sections; `fieldsFromJsonSchema` now turns a nested object into a section instead of reporting it, and `fieldsToJsonSchema` writes a section as a nested object. Core gains `isFieldSection` and `sectionPathMap`. Sections need core and the adapter at 1.11 or newer.
