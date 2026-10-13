---
'@dynamic-field-kit/angular': patch
---

The built-in controls, used when no renderer is registered for a field type, are no longer drawn again on every change. Each change used to add a new input, textarea, select or checkbox to the page and leave the earlier ones there, so a form filled in with the built-in controls ended up with several copies of each field; the same happened to the HTML of a function renderer and to the "Unknown field type" message. A built-in control is now updated where it stands: it stays one element, keeps the focus while it is typed in, and a number that is still being typed (`1.50`) is not rewritten under the caret. Its `aria-describedby` is taken off again when the error it pointed at is gone.
