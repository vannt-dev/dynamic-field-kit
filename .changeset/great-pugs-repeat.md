---
'@dynamic-field-kit/core': minor
'@dynamic-field-kit/react': minor
'@dynamic-field-kit/vue': minor
'@dynamic-field-kit/angular': minor
---

Fix per-field `dirty`, which was measured against a baseline captured at mount
and never re-based - wrong after `reset(newValues)` on all three adapters, and
wrong on React and Vue for values that arrive after mount, where every field
reported dirty forever.

Adds `baselineValues` and `getDirtyValues()` to the form store on all three
adapters, and an `initialProperties` prop to `MultiFieldInput` for re-basing
without a store. Comparison moves from `!==` to `Object.is`, so a `NaN` numeric
field no longer reads as permanently dirty.

React's `useDynamicForm` no longer validates the same data twice per change.
