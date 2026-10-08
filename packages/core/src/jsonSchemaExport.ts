import type { JsonSchemaWarning } from './jsonSchema';
import type { FieldDescription, Properties } from './types';

type SchemaObject = { [keyword: string]: unknown };

export interface FieldsToJsonSchemaOptions {
  /** `title` of the schema. */
  title?: string;
  /** `description` of the schema. */
  description?: string;
  /**
   * Form data to record as `default` values, shaped like the form: the same
   * object `fieldsFromJsonSchema` returns as `defaults`.
   */
  defaults?: Properties;
  /**
   * JSON Schema for field types this function does not know, keyed by `type`.
   * A custom `rating` field, for one: `{ rating: { type: 'integer' } }`. Also
   * replaces the schema of a built-in type.
   */
  types?: Record<string, SchemaObject>;
  /**
   * Schema keywords merged over the generated property, keyed by the path the
   * warnings use (`email`, `contacts[].email`). This is where rules that live
   * in a `validate` function go, since a function cannot be read back:
   * `{ username: { minLength: 3, pattern: '^[a-z]+$' } }`.
   */
  overrides?: Record<string, SchemaObject>;
  /**
   * Whether the object schemas forbid properties that are not fields.
   * Defaults to false, which leaves `additionalProperties` out.
   */
  strict?: boolean;
}

export interface FieldsToJsonSchemaResult {
  /** A JSON Schema (2020-12 vocabulary, also valid draft-07) of type `object`. */
  schema: SchemaObject;
  /** What the field list says that the schema could not, so nothing is dropped silently. */
  warnings: JsonSchemaWarning[];
}

/** Field types whose value is a string, with the `format` that says more. */
const STRING_TYPES: Record<string, string | undefined> = {
  text: undefined,
  textarea: undefined,
  search: undefined,
  tel: undefined,
  color: undefined,
  hidden: undefined,
  url: 'uri',
  email: 'email',
  password: 'password',
  date: 'date',
  time: 'time',
  'datetime-local': 'date-time',
};

const NUMBER_TYPES = new Set(['number', 'range']);
const BOOLEAN_TYPES = new Set(['checkbox', 'switch']);
const CHOICE_TYPES = new Set(['select', 'radio']);

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function isJsonValue(value: unknown): boolean {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}

class Exporter {
  readonly warnings: JsonSchemaWarning[] = [];

  constructor(private readonly options: FieldsToJsonSchemaOptions) {}

  warn(path: string, message: string): void {
    this.warnings.push({ path, message });
  }

  objectOf(
    fields: FieldDescription[],
    basePath: string,
    defaults: Properties | undefined,
  ): SchemaObject {
    const properties: SchemaObject = {};
    const required: string[] = [];
    for (const field of fields) {
      const path = basePath ? `${basePath}.${field.name}` : field.name;
      if (field.name in properties) {
        this.warn(
          path,
          'a field of this name is already in the schema; this one is skipped',
        );
        continue;
      }
      const property = this.propertyOf(field, path);
      if (!property) {
        continue;
      }
      const value = defaults?.[field.name];
      if (value !== undefined && !('default' in property)) {
        property.default = value;
      }
      const override = this.options.overrides?.[path];
      properties[field.name] = override
        ? { ...property, ...override }
        : property;
      if (field.required) {
        required.push(field.name);
      }
    }
    const schema: SchemaObject = { type: 'object', properties };
    if (required.length > 0) {
      schema.required = required;
    }
    if (this.options.strict) {
      schema.additionalProperties = false;
    }
    return schema;
  }

  /** `enum`, or `oneOf` of labelled constants when the labels say more than the values. */
  choicesOf(field: FieldDescription, path: string): SchemaObject | undefined {
    if (typeof field.options === 'function') {
      this.warn(
        path,
        'options come from a function; the schema accepts any value. List them through `overrides`',
      );
      return {};
    }
    if (!Array.isArray(field.options) || field.options.length === 0) {
      return undefined;
    }
    const choices: { value: unknown; label?: string }[] = [];
    for (const option of field.options) {
      const value = option?.value;
      if (!isJsonValue(value)) {
        this.warn(
          path,
          'an option without a string, number, boolean or null `value` is left out',
        );
        continue;
      }
      const label = option.label;
      choices.push({
        value,
        label: typeof label === 'string' && label !== '' ? label : undefined,
      });
    }
    const labelled = choices.some(
      (choice) =>
        choice.label !== undefined && choice.label !== String(choice.value),
    );
    if (!labelled) {
      return { enum: choices.map((choice) => choice.value) };
    }
    return {
      oneOf: choices.map((choice) =>
        choice.label === undefined
          ? { const: choice.value }
          : { const: choice.value, title: choice.label },
      ),
    };
  }

