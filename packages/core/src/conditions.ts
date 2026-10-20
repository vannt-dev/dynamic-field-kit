import type { FieldCondition, FieldDescription, Properties } from './types';

function isDev(): boolean {
  return (
    typeof process !== 'undefined' &&
    !!process.env &&
    process.env.NODE_ENV !== 'production'
  );
}

// A condition is evaluated on every render and every keystroke's validation
// pass; one warning per broken condition is plenty.
const warnedConditions = new Set<string>();

/** Test-only. Clears the warn-once memo so each case starts from silence. */
export function __resetConditionWarnings(): void {
  warnedConditions.clear();
}

function warnUnreadable(condition: unknown): void {
  let key: string;
  try {
    key = JSON.stringify(condition) ?? String(condition);
  } catch {
    key = String(condition);
  }
  if (!isDev() || warnedConditions.has(key)) {
    return;
  }
  warnedConditions.add(key);
  console.warn(
    `[dynamic-field-kit] ${key} is not a condition: expected { field, equals | ` +
      `notEquals | in | truthy | empty }, { all: [...] }, { any: [...] } or ` +
      `{ not: ... }. It is treated as false.`,
  );
}

function isObject(value: unknown): value is Properties {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Undefined, null, `''` or `[]` - what `validators.required` rejects. */
export function isEmptyValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

/** Equality by value, the way JSON Schema compares `const` and `enum`. */
function sameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => sameValue(item, b[i]));
  }
  if (isObject(a) && isObject(b)) {
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length &&
      keys.every((key) => key in b && sameValue(a[key], b[key]))
    );
  }
  return false;
}

function readPath(data: Properties | undefined, path: string): unknown {
  let node: unknown = data;
  for (const key of path.split('.')) {
    if (!isObject(node)) {
      return undefined;
    }
    node = node[key];
  }
  return node;
}

/**
 * Evaluates a declarative condition. `data` is the data at the field's own
 * level and `rootData` the top-level form (defaulting to `data`), the same
 * pair `appearCondition` receives. A condition it cannot read is false, with
 * a warning in development.
 */
export function evaluateCondition(
  condition: FieldCondition,
  data: Properties,
  rootData: Properties = data,
): boolean {
  const c = condition as unknown;
  if (!isObject(c)) {
    warnUnreadable(c);
    return false;
  }
  if (Array.isArray(c.all)) {
    return (c.all as FieldCondition[]).every((part) =>
      evaluateCondition(part, data, rootData),
    );
  }
  if (Array.isArray(c.any)) {
    return (c.any as FieldCondition[]).some((part) =>
      evaluateCondition(part, data, rootData),
    );
  }
  if ('not' in c) {
    return !evaluateCondition(c.not as FieldCondition, data, rootData);
  }
  if (typeof c.field !== 'string' || c.field === '') {
    warnUnreadable(c);
    return false;
  }
  const value = readPath(c.root === true ? rootData : data, c.field);
  if ('equals' in c) {
    return sameValue(value, c.equals);
  }
  if ('notEquals' in c) {
    return !sameValue(value, c.notEquals);
  }
  if (Array.isArray(c.in)) {
    return c.in.some((candidate) => sameValue(value, candidate));
  }
  if (typeof c.truthy === 'boolean') {
    return Boolean(value) === c.truthy;
  }
  if (typeof c.empty === 'boolean') {
    return isEmptyValue(value) === c.empty;
  }
  warnUnreadable(c);
  return false;
}

/**
 * Whether a field is shown: `appearCondition` when it is set, else
 * `appearWhen`, else always. Hidden fields are not rendered, validated or
 * listed by `collectFieldPaths`.
 */
export function resolveVisible(
  field: FieldDescription,
  data: Properties,
  rootData?: Properties,
): boolean {
  if (field.appearCondition) {
    return field.appearCondition(data, rootData);
  }
  if (field.appearWhen !== undefined) {
    return evaluateCondition(field.appearWhen, data, rootData ?? data);
  }
  return true;
}

/** Effective required state: the static flag OR `requiredWhen`. */
export function resolveRequired(
  field: FieldDescription,
  data: Properties,
  rootData?: Properties,
): boolean {
  if (field.required === true) {
    return true;
  }
  return (
    field.requiredWhen !== undefined &&
    evaluateCondition(field.requiredWhen, data, rootData ?? data)
  );
}
