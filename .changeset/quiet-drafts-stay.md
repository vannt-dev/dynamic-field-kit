---
'@dynamic-field-kit/core': minor
---

`createFormDraft` keeps a form's data in storage between visits: `load()` for
the initial values, `save(data)` on change (debounced), `flush()` and
`clear()`. A draft carries a version and a timestamp, so one saved for an older
form shape or past `maxAgeMs` is discarded rather than loaded. Storage that is
missing or throws makes the draft do nothing instead of failing the form.

`draftExclusions(fields)` lists the top-level `password` and `file` fields, for
the `exclude` option.
