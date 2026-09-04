---
'@dynamic-field-kit/core': minor
'@dynamic-field-kit/react': minor
'@dynamic-field-kit/vue': minor
'@dynamic-field-kit/angular': minor
---

`options` can now return a promise, covering both dependent selects
(`optionsDeps`) and search-remote pickers (`onOptionsQuery`). Renderers receive
`optionsStatus` and `optionsError` alongside `options`.

`debounceMs` was declared on `FieldDescription`, published in the `.d.ts` and
read by no implementation anywhere - setting it did nothing. It now debounces
these loads.

Debounce, abort of a superseded request, and discarding a response that lands
out of order all live in core's `createOptionsLoader`, so the three adapters
share one implementation. Synchronous and static options are untouched and never
enter a loading state.
