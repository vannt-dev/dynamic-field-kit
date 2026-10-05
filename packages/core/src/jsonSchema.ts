import type { FieldDescription, Properties } from './types';
import { validators, type ValidatorFn } from './validators';

/** A JSON Schema document or sub-schema. Draft-07 and 2020-12 keywords are read. */
export type JsonSchema = { [keyword: string]: unknown } | boolean;

/** Something in the schema that did not become part of the form. */
export interface JsonSchemaWarning {
  /** Property path, with `[]` marking the items of an array: `contacts[].email`. */
  path: string;
  message: string;
}

export interface FieldsFromJsonSchemaOptions {
  /**
   * Patches merged over the generated field, keyed by the same path the
   * warnings use (`email`, `contacts[].email`). Use it to pick an
   * application-specific `type`, replace a label, or attach `appearCondition`
   * and other hooks a schema cannot express.
   */
  overrides?: Record<string, Partial<FieldDescription>>;
}

export interface FieldsFromJsonSchemaResult {
  fields: FieldDescription[];
  /** `default` values from the schema, shaped like the form data. */
  defaults: Properties;
  /** Properties and keywords that were skipped, so nothing is dropped silently. */
  warnings: JsonSchemaWarning[];
}

type SchemaObject = { [keyword: string]: unknown };

const STRING_FORMAT_TYPES: Record<string, FieldDescription['type']> = {
  email: 'email',
  'idn-email': 'email',
  date: 'date',
  time: 'time',
  'date-time': 'datetime-local',
  password: 'password',
};

// A chain of $ref this long is a cycle in every schema worth supporting.
const MAX_REF_DEPTH = 32;

function isObject(value: unknown): value is SchemaObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function without(schema: SchemaObject, ...keywords: string[]): SchemaObject {
  const copy = { ...schema };
  for (const keyword of keywords) {
    delete copy[keyword];
  }
  return copy;
}

/** `firstName`, `first_name` and `first-name` all become "First name". */
function humanize(name: string): string {
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-.]+/g, ' ')
    .trim()
    .toLowerCase();
  return words ? words[0].toUpperCase() + words.slice(1) : name;
}

/**
 * JSON Schema patterns are meant to be Unicode-aware, but plenty in the wild
 * only compile without the `u` flag (an escaped `\-`, for one), so fall back.
 */
function compilePattern(pattern: string): RegExp | undefined {
  for (const flags of ['u', '']) {
    try {
      return new RegExp(pattern, flags);
    } catch {
      // try the next flag set
    }
  }
  return undefined;
}

