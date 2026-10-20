---
'@dynamic-field-kit/angular': patch
---

The built-in fallback covers all fourteen field types the README lists, as in the React, Vue and Svelte adapters. `radio`, `range`, `file`, `date`, `time`, `datetime-local` and `switch` used to render "Unknown field type" when no renderer was registered. They now draw the same controls as the other adapters: a radio group (`role="radiogroup"`, named by its caption through `aria-labelledby`, a label per button, emitting the option's own value), a range that emits a number and starts at `min`, a file input that emits the `File` (an array for `multiple`, `null` when cleared), date and time inputs that emit the browser's ISO text, and a switch drawn as a checkbox. Each gets the label, `aria-invalid` and `aria-describedby` the other built-in controls have.
