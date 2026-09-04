---
'@dynamic-field-kit/core': minor
'@dynamic-field-kit/react': minor
'@dynamic-field-kit/vue': minor
'@dynamic-field-kit/angular': minor
---

Validation messages can be set once per form via `useDynamicForm({ messages })`,
or process-wide via `setDefaultMessages`, instead of passing a string to every
validator on every field. Built-in validators now resolve their message when
they run rather than when the field description is built, which is what made a
catalog impossible before. A message passed directly to a validator still wins,
and the English defaults are unchanged when no catalog is supplied.

`ValidationContext` - already `validate`'s fourth argument - gains an optional
`t` resolver, so a hand-written validator can translate its own messages too.

Adds `validators.matches(otherFieldName)` for confirm-password and
confirm-email fields, which every consumer was hand-writing.

No locale bundles ship: the mechanism is here, the translations are yours.
