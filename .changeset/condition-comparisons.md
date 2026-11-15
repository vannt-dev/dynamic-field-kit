---
'@dynamic-field-kit/core': minor
---

More comparisons for conditions written as data (`appearWhen`, `requiredWhen`, `disabledWhen`, `readOnlyWhen`): `gt`, `gte`, `lt` and `lte` compare numbers, with a numeric string such as `'18'` counting as its number on either side; `contains` and `notContains` look for a substring in a string (case-sensitive) or a member in an array (by value); `notIn` is true for a value that equals none of a list. None of them matches a value that is undefined or `null`, and anything that is not a number (`''`, `true`, a date string) never passes a numeric comparison; dates are not compared. `fieldsToJsonSchema` warns about a condition that uses one and leaves it out, since JSON Schema has no keyword with the same meaning. The adapters need no change: they evaluate conditions through core.
