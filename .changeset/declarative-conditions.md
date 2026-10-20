---
'@dynamic-field-kit/core': minor
'@dynamic-field-kit/react': minor
'@dynamic-field-kit/vue': minor
'@dynamic-field-kit/svelte': minor
'@dynamic-field-kit/angular': minor
---

Conditions as data. A field takes `appearWhen` and `requiredWhen`: a condition written as plain data, so a field list can be stored as JSON or sent from a server. A condition tests a value at the field's own level (`{ field: 'country', equals: 'US' }`, `notEquals`, `in: [...]`, `truthy`, `empty`; a dotted path reads deeper, `root: true` reads the top-level form) or combines others with `all`, `any` and `not`. `appearWhen` hides the field like `appearCondition`, which wins when both are set. `requiredWhen` passes `required: true` to the renderer and reports the `required` message for an empty value while it holds; `required: true` wins over it. Every adapter's `MultiFieldInput` reads `appearWhen` through core's new `resolveVisible`; core also exports `evaluateCondition` and `resolveRequired`. `fieldsToJsonSchema` writes both conditions as `if` / `then` instead of dropping them, and `fieldsFromJsonSchema` reads `dependentRequired` (and draft-07 `dependencies`) and `if` / `then` / `else` testing `const`, `enum` or presence back into them, so a field list survives the round trip. The adapters now import `resolveVisible` from core, so an adapter from this release needs core from this release too; upgrade them together.
