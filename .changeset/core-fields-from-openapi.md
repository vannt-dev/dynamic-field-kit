---
'@dynamic-field-kit/core': minor
---

Add `fieldsFromOpenApi(doc, source, options?)`: builds the field list, defaults and warnings
from an OpenAPI 3.0 / 3.1 document, from the JSON request body of an operation (by `operationId`
or by `path` + `method`) or from a `components.schemas` entry. Local `$ref`s are resolved against
the whole document, `readOnly` properties are left out of a request body (`keepReadOnly` keeps
them), and an unknown operation, a body that is not JSON, or an external `$ref` throws with a
clear message. `fieldsFromJsonSchema` now also reports a boolean `exclusiveMinimum` /
`exclusiveMaximum` (draft-04, OpenAPI 3.0) as not enforced, as it already did for the numeric form.
