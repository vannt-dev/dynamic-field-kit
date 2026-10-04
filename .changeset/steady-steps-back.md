---
'@dynamic-field-kit/core': minor
---

`createFormHistory(initial, options)` adds undo and redo for a form's data:
`push(data)` on change, `undo()` and `redo()` return the data to put back,
`canUndo()`, `canRedo()`, `current()` and `reset(data)`. Edits to the same
fields within `coalesceMs` (default 500) become one step, the oldest steps go
past `limit` (default 100), and pushing the data it already holds is ignored,
so restoring a step does not record a new one.
