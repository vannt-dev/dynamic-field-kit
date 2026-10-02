---
'@dynamic-field-kit/core': minor
---

`fieldsFromJsonSchema(schema, { overrides })` builds a field list from a JSON
Schema object and returns it with the schema's default values and a list of
warnings for anything it could not map.

It reads property order, `required`, `title`, `description`, `default`,
`readOnly`, `enum` and constant `oneOf`/`anyOf`, string formats and limits,
numeric bounds, arrays of objects (repeatable groups), arrays of enums
(multi-select), local `$ref`, `allOf` and nullable types. The generated
validators are the built-in ones, so their messages go through the form's
message catalog. Nested objects, tuples, free-form arrays, remote `$ref` and
exclusive bounds are reported in `warnings` rather than guessed at.