function resolvePointer(root: SchemaObject, ref: string): unknown {
  if (ref === '#') {
    return root;
  }
  if (!ref.startsWith('#/')) {
    return undefined;
  }
  let node: unknown = root;
  for (const raw of ref.slice(2).split('/')) {
    const key = decodeURIComponent(raw).replace(/~1/g, '/').replace(/~0/g, '~');
    if (!isObject(node) && !Array.isArray(node)) {
      return undefined;
    }
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

class Generator {
  readonly warnings: JsonSchemaWarning[] = [];

  constructor(
    private readonly root: SchemaObject,
    private readonly overrides: Record<string, Partial<FieldDescription>>,
  ) {}

  warn(path: string, message: string): void {
    this.warnings.push({ path, message });
  }

  /**
   * Follows local `$ref`s and folds `allOf` into one schema. Returns undefined
   * for a schema that cannot be read (`false`, a remote or broken reference).
   */
  resolve(schema: unknown, path: string, depth = 0): SchemaObject | undefined {
    if (schema === true) {
      return {};
    }
    if (!isObject(schema)) {
      return undefined;
    }
    let current = schema;
    const ref = asString(current.$ref);
    if (ref) {
      if (depth >= MAX_REF_DEPTH) {
        this.warn(path, `"$ref" chain is circular at ${ref}`);
        return undefined;
      }
      const pointed = resolvePointer(this.root, ref);
      if (pointed === undefined) {
        this.warn(
          path,
          ref.startsWith('#')
            ? `"$ref" ${ref} does not resolve`
            : `"$ref" ${ref} is not local; only "#/..." references are followed`,
        );
        return undefined;
      }
      // A failure further down the chain has already been reported there.
      const target = this.resolve(pointed, path, depth + 1);
      if (!target) {
        return undefined;
      }
      current = { ...target, ...without(current, '$ref') };
    }
    if (Array.isArray(current.allOf)) {
      const { allOf, ...rest } = current;
      let merged: SchemaObject = {};
      for (const member of [...allOf, rest]) {
        const part = this.resolve(member, path, depth + 1);
        if (!part) {
          continue;
        }
        merged = {
          ...merged,
          ...part,
          ...(isObject(merged.properties) || isObject(part.properties)
            ? {
                properties: {
                  ...(merged.properties as object),
                  ...(part.properties as object),
                },
              }
            : {}),
          ...(Array.isArray(merged.required) || Array.isArray(part.required)
            ? {
                required: [
                  ...((merged.required as unknown[]) ?? []),
                  ...((part.required as unknown[]) ?? []),
                ],
              }
            : {}),
        };
      }
      current = merged;
    }
    return current;
  }

  /** The schema's type, ignoring "null" in a nullable union. */
  typeOf(schema: SchemaObject): string | undefined {
    const declared = Array.isArray(schema.type)
      ? schema.type.find((item) => item !== 'null')
      : schema.type;
    if (typeof declared === 'string') {
      return declared;
    }
    if (isObject(schema.properties)) {
      return 'object';
    }
    if (schema.items !== undefined) {
      return 'array';
    }
    return undefined;
  }

  /**
   * Choices from `enum`, or from a `oneOf`/`anyOf` whose members are all
   * `const` (the JSON Schema idiom for an enum with labels).
   */
  optionsOf(schema: SchemaObject): Properties[] | undefined {
    if (Array.isArray(schema.enum)) {
      return schema.enum
        .filter((value) => value !== null)
        .map((value) => ({ label: String(value), value }));
    }
    const members = Array.isArray(schema.oneOf)
      ? schema.oneOf
      : Array.isArray(schema.anyOf)
        ? schema.anyOf
        : undefined;
    if (!members || members.length === 0) {
      return undefined;
    }
    const options: Properties[] = [];
    for (const member of members) {
      if (!isObject(member) || !('const' in member)) {
        return undefined;
      }
      if (member.const !== null) {
        options.push({
          label: asString(member.title) ?? String(member.const),
          value: member.const,
        });
      }
    }
    return options;
  }

  /** A nullable `anyOf: [X, { type: "null" }]` is read as X. */
  unwrapNullable(schema: SchemaObject, path: string): SchemaObject {
    const members = Array.isArray(schema.anyOf)
      ? schema.anyOf
      : Array.isArray(schema.oneOf)
        ? schema.oneOf
        : undefined;
    if (!members || this.optionsOf(schema)) {
      return schema;
    }
    const real = members.filter(
      (member) => !(isObject(member) && member.type === 'null'),
    );
    if (real.length !== 1) {
      return schema;
    }
    const inner = this.resolve(real[0], path);
    if (!inner) {
      return schema;
    }
    return { ...inner, ...without(schema, 'anyOf', 'oneOf') };
  }

  fieldsOf(
    schema: SchemaObject,
    basePath: string,
  ): { fields: FieldDescription[]; defaults: Properties } {
    const fields: FieldDescription[] = [];
    const defaults: Properties = {};
    const properties = isObject(schema.properties) ? schema.properties : {};
    const required = new Set(
      Array.isArray(schema.required) ? schema.required : [],
    );

    for (const [name, raw] of Object.entries(properties)) {
      const path = basePath ? `${basePath}.${name}` : name;
      const resolved = this.resolve(raw, path);
      if (!resolved) {
        if (raw === false) {
          this.warn(path, 'schema is `false`; the property is never valid');
        }
        continue;
      }
      const property = this.unwrapNullable(resolved, path);
      const field = this.fieldOf(
        name,
        property,
        path,
        required.has(name),
        defaults,
      );
      if (!field) {
        continue;
      }
      if (property.default !== undefined && !(name in defaults)) {
        defaults[name] = property.default;
      }
      const override = this.overrides[path];
      fields.push(override ? { ...field, ...override } : field);
    }
    return { fields, defaults };
  }

  fieldOf(
    name: string,
    schema: SchemaObject,
    path: string,
    required: boolean,
    defaults: Properties,
  ): FieldDescription | undefined {
    const type = this.typeOf(schema);
    const options = this.optionsOf(schema);
    const checks: ValidatorFn[] = required ? [validators.required()] : [];
    const field: FieldDescription = {
      name,
      type: 'text',
      label: asString(schema.title) ?? humanize(name),
    };
    if (required) {
      field.required = true;
    }
    const description = asString(schema.description);
    if (description) {
      field.description = description;
    }
    if (schema.readOnly === true) {
      field.readOnlyCondition = () => true;
    }

    if (options) {
      field.type = 'select';
      field.options = options;
    } else if (type === 'string') {
      this.stringField(field, schema, path, checks);
    } else if (type === 'number' || type === 'integer') {
      this.numberField(field, schema, path, type, checks);
    } else if (type === 'boolean') {
      field.type = 'checkbox';
    } else if (type === 'array') {
      if (!this.arrayField(field, schema, path, checks, defaults)) {
        return undefined;
      }
    } else if (type === 'object') {
      this.warn(
        path,
        'nested objects have no field; flatten the schema or describe the object as an array of one item',
      );
      return undefined;
    } else {
      this.warn(
        path,
        type
          ? `type "${type}" has no field`
          : 'schema has no "type", "enum" or constant "oneOf"; nothing to render',
      );
      return undefined;
    }

    if (checks.length > 0) {
      field.validate = validators.compose(...checks);
    }
    return field;
  }

  stringField(
    field: FieldDescription,
    schema: SchemaObject,
    path: string,
    checks: ValidatorFn[],
  ): void {
    const format = asString(schema.format);
    field.type = (format && STRING_FORMAT_TYPES[format]) || 'text';
    if (field.type === 'email') {
      checks.push(validators.email());
    }
    const minLength = asNumber(schema.minLength);
    if (minLength !== undefined && minLength > 0) {
      checks.push(validators.minLength(minLength));
    }
    const maxLength = asNumber(schema.maxLength);
    if (maxLength !== undefined) {
      checks.push(validators.maxLength(maxLength));
      field.props = { maxLength };
    }
    const pattern = asString(schema.pattern);
    if (pattern) {
      const regex = compilePattern(pattern);
      if (regex) {
        checks.push(validators.pattern(regex));
      } else {
        this.warn(
          path,
          `"pattern" ${pattern} is not a valid regular expression; not enforced`,
        );
      }
    }
  }

  numberField(
    field: FieldDescription,
    schema: SchemaObject,
    path: string,
    type: string,
    checks: ValidatorFn[],
  ): void {
    field.type = 'number';
    const minimum = asNumber(schema.minimum);
    if (minimum !== undefined) {
      field.min = minimum;
      checks.push(validators.min(minimum));
    }
    const maximum = asNumber(schema.maximum);
    if (maximum !== undefined) {
      field.max = maximum;
      checks.push(validators.max(maximum));
    }
    const step =
      asNumber(schema.multipleOf) ?? (type === 'integer' ? 1 : undefined);
    if (step !== undefined) {
      field.step = step;
    }
    for (const keyword of ['exclusiveMinimum', 'exclusiveMaximum']) {
      if (typeof schema[keyword] === 'number') {
        this.warn(
          path,
          `"${keyword}" is not enforced; add a validator through \`overrides\``,
        );
      }
    }
  }

  /** Returns false when the array has no field; a warning has been recorded. */
  arrayField(
    field: FieldDescription,
    schema: SchemaObject,
    path: string,
    checks: ValidatorFn[],
    defaults: Properties,
  ): boolean {
    const itemsPath = `${path}[]`;
    const resolvedItems =
      Array.isArray(schema.items) || schema.prefixItems !== undefined
        ? undefined
        : this.resolve(schema.items, itemsPath);
    if (!resolvedItems) {
      this.warn(
        path,
        'arrays need a single "items" schema; tuples and untyped arrays have no field',
      );
      return false;
    }
    const items = this.unwrapNullable(resolvedItems, itemsPath);
    const minItems = asNumber(schema.minItems);
    const maxItems = asNumber(schema.maxItems);

    const options = this.optionsOf(items);
    if (options) {
      field.type = 'select';
      field.multiple = true;
      field.options = options;
      // `required` already rejects an empty selection; a second message for
      // "at least one" would say the same thing twice.
      const coveredByRequired = minItems === 1 && checks.length > 0;
      if (minItems !== undefined && minItems > 0 && !coveredByRequired) {
        checks.push(validators.minLength(minItems));
      }
      if (maxItems !== undefined) {
        checks.push(validators.maxLength(maxItems));
      }
      return true;
    }

    if (this.typeOf(items) !== 'object') {
      this.warn(
        path,
        'arrays of free-form values have no field; use an array of objects (a repeatable group) or an "enum"',
      );
      return false;
    }

    const group = this.fieldsOf(items, itemsPath);
    field.fields = group.fields;
    if (Object.keys(group.defaults).length > 0) {
      field.defaultItem = group.defaults;
    }
    if (minItems !== undefined) {
      field.minItems = minItems;
    }
    if (maxItems !== undefined) {
      field.maxItems = maxItems;
    }
    // A group has no leaf value of its own to seed.
    if (
      schema.default === undefined &&
      minItems !== undefined &&
      minItems > 0
    ) {
      defaults[field.name] = Array.from({ length: minItems }, () => ({
        ...group.defaults,
      }));
    }
    return true;
  }
}

/**
 * Builds a field list from a JSON Schema object, so a form can be driven by
 * the schema an API already publishes.
 *
 * What is read: `properties` in their declared order, `required`, `title`,
 * `description`, `default`, `readOnly`, `enum`, constant `oneOf`/`anyOf`,
 * string `format` and length/pattern limits, numeric bounds and `multipleOf`,
 * arrays of objects (repeatable groups) and arrays of enums (multi-select),
 * local `$ref` and `allOf`.
 *
 * What is not: nested objects, tuples, conditional keywords (`if`/`then`,
 * `dependentRequired`) and remote references. Those are reported in
 * `warnings` rather than guessed at.
 *
 * The generated `validate` hooks use the built-in `validators`, so their
 * messages go through the form's message catalog like any other.
 */
export function fieldsFromJsonSchema(
  schema: JsonSchema,
  options: FieldsFromJsonSchemaOptions = {},
): FieldsFromJsonSchemaResult {
  if (!isObject(schema)) {
    throw new TypeError('fieldsFromJsonSchema expects a JSON Schema object');
  }
  const generator = new Generator(schema, options.overrides ?? {});
  const root = generator.resolve(schema, '');
  if (!root || generator.typeOf(root) !== 'object') {
    throw new TypeError(
      'fieldsFromJsonSchema expects a schema of type "object" with "properties"',
    );
  }
  const { fields, defaults } = generator.fieldsOf(root, '');
  return { fields, defaults, warnings: generator.warnings };
}
