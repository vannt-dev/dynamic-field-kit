import {
  negateCondition,
  sameCondition,
  schemaToCondition,
} from './jsonSchemaConditions';
import type { FieldCondition, FieldDescription, Properties } from './types';
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

/** One `if` with its `then` and `else`, wherever in the schema it was found. */
interface Conditional {
  if: unknown;
  then?: unknown;
  else?: unknown;
}

// Folding `allOf` into one schema spreads each member over the last, so a
// second `if` would overwrite the first. They are gathered here instead, on a
// key no schema can spell.
const CONDITIONALS = Symbol('conditionals');

function conditionalsOf(schema: SchemaObject): Conditional[] {
  const gathered =
    ((schema as Record<symbol, unknown>)[CONDITIONALS] as
      Conditional[] | undefined) ?? [];
  return schema.if === undefined
    ? gathered
    : [...gathered, { if: schema.if, then: schema.then, else: schema.else }];
}

/**
 * `dependentRequired`, and the array form of draft-07 `dependencies`: each
 * property listed under a trigger is required once the trigger has a value.
 */
function dependentRequiredOf(schema: SchemaObject): Record<string, unknown[]> {
  const result: Record<string, unknown[]> = {};
  for (const keyword of ['dependencies', 'dependentRequired']) {
    const map = schema[keyword];
    if (!isObject(map)) {
      continue;
    }
    for (const [trigger, names] of Object.entries(map)) {
      if (Array.isArray(names)) {
        result[trigger] = [...(result[trigger] ?? []), ...names];
      }
    }
  }
  return result;
}

/** `true` or `{}`: a property that allows anything, holding a place. */
function isPlaceholder(schema: unknown): boolean {
  return (
    schema === true || (isObject(schema) && Object.keys(schema).length === 0)
  );
}

/**
 * `fieldsToJsonSchema` writes the `requiredWhen` of a conditionally shown
 * field as "shown and the condition", since a schema cannot skip a hidden
 * property the way validation does. Reading it back, the "shown" part is the
 * field's own `appearWhen` and says nothing more.
 */
function withoutVisibility(
  condition: FieldCondition,
  appear: FieldCondition | undefined,
): FieldCondition {
  if (!appear || !('all' in condition)) {
    return condition;
  }
  const rest = condition.all.filter((part) => !sameCondition(part, appear));
  if (rest.length === condition.all.length || rest.length === 0) {
    return condition;
  }
  return rest.length === 1 ? rest[0] : { all: rest };
}

