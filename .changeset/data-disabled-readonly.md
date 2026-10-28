---
'@dynamic-field-kit/core': minor
'@dynamic-field-kit/react': minor
'@dynamic-field-kit/vue': minor
'@dynamic-field-kit/svelte': minor
'@dynamic-field-kit/angular': minor
---

Disabled and read-only rules as data. A field takes `disabledWhen` and `readOnlyWhen`, the same kind of condition as `appearWhen` (`{ field: 'status', equals: 'closed' }`, `in`, `truthy`, `empty`, `root: true`, `all` / `any` / `not`), so a field list that locks fields can be stored as JSON. They are `disabledCondition` and `readOnlyCondition` written as data: `disabled: true` still disables, and a function wins over the rule when both are set. A disabled field, section or group is not validated. Core's `resolveDisabled` and `resolveReadOnly` read them; each adapter's section check evaluates `disabledWhen` itself, so it works with core 1.12 too. `fieldsToJsonSchema` warns about both and leaves them out, since JSON Schema cannot make `readOnly` depend on a value.
