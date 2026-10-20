// Translates declarative conditions to and from JSON Schema. Shared by
// `fieldsToJsonSchema` and `fieldsFromJsonSchema`, so what one writes the
// other reads back.
//
// Every field test is written as `{ required: [name], properties: { name: X } }`:
// listing the property in `required` makes the test false when the property
// is absent, which is how a form reads a missing value too (it is not equal to
// anything). A test that needs a missing value to count, `empty: true` or
// `notEquals`, is the negation of one that does not.

import type { FieldCondition } from './types';

type SchemaObject = { [keyword: string]: unknown };

/** What `empty: false` excludes: undefined is the property being absent. */
const EMPTY_VALUES: unknown[] = [null, '', []];
/** The JSON values that are falsy. */
const FALSY_VALUES: unknown[] = [false, 0, '', null];

function isObject(value: unknown): value is SchemaObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** `{ required: ['a'], properties: { a: { required: ['b'], properties: { b: leaf } } } }` */
function wrap(path: string, leaf: SchemaObject): SchemaObject {
  return path
    .split('.')
    .reduceRight<SchemaObject>(
      (inner, key) => ({ required: [key], properties: { [key]: inner } }),
      leaf,
    );
}

/**
 * The JSON Schema of a condition, valid in an `if` on the object that holds
 * the field. Undefined when it cannot be written there: a malformed
 * condition, or one reading the form root (`root: true`) from inside a group
 * or section, where the schema only sees the nested object.
 */
export function conditionToSchema(
  condition: FieldCondition,
  nested: boolean,
): SchemaObject | undefined {
  const c = condition as unknown;
  if (!isObject(c)) {
    return undefined;
  }
  const many = (key: 'all' | 'any', keyword: 'allOf' | 'anyOf') => {
    const parts = (c[key] as FieldCondition[]).map((part) =>
      conditionToSchema(part, nested),
    );
    return parts.every(Boolean) ? { [keyword]: parts } : undefined;
  };
  if (Array.isArray(c.all)) {
    return many('all', 'allOf');
  }
  if (Array.isArray(c.any)) {
    return many('any', 'anyOf');
  }
  if ('not' in c) {
    const inner = conditionToSchema(c.not as FieldCondition, nested);
    return inner && { not: inner };
  }
  if (typeof c.field !== 'string' || c.field === '') {
    return undefined;
  }
  if (c.root === true && nested) {
    return undefined;
  }
  const path = c.field;
  if ('equals' in c) {
    return wrap(path, { const: c.equals });
  }
  if ('notEquals' in c) {
    return { not: wrap(path, { const: c.notEquals }) };
  }
  if (Array.isArray(c.in)) {
    return wrap(path, { enum: c.in });
  }
  if (typeof c.truthy === 'boolean') {
    const truthy = wrap(path, { not: { enum: FALSY_VALUES } });
    return c.truthy ? truthy : { not: truthy };
  }
  if (typeof c.empty === 'boolean') {
    const filled = wrap(path, { not: { enum: EMPTY_VALUES } });
    return c.empty ? { not: filled } : filled;
  }
  return undefined;
}

/** The opposite condition, kept flat where a test has a natural opposite. */
export function negateCondition(condition: FieldCondition): FieldCondition {
  const c = condition as SchemaObject;
  if ('not' in c && Object.keys(c).length === 1) {
    return c.not as FieldCondition;
  }
  if (typeof c.field === 'string') {
    const target = {
      field: c.field,
      ...(c.root === true ? { root: true } : {}),
    };
    if ('equals' in c) {
      return { ...target, notEquals: c.equals };
    }
    if ('notEquals' in c) {
      return { ...target, equals: c.notEquals };
    }
    if (typeof c.truthy === 'boolean') {
      return { ...target, truthy: !c.truthy };
    }
    if (typeof c.empty === 'boolean') {
      return { ...target, empty: !c.empty };
    }
  }
  return { not: condition };
}

// Keywords that say nothing about the data.
const ANNOTATIONS = new Set(['$comment', 'title', 'description']);