  propertyOf(field: FieldDescription, path: string): SchemaObject | undefined {
    const type = String(field.type);
    const property: SchemaObject = {};
    if (typeof field.label === 'string' && field.label !== '') {
      property.title = field.label;
    }
    if (typeof field.description === 'string' && field.description !== '') {
      property.description = field.description;
    }

    const custom = this.options.types?.[type];
    if (custom) {
      Object.assign(property, custom);
    } else if (Array.isArray(field.fields)) {
      this.groupOf(field, path, property);
    } else if (
      CHOICE_TYPES.has(type) ||
      (field.options !== undefined && !(type in STRING_TYPES))
    ) {
      const choices = this.choicesOf(field, path) ?? {};
      if (field.multiple) {
        property.type = 'array';
        property.items = choices;
        property.uniqueItems = true;
      } else {
        Object.assign(property, choices);
      }
    } else if (type in STRING_TYPES) {
      property.type = 'string';
      const format = STRING_TYPES[type];
      if (format) {
        property.format = format;
      }
      const maxLength = asNumber(field.props?.maxLength);
      if (maxLength !== undefined) {
        property.maxLength = maxLength;
      }
    } else if (NUMBER_TYPES.has(type)) {
      this.numberOf(field, property);
    } else if (BOOLEAN_TYPES.has(type)) {
      property.type = 'boolean';
    } else if (type === 'file') {
      this.warn(path, 'a file has no JSON value; the property is left out');
      return undefined;
    } else {
      this.warn(
        path,
        `type "${type}" is not a built-in; the schema accepts any value. Describe it through \`types\``,
      );
    }

    if (field.computeValue || field.readOnlyCondition) {
      // Both are functions: a computed value is always derived, a read-only
      // condition may be. `readOnly` is the closest a schema can say.
      if (field.computeValue) {
        property.readOnly = true;
      } else {
        this.warn(
          path,
          '`readOnlyCondition` is a function and is not in the schema',
        );
      }
    }
    if (field.appearCondition) {
      this.warn(
        path,
        '`appearCondition` is a function and is not in the schema; the property is always allowed',
      );
    }
    if (field.validate) {
      this.warn(
        path,
        '`validate` is a function and is not in the schema; add its rules through `overrides`',
      );
    }
    return property;
  }

  numberOf(field: FieldDescription, property: SchemaObject): void {
    const step = asNumber(field.step);
    const minimum = asNumber(field.min);
    const maximum = asNumber(field.max);
    const whole = (value: number | undefined) =>
      value === undefined || Number.isInteger(value);
    // A whole step from whole bounds only ever produces whole numbers.
    property.type =
      step !== undefined && Number.isInteger(step) && whole(minimum)
        ? 'integer'
        : 'number';
    if (minimum !== undefined) {
      property.minimum = minimum;
    }
    if (maximum !== undefined) {
      property.maximum = maximum;
    }
    if (
      step !== undefined &&
      step > 0 &&
      !(property.type === 'integer' && step === 1)
    ) {
      property.multipleOf = step;
    }
  }

  groupOf(field: FieldDescription, path: string, property: SchemaObject): void {
    const itemDefaults = field.defaultItem;
    property.type = 'array';
    property.items = this.objectOf(
      field.fields ?? [],
      `${path}[]`,
      itemDefaults,
    );
    if (typeof field.minItems === 'number') {
      property.minItems = field.minItems;
    }
    if (typeof field.maxItems === 'number') {
      property.maxItems = field.maxItems;
    }
  }
}

/**
 * Builds a JSON Schema from a field list: the reverse of
 * `fieldsFromJsonSchema`, for publishing the shape of a form's data to an API,
 * a validator on the server, or documentation.
 *
 * What is written: each field as a property, in order; `required`; `label` as
 * `title` and a string `description`; the value type and `format` of the
 * built-in field types; `min` / `max` / `step` of numbers; static `options`
 * as `enum`, or as `oneOf` of titled constants when the labels differ from
 * the values; `multiple` as an array; repeatable groups as arrays of objects
 * with `minItems` / `maxItems`; `defaults` as `default`.
 *
 * What cannot be: anything held in a function. `validate`, `appearCondition`,
 * `readOnlyCondition` and option loaders are reported in `warnings`, and the
 * rules behind them are added by hand through `overrides`.
 */
export function fieldsToJsonSchema(
  fields: FieldDescription[],
  options: FieldsToJsonSchemaOptions = {},
): FieldsToJsonSchemaResult {
  if (!Array.isArray(fields)) {
    throw new TypeError('fieldsToJsonSchema expects an array of fields');
  }
  const exporter = new Exporter(options);
  const body = exporter.objectOf(fields, '', options.defaults);
  const schema: SchemaObject = {};
  if (options.title) {
    schema.title = options.title;
  }
  if (options.description) {
    schema.description = options.description;
  }
  return { schema: { ...schema, ...body }, warnings: exporter.warnings };
}
