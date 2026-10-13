---
'@dynamic-field-kit/vue': patch
---

The built-in renderers no longer put what a form says about a field on the element as attributes. An input used to be rendered as `<input label="Name" touched="true" dirty="false" error="Field is required" description="…">`, because the renderers did not declare those props and Vue hands an undeclared prop on to the root element. `label`, `description`, `error`, `touched`, `dirty`, `options`, `optionsStatus` and `optionsError` are now declared on every built-in renderer. What is an attribute of the control still reaches it: `min`, `max`, `step`, `accept`, `multiple`, and a field's own `props` such as `maxlength`.
