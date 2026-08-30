---
'@dynamic-field-kit/angular': patch
'@dynamic-field-kit/core': patch
'@dynamic-field-kit/react': patch
'@dynamic-field-kit/vue': patch
---

Make the packages findable on npm, and point `homepage` at something worth
landing on.

The keyword lists were three entries long and two of those were the package's
own name — nobody searches `dynamic-field-kit/core`. npm ranks search partly on
keywords, so in practice these packages could only be found by someone who
already knew what they were called. The repository has carried the right
vocabulary as GitHub topics all along (`dynamic-forms`, `form-builder`,
`form-engine`, `form-validation`, `schema-driven`, `headless`, and the three
framework names); npm simply never saw any of it. Each package now carries that
vocabulary plus the terms its own users would type, including the schema
libraries it actually adapts — zod, yup, valibot and Standard Schema. Not JSON
Schema, which it does not support.

`homepage` pointed at the package's README on GitHub, which is the same text
npm already renders on the package page from the shipped README. It now points
at the live demo instead, where the forms actually run. The source stays one
click away in `repository`.
