---
'@dynamic-field-kit/angular': minor
'@dynamic-field-kit/core': minor
'@dynamic-field-kit/react': minor
'@dynamic-field-kit/vue': minor
---

Make async validation answerable: a status you can act on, runs that cancel
cleanly, and touched state that reaches inside repeatable groups.

`ValidationResult` gains `complete` and `status` (`'valid' | 'invalid' |
'pending'`). Combining `valid` with `pending` was the only way to tell "nothing
is wrong" from "nothing is wrong _yet_", and everyone got it wrong the same
way — a `valid: true` with async rules still in flight reads as a green light.
`status` is the single answer; `complete` says whether every applicable
validator finished. Both are always present on a result the library returns, so
reading them needs no fallback; code that constructs a `ValidationResult` by
hand (a mock, a wrapper typed to return one) has to supply them.

`FieldDescription.validationMode: 'async'` declares a validator that returns a
Promise without the `async` keyword, which detection cannot see. Declaring it
keeps the synchronous pass from invoking the validator at all — and, unlike
detection, it is an explicit opt-in, so the dev warning about a field the live
pass cannot check stays quiet for it.

`validateFieldsAsync` now takes a `ValidationContext` and forwards its
`AbortSignal` to every validator, runs independent validators in parallel
instead of awaiting them one after another, skips validators once the signal is
aborted, and reports an aborted run as `complete: false` / `status: 'pending'`.
A validator that honours the signal the conventional way — rejecting with an
`AbortError` — no longer rejects the caller's `handleSubmit`; an error that is
not an abort still propagates.

Each adapter's form helper exposes `isValidating`, `isValidationComplete` and
`validationStatus`, and applies latest-run-wins: typing cancels an in-flight
live validation so a stale result cannot overwrite a newer one. A submit is not
collateral damage of that — it validates the snapshot the user submitted under
a controller of its own, so editing a field mid-flight no longer leaves the
form with the submit silently dropped, no `onValid`/`onInvalid`, and a button
that just re-enables.

`touchAll()` now expands to the concrete leaf paths that exist in the data
(`contacts[0].email`, not `contacts`) via the new `collectFieldPaths`, skipping
fields validation itself skips — hidden by `appearCondition`, or disabled.
Repeatable group items receive `touched` and report blur with their full path,
so a UI kit that only shows an error once a field is touched now works inside a
group. An item with no touched keys still receives a map rather than
`undefined`, which previously flipped the nested input into tracking touched by
itself and left it stale after the owner cleared the map. The new
`indexGroupPathMap` is what indexes those maps by item, exported so a custom
renderer can do the same without filtering the whole map per item.

React's `isValid` is now seeded from the initial data instead of from an
effect. An effect never runs on the server, so a server-rendered form shipped
`isValid: true` for an empty required field and never corrected it — a submit
button rendered enabled and stayed that way.

`@dynamic-field-kit/angular`'s `types` entry pointed at `dist/index.d.ts`,
which is not where its type declarations are emitted any more; it and the
`exports` block now point at the file that actually ships, so TypeScript
consumers resolve the package's types again.
