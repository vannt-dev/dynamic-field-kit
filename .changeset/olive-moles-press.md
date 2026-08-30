---
---

No release needed. The repo moved from prettier 2 to 3, which reformatted
source, but nothing changed semantically.

`@dynamic-field-kit/core`, `react` and `vue` ship a byte-identical `dist` —
tsup/esbuild reprints from the AST, so source formatting never reaches the
bundle.

`@dynamic-field-kit/angular` is the exception: ng-packagr carries source
formatting into `fesm2022`, so its bundle differs by 36 lines, all cosmetic —
prettier 3 adds clarifying parentheses around `??` inside a ternary, adds
trailing commas to two object literals, and pulls a `</pre\n>` continuation
back onto one line. The `<pre>` element's content is unchanged (it ends at
`</` either way), and the angular suite passes unchanged at 91 tests. Those
bytes will ship with the next angular release that has a reason of its own;
they are not a reason.
