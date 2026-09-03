---
'@dynamic-field-kit/angular': minor
'@dynamic-field-kit/core': minor
'@dynamic-field-kit/react': minor
'@dynamic-field-kit/vue': minor
---

Give every adapter one renderer-prop contract, unique field ids, and a touched
state the form store can actually drive.

Five things went wrong at once for anyone building a real form on 1.5.1, and
four of them share a cause: `FieldRendererProps` was a type nobody enforced.
Each adapter hand-wrote the object it handed the registered renderer, and the
three lists drifted. React dropped `placeholder`, `min`, `max`, `step`,
`accept` and `multiple`. Vue dropped `required`, `id`, `dirty` and the aria
flags. Angular dropped `touched`, `dirty` and `id` — so an Angular renderer had
no way to know whether a field had been touched, and "only show the error once
the user leaves the field" had to be rebuilt by hand. Setting
`placeholder` on a `FieldDescription` therefore did nothing at all on React and
Vue: no error, no warning, the value simply vanished. Core now owns the list as
`FIELD_RENDERER_PROP_KEYS` and builds the bag once in
`buildFieldRendererProps`, which all three adapters call, and
`scripts/check-renderer-prop-parity.js` fails the build if an adapter stops
forwarding one. The single deliberate deviation is Vue's `class` in place of
`className`: forwarding `className` lets it fall through to a renderer's root
element, where Vue assigns `el.className` and wipes the class the renderer set
on itself.

Field ids were `dfk-field-${name}`, derived from the field name alone. Two
forms holding a field of the same name — a create form beside an edit form, the
most ordinary layout there is — emitted the same DOM id twice, which is invalid
HTML and leaves every `label[for]` pointing at two inputs. Ids are now
namespaced per `MultiFieldInput` instance (React `useId`, so it is SSR-safe;
Vue's instance uid; a counter on Angular). Set `idPrefix` to pin them —
`idPrefix="dfk-field"` reproduces the old ids exactly — or give a single field
its own id with the new `FieldDescription.id`.

Touched state had two independent trackers that never met: the one in
`useDynamicForm`, and a private one inside `MultiFieldInput` that only blur
could set and that was the one renderers actually saw. So
`setFieldTouched` in an `onInvalid` handler changed nothing visible, submitting
a form nobody had focused showed no errors at all (the button looked broken),
and `reset()` could not clear the touched state a previous submit had left
behind. `MultiFieldInput` now accepts `touched` as a controlled prop —
`useDynamicForm` becomes the single source of truth for it, exactly as
`properties`/`onChange` already were for data — plus `onTouchedChange`, and a
`form` shorthand (React and Vue) that wires data, change, blur and touched in
one prop. `handleSubmit` marks every field touched before validating, and the
new `touchAll()`/`resetTouched()` sit alongside it. Omit `touched` and the old
internal tracker still runs, so nothing breaks; for that mode a ref
(`resetTouched()` on React and Vue, a public method on Angular) can clear it
without remounting the component.

The only behaviour change to watch for is the generated ids. Anything pinned to
a literal `dfk-field-*` id in CSS or a test needs either `idPrefix="dfk-field"`
or a per-field `id`. Angular's `MultiFieldInput` also loses four undocumented
template helpers — `getResolvedOptions`, `getDisabled`, `getReadOnly` and
`getError` — which its own template no longer calls now that `FieldInput`
resolves all of it through core. Keeping a second copy of that logic beside the
shared one is how the adapters drifted apart to begin with; the equivalents are
`resolveOptions`, `resolveDisabled`, `resolveReadOnly` and `validateField`,
already re-exported from this package.

Form validity now reflects current data immediately instead of merely checking
the lazily populated `errors` map. The error map remains lazy for display, and
passing a form binding (or the new controlled `errors` input) makes that same
map the renderer's source of truth, removing the previous timing mismatch.

Promise-based validators are no longer silently accepted on submit.
`validateFields` reports unresolved field names in `pending`; every framework
form helper uses one async-capable validation pass before dispatching submit
callbacks. React, Vue and Angular also expose
`validateAsync()` for explicit pre-submit checks. Live `isValid` remains a
synchronous answer because a property/computed/signal cannot await.

The new UI-kit recipes show complete touched/error wiring for Ant Design,
Vuetify and Angular Material.
