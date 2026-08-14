---
'@dynamic-field-kit/vue': patch
---

Stop `MultiFieldInput` from pinning the whole package into every consumer
bundle.

`MultiFieldInput` renders itself recursively for repeatable groups, and reached
itself through a module-scope `multiFieldInputSelfRef = MultiFieldInput`
assignment. A bare top-level assignment is a side effect no bundler is allowed
to drop, so it anchored `MultiFieldInput` → `FieldInput` → `DynamicInput` →
`getDefaultRenderer` → every default renderer, even in an app that imported none
of them.

The self-reference is now a hoisted function declaration returning
`MultiFieldInput`. Its body is not evaluated until a group actually renders, so
nothing is retained until something uses it. The explicit return type keeps
TypeScript from having to infer `MultiFieldInput` from inside its own
initializer, which is what the forward-declared `let` was working around.

Measured with esbuild, minified, `vue` external:

| App imports            | Before   | After            |
| ---------------------- | -------- | ---------------- |
| one core helper        | 13,934 B | 2,479 B (−82%)   |
| `DynamicInput` only    | 13,934 B | 9,196 B (−34%)   |
| `MultiFieldInput` only | 13,944 B | 13,958 B (+14 B) |
| everything             | 20,530 B | 20,543 B (+13 B) |

Apps that pull in the whole surface pay 13–14 bytes for the wrapper function,
which is the honest cost of the change.

No behaviour or type change: `dist/index.d.ts` is byte-identical, and the vue
suite (115 tests, including the repeatable-group recursion) passes unchanged.
