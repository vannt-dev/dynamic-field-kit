---
'@dynamic-field-kit/core': minor
'@dynamic-field-kit/react': minor
'@dynamic-field-kit/vue': minor
'@dynamic-field-kit/angular': minor
---

`ariaDescribedBy` is now `${id}-error` when a field has an error instead of
being hard-coded `undefined`, and `makeErrorId` is exported so a custom renderer
can put the matching id on its message element. Without this,
`focusFirstInvalidField` had nothing to find for anyone following the official
renderer recipe.

Default renderers now render the validation message they were already being
handed - the one visible change in this release. Custom renderers are untouched,
so nobody gets two copies of their own message.

Development builds now warn when `FieldDescription.props` carries a key the
renderer prop contract owns, which 1.6.0 made possible to lose silently.