interface ObjectConditions {
  /** Properties defined under `then` / `else`, shown while the branch applies. */
  appear: Map<
    string,
    { condition: FieldCondition; schema: unknown; required: boolean }
  >;
  requiredWhen: Map<string, FieldCondition>;
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
      const conditionals: Conditional[] = [];
      const dependent: Record<string, unknown[]> = {};
      for (const member of [...allOf, rest]) {
        const part = this.resolve(member, path, depth + 1);
        if (!part) {
          continue;
        }
        conditionals.push(...conditionalsOf(part));
        for (const [trigger, names] of Object.entries(
          dependentRequiredOf(part),
        )) {
          dependent[trigger] = [...(dependent[trigger] ?? []), ...names];
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
      for (const keyword of [
        'if',
        'then',
        'else',
        'dependencies',
        'dependentRequired',
      ]) {
        delete merged[keyword];
      }
      if (Object.keys(dependent).length > 0) {
        merged.dependentRequired = dependent;
      }
      (merged as Record<symbol, unknown>)[CONDITIONALS] = conditionals;
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
    const rules = this.conditionsOf(schema, basePath, properties);

    const add = (name: string, raw: unknown, isRequired: boolean) => {
      const path = basePath ? `${basePath}.${name}` : name;
      const resolved = this.resolve(raw, path);
      if (!resolved) {
        if (raw === false) {
          this.warn(path, 'schema is `false`; the property is never valid');
        }
        return;
      }
      const property = this.unwrapNullable(resolved, path);
      const field = this.fieldOf(name, property, path, isRequired, defaults);
      if (!field) {
        return;
      }
      if (property.default !== undefined && !(name in defaults)) {
        defaults[name] = property.default;
      }
      const appear = rules.appear.get(name);
      if (appear) {
        field.appearWhen = appear.condition;
      }
      const requiredWhen = rules.requiredWhen.get(name);
      if (requiredWhen && !field.required) {
        field.requiredWhen = withoutVisibility(requiredWhen, field.appearWhen);
      }
      const override = this.overrides[path];
      fields.push(override ? { ...field, ...override } : field);
    };

    const placed = new Set<string>();
    for (const [name, raw] of Object.entries(properties)) {
      const appear = rules.appear.get(name);
      if (appear && isPlaceholder(raw)) {
        // `true` holds the place of a property defined under `then`.
        add(name, appear.schema, required.has(name) || appear.required);
        placed.add(name);
      } else {
        add(name, raw, required.has(name));
      }
    }
    // Properties that exist only under `then` / `else` come after the rest.
    for (const [name, appear] of rules.appear) {
      if (!placed.has(name) && !(name in properties)) {
        add(name, appear.schema, appear.required);
      }
    }
    return { fields, defaults };
  }

  /**
   * Reads `if` / `then` / `else` and `dependentRequired` on one object into
   * the conditions of its fields. What it cannot read is reported and left
   * out, as all of it was before conditions were read.
   */
  conditionsOf(
    schema: SchemaObject,
    basePath: string,
    properties: SchemaObject,
  ): ObjectConditions {
    const appear: ObjectConditions['appear'] = new Map();
    const requiredWhen: ObjectConditions['requiredWhen'] = new Map();
    const where = basePath || '(root)';
    const pathOf = (name: string) => (basePath ? `${basePath}.${name}` : name);
    const requireWhen = (name: string, condition: FieldCondition) => {
      const known = requiredWhen.get(name);
      if (!known) {
        requiredWhen.set(name, condition);
      } else if ('any' in known && Object.keys(known).length === 1) {
        requiredWhen.set(name, { any: [...known.any, condition] });
      } else {
        requiredWhen.set(name, { any: [known, condition] });
      }
    };

    for (const [trigger, names] of Object.entries(
      dependentRequiredOf(schema),
    )) {
      for (const name of names) {
        if (typeof name === 'string') {
          requireWhen(name, { field: trigger, empty: false });
        }
      }
    }

    const branch = (value: unknown, condition: FieldCondition, key: string) => {
      if (value === undefined) {
        return;
      }
      if (!isObject(value)) {
        this.warn(where, `"${key}" is not an object; ignored`);
        return;
      }
      const extra = Object.keys(value).filter(
        (keyword) => !['properties', 'required'].includes(keyword),
      );
      if (extra.length > 0) {
        this.warn(
          where,
          `"${key}" holds ${extra.map((k) => `"${k}"`).join(', ')}; ` +
            'only "required" and the "properties" it adds are read',
        );
      }
      const listed = Array.isArray(value.required) ? value.required : [];
      const defined = isObject(value.properties) ? value.properties : {};
      for (const [name, property] of Object.entries(defined)) {
        if (name in properties && !isPlaceholder(properties[name])) {
          this.warn(
            pathOf(name),
            `"${key}" adds rules to a property that is always there; they are not applied`,
          );
          continue;
        }
        if (appear.has(name)) {
          this.warn(
            pathOf(name),
            'the property is defined under more than one "if"; the first is used',
          );
          continue;
        }
        appear.set(name, {
          condition,
          schema: property,
          required: listed.includes(name),
        });
      }
      for (const name of listed) {
        if (typeof name === 'string' && !(name in defined)) {
          requireWhen(name, condition);
        }
      }
    };

    for (const conditional of conditionalsOf(schema)) {
      const condition = schemaToCondition(conditional.if);
      if (!condition) {
        this.warn(
          where,
          '"if" is not a test of property values this kit can read; its "then" and "else" are ignored',
        );
        continue;
      }
      branch(conditional.then, condition, 'then');
      branch(conditional.else, negateCondition(condition), 'else');
    }
    return { appear, requiredWhen };
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
      if (!this.sectionField(field, schema, path, checks, defaults)) {
        return undefined;
      }
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

  /** Returns false when the object has no field; a warning has been recorded. */
  sectionField(
    field: FieldDescription,
    schema: SchemaObject,
    path: string,
    checks: ValidatorFn[],
    defaults: Properties,
  ): boolean {
    if (
      !isObject(schema.properties) ||
      Object.keys(schema.properties).length === 0
    ) {
      this.warn(
        path,
        'an object without "properties" has no field; list its properties or leave it out',
      );
      return false;
    }
    const nested = this.fieldsOf(schema, path);
    field.section = nested.fields;
    // A section has no value of its own to check: the rules of the fields
    // inside it are the ones that speak.
    checks.length = 0;
    if (
      schema.default === undefined &&
      Object.keys(nested.defaults).length > 0
    ) {
      defaults[field.name] = nested.defaults;
    }
    return true;
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
 * nested objects (sections), local `$ref` and `allOf`.
 *
 * Conditions: `dependentRequired` (and the array form of draft-07
 * `dependencies`) becomes `requiredWhen`. An `if` that tests property values
 * (`const`, `enum`, presence, combined with `allOf` / `anyOf` / `not`)
 * becomes `requiredWhen` for the names its `then` / `else` list in
 * `required`, and `appearWhen` for the properties they add.
 *
 * What is not: tuples, other conditional keywords, a `then` that changes a
 * property which is always there, and remote references. Those are reported
 * in `warnings` rather than guessed at.
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
