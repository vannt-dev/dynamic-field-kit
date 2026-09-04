# Migrating

Version-by-version tables of what changed and what to do about it. For the full
list of changes see each package's `CHANGELOG.md`.

## 1.6.x → 1.7.0

Everything here is additive or a bugfix. No API was removed, and no peer range
moved.

### Per-field `dirty` is now correct after a reset, and after a late load

`dirty` was measured against a baseline captured once at mount and never
reassigned. Two cases were wrong:

- after `reset(newValues)` every field compared against the **pre-reset**
  values, so fields the reset had just changed read as clean and fields it left
  alone read as dirty;
- on React and Vue, when `properties` arrived from a fetch **after** mount (the
  normal shape of an edit form) the baseline was `{}`, so every field reported
  `dirty: true` forever.

The baseline now comes from whoever owns the values.

| Before                                                                                               | After                                                                  |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `<MultiFieldInput properties={data} />` — baseline frozen at mount, `{}` if `data` was not ready yet | unchanged call; the baseline is the first non-`undefined` `properties` |
| no way to re-base the baseline                                                                       | `<MultiFieldInput initialProperties={original} />`                     |
| `form={form}` — baseline frozen at mount                                                             | unchanged call; the baseline follows `form.reset(newValues)`           |

**No change is required.** If you worked around this by remounting the form with
a changing `key`, you can drop the workaround.

Angular is the exception: it never had the late-load bug, because its `init()`
only records a baseline once `properties` is actually set. It did have the reset
bug. Since the Angular adapter has no `form` shorthand, pass the store's
baseline in explicitly:

```html
<dfk-multi-field-input
  [fieldDescriptions]="fields"
  [properties]="store.data()"
  [initialProperties]="store.baselineValues()"
/>
```

### `getDirtyValues()`

For PATCH-style submits that should carry only what the user actually edited.

| Before                                                                                                | After                                   |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `const changed = Object.fromEntries(Object.entries(form.data).filter(([k, v]) => v !== original[k]))` | `const changed = form.getDirtyValues()` |

Keys present in the data but absent from the baseline count as dirty. Comparison
is by `Object.is`, so a `NaN` numeric field does not read as permanently dirty.

### `baselineValues`

The values `dirty` is measured against, now exposed on the form store. React
returns a plain object, Vue a `Ref`, Angular a `Signal`.

This is **not** the same as the `initialValues` option: that option never
changes, while the baseline is replaced by `reset(newValues)`. They differ as
soon as a form is reset.

### React only: one fewer validation pass per keystroke

`useDynamicForm` validated the same data twice on every change — once eagerly in
`handleChange`, once again in an effect after commit. It now validates once.

Synchronous validators are pure by contract, so this is invisible unless you
were counting calls in a test or relying on a side effect inside a validator.
Vue and Angular were never affected; their stores run no watch or effect and
already validated exactly once.
