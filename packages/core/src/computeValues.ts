import type { FieldDescription, Properties } from './types';

function isDev(): boolean {
  return (
    typeof process !== 'undefined' &&
    !!process.env &&
    process.env.NODE_ENV !== 'production'
  );
}

function runComputePass(
  fieldDescriptions: FieldDescription[],
  data: Properties,
  rootData: Properties
): Properties {
  let next = data;
  for (const field of fieldDescriptions) {
    if (!field.computeValue) {
      continue;
    }
    const computed = field.computeValue(next, rootData);
    if (next[field.name] !== computed) {
      next = { ...next, [field.name]: computed };
    }
  }
  return next;
}

/**
 * Runs every field's `computeValue` (if declared) against `data` and returns
 * the result. Only allocates a new object when a computed value actually
 * changes, so callers that rely on reference equality to skip re-renders
 * aren't defeated when no field declares `computeValue`.
 *
 * `rootData` is passed as the second argument to each `computeValue`; it
 * defaults to `data` so top-level forms behave as before, while grouped fields
 * can receive the top-level data separately.
 */
export function applyComputedValues(
  fieldDescriptions: FieldDescription[],
  data: Properties,
  rootData: Properties = data
): Properties {
  const next = runComputePass(fieldDescriptions, data, rootData);

  // Single pass only (see FieldDescription.computeValue). In development, do a
  // throwaway second pass to detect fields that still change - a sign of an
  // order-dependent or cyclic computeValue chain that won't fully resolve.
  if (isDev()) {
    const settled = runComputePass(fieldDescriptions, next, rootData);
    for (const field of fieldDescriptions) {
      if (field.computeValue && settled[field.name] !== next[field.name]) {
        console.warn(
          `[dynamic-field-kit] computeValue for "${field.name}" did not ` +
            `converge in one pass. computeValue is evaluated once per change, ` +
            `not to a fixed point - reorder fields so each computed field only ` +
            `depends on fields declared before it, and avoid cycles.`
        );
        break;
      }
    }
  }

  return next;
}
