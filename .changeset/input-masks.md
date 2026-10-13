---
'@dynamic-field-kit/core': minor
'@dynamic-field-kit/react': minor
'@dynamic-field-kit/vue': minor
'@dynamic-field-kit/svelte': minor
'@dynamic-field-kit/angular': minor
---

Input masks. A field takes `mask`: a pattern such as `'(999) 999-9999'` (`9` a digit, `a` a letter, `*` either, anything else fixed) or a `{ format, parse }` pair. The renderer receives the formatted text as `value`, the form stores the unformatted value (`'5551234567'`), and validators, `computeValue`, drafts and `onSubmit` see that stored value. A separator appears with the character after it, a character that does not fit is neither stored nor left on screen, and Backspace on a separator removes the character before it. Renderers need no change. Core gains `createInputMask(pattern)` for the same formatting outside a form, the `InputMask` and `FieldMask` types, and `applyMask` / `parseInput` on `buildFieldRendererProps` for adapters; a mask takes effect when both core and the adapter are 1.11 or newer.
