---
'@dynamic-field-kit/core': minor
'@dynamic-field-kit/react': patch
'@dynamic-field-kit/vue': patch
'@dynamic-field-kit/svelte': patch
'@dynamic-field-kit/angular': patch
---

Built-in renderers are labelled. A field without a registered renderer now renders its `label` as a `<label for>` tied to the control (`id="{fieldId}-label"`, class `dfk-field-label`), so the control has an accessible name; a radio group gets `role="radiogroup"` and `aria-labelledby` pointing at its caption. In React, Vue and Svelte the label, the control and the error message sit in one `<div class="dfk-field">`, which keeps them together in a grid layout; in Angular the `<dfk-dynamic-input>` element that already holds them gets the class `dfk-field`. CSS that selected a built-in control as a direct child of the layout needs updating (see MIGRATING). Registered renderers are unaffected. In Angular, an error passed in by a form store now also sets `aria-describedby` on the control. Core gains `makeLabelId(id)`.
