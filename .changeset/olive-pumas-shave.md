---
'@dynamic-field-kit/core': patch
'@dynamic-field-kit/react': patch
'@dynamic-field-kit/vue': patch
---

Let consumer bundlers drop the parts of the adapters an app does not use.

Components were declared as bare top-level calls — `defineComponent({...})` in
vue, `React.memo(...)` in react. A bundler cannot prove such a call is
side-effect free, so it has to evaluate it even when the result is unused, which
kept every default renderer and every component in an app's bundle no matter how
little of the package it imported. Marking those calls `/* @__PURE__ */` makes
them droppable. Measured with esbuild, minified, framework external:

| App imports                | Before   | After           |
| -------------------------- | -------- | --------------- |
| react: one core helper     | 11,149 B | 3,258 B (−71%)  |
| react: `DynamicInput` only | 11,150 B | 6,830 B (−39%)  |
| react: everything          | 17,601 B | unchanged       |
| vue: one core helper       | 17,379 B | 13,934 B (−20%) |
| vue: `DynamicInput` only   | 17,379 B | 13,934 B (−20%) |
| vue: everything            | 20,530 B | unchanged       |

Apps that use the whole surface are unchanged, which is the expected result —
there is nothing to drop. The shipped `dist` grows slightly (react +0.03 KB, vue
+0.29 KB) because the annotations are comments in the bundle; the trade is a
bigger published file for a smaller consumer bundle.

`@dynamic-field-kit/core` now declares `"sideEffects": false`. It has no
top-level execution at all — the only module-scope work is `new FieldRegistry()`
assigned to an export — so the claim is accurate, and it lets bundlers that rely
on the flag rather than their own analysis skip core entirely when it is unused.
The adapters deliberately do not set it: their entry side-effect-imports the
default layouts in order to register them.
