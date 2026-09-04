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

### Default renderers now show validation messages

**This is the one visible change in 1.7.0.** If a field uses the built-in
renderers — that is, you registered no renderer for its type — an invalid field
now renders

```html
<div id="<field id>-error" class="dfk-field-error" role="alert">…</div>
```

as a sibling of the control. Previously the default renderers were handed
`error` and dropped it, so the form showed nothing at all.

Custom renderers are **not** affected. The node is emitted only where a default
renderer was used, so nobody who renders their own message gets a second copy.

The node ships with no styling beyond that class hook. To keep the old silence:

```css
.dfk-field-error {
  display: none;
}
```

### `ariaDescribedBy` now has a value

It was hard-coded `undefined`. It is now `` `${id}-error` `` when the field has
an error, and `undefined` while it is valid.

If your renderer forwards `aria-describedby`, put the matching id on your
message element. `makeErrorId(id)` is exported from core and re-exported by all
three adapters:

| Before                                | After                                                       |
| ------------------------------------- | ----------------------------------------------------------- |
| `help={message}`                      | `help={<span id={makeErrorId(id)}>{message}</span>}`        |
| `aria-describedby` always `undefined` | bind `props.ariaDescribedBy` directly — no need to clear it |

This matters beyond screen readers: `focusFirstInvalidField` selects
`[aria-invalid="true"]`, so a renderer that never forwards `ariaInvalid` makes
that helper silently do nothing. See
[Forward the aria props](./ui-kit-recipes.md#forward-the-aria-props).

### Dev-mode warning when `props` shadows the contract

1.6.0 moved `placeholder`, `min`, `max`, `step`, `accept` and `multiple` to the
top level of `FieldDescription`. Values left behind in `props` were discarded
silently — no throw, no warning, the value just vanished.

A development-only `console.warn` now names the field and the key, once per
pair. Production builds are unchanged and emit nothing.

### Validation messages can be set per form

Previously the only way to change a built-in validator's message was to pass a
string on every field of every form. The validator baked that string in when the
field description was built, so nothing set later could reach it.

| Before                                                       | After                                                            |
| ------------------------------------------------------------ | ---------------------------------------------------------------- |
| `validators.required('Bắt buộc')` on every field             | `useDynamicForm({ fields, messages: { required: 'Bắt buộc' } })` |
| no way to change messages for a direct `validateFields` call | `setDefaultMessages(catalog)`                                    |

Fully backward compatible: a message passed to a validator still wins over any
catalog, and with no catalog the English defaults are unchanged.

`ValidationContext` — already the fourth argument to `validate`, carrying
`signal` — gains an optional `t`. A hand-written validator can use it to
translate its own messages. Nothing is required of existing validators.

### `validators.matches`

| Before                                                                            | After                                      |
| --------------------------------------------------------------------------------- | ------------------------------------------ |
| `validate: (value, data) => (value !== data.password ? 'Must match' : undefined)` | `validate: validators.matches('password')` |

Skips empty values so `required` owns that case rather than both firing at once,
and compares with `Object.is` so two `NaN`s match.
