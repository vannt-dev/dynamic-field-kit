import type { FieldDescription, Properties } from './types';

/**
 * Runs every field's `computeValue` (if declared) against `data` and returns
 * the result. Only allocates a new object when a computed value actually
 * changes, so callers that rely on reference equality to skip re-renders
 * aren't defeated when no field declares `computeValue`.
 */
export function applyComputedValues(
  fieldDescriptions: FieldDescription[],
  data: Properties
): Properties {
  let next = data;
  for (const field of fieldDescriptions) {
    if (!field.computeValue) {
      continue;
    }
    const computed = field.computeValue(next);
    if (next[field.name] !== computed) {
      next = { ...next, [field.name]: computed };
    }
  }
  return next;
}