function keywordsOf(schema: SchemaObject): string[] {
  return Object.keys(schema).filter((key) => !ANNOTATIONS.has(key));
}

/** One property's test inside an `if`. */
function propertyCondition(
  path: string,
  schema: unknown,
): FieldCondition | undefined {
  if (!isObject(schema)) {
    return undefined;
  }
  // `{ type: 'string', const: 'US' }` says no more than `{ const: 'US' }`.
  const keys = keywordsOf(schema).filter((key) => key !== 'type');
  if (keys.length === 1 && keys[0] === 'const') {
    return { field: path, equals: schema.const };
  }
  if (keys.length === 1 && keys[0] === 'enum' && Array.isArray(schema.enum)) {
    return { field: path, in: schema.enum };
  }
  if (keys.length === 1 && keys[0] === 'not' && isObject(schema.not)) {
    const inner = schema.not;
    const innerKeys = keywordsOf(inner);
    if (innerKeys.length === 1 && innerKeys[0] === 'const') {
      return { field: path, notEquals: inner.const };
    }
    if (innerKeys.length === 1 && innerKeys[0] === 'enum') {
      if (sameJson(inner.enum, EMPTY_VALUES)) {
        return { field: path, empty: false };
      }
      if (sameJson(inner.enum, FALSY_VALUES)) {
        return { field: path, truthy: true };
      }
    }
    return undefined;
  }
  // A nested object: `{ properties: { country: { const: 'US' } } }` under
  // `address` tests `address.country`.
  if (
    keys.every((key) => ['properties', 'required'].includes(key)) &&
    (schema.type === undefined || schema.type === 'object') &&
    isObject(schema.properties)
  ) {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define -- the two recurse into each other
    return schemaToCondition(schema, `${path}.`);
  }
  return undefined;
}

/**
 * Reads the schema of an `if` back as a condition: the shapes
 * `conditionToSchema` writes, plus the hand-written forms of them, such as an
 * `if` that names a property without listing it in `required` (read as if it
 * did: a form field always has a value to compare). Undefined for anything
 * else.
 */
export function schemaToCondition(
  schema: unknown,
  prefix = '',
): FieldCondition | undefined {
  if (!isObject(schema)) {
    return undefined;
  }
  const keys = keywordsOf(schema);
  if (keys.length === 1 && keys[0] === 'not') {
    const inner = schemaToCondition(schema.not, prefix);
    return inner && negateCondition(inner);
  }
  if (
    keys.length === 1 &&
    (keys[0] === 'allOf' || keys[0] === 'anyOf') &&
    Array.isArray(schema[keys[0]])
  ) {
    const parts = (schema[keys[0]] as unknown[]).map((part) =>
      schemaToCondition(part, prefix),
    );
    if (!parts.every(Boolean)) {
      return undefined;
    }
    const list = parts as FieldCondition[];
    return keys[0] === 'allOf' ? { all: list } : { any: list };
  }
  if (
    keys.length === 0 ||
    !keys.every((key) => ['properties', 'required', 'type'].includes(key)) ||
    (schema.type !== undefined && schema.type !== 'object')
  ) {
    return undefined;
  }
  const properties = isObject(schema.properties) ? schema.properties : {};
  const required = Array.isArray(schema.required) ? schema.required : [];
  const parts: FieldCondition[] = [];
  for (const [name, property] of Object.entries(properties)) {
    const part = propertyCondition(`${prefix}${name}`, property);
    if (!part) {
      return undefined;
    }
    parts.push(part);
  }
  for (const name of required) {
    if (typeof name !== 'string') {
      return undefined;
    }
    if (!(name in properties)) {
      parts.push({ field: `${prefix}${name}`, empty: false });
    }
  }
  if (parts.length === 0) {
    return undefined;
  }
  return parts.length === 1 ? parts[0] : { all: parts };
}

/** Whether two conditions are the same data. */
export function sameCondition(a: unknown, b: unknown): boolean {
  return sameJson(a, b);
}
