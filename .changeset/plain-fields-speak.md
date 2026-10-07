---
'@dynamic-field-kit/core': minor
---

Add `fieldsToJsonSchema(fields, options)`, the reverse of `fieldsFromJsonSchema`: it builds a JSON Schema of the data a field list collects. Built-in field types, `required`, labels, numeric bounds, static options, `multiple` and repeatable groups are written; anything held in a function (`validate`, `appearCondition`, option loaders) is reported in `warnings` and can be added through `overrides`.
