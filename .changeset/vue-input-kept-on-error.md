---
'@dynamic-field-kit/vue': patch
---

Typing in a field that shows an error no longer loses the focus. With a built-in renderer, the input was built again whenever its error message appeared or went away, so with `validateOnChange` only the first character of what was typed arrived. `DynamicInput` now keeps the control mounted, and attributes given to it (`class`, `data-*`, listeners) reach the control whether or not an error is shown; before, they were dropped while one was.
