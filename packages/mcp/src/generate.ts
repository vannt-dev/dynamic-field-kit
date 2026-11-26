import {
  fieldsFromJsonSchema,
  fieldsFromOpenApi,
  type FieldDescription,
  type FieldsFromJsonSchemaResult,
  type JsonSchemaWarning,
  type JsonSchema,
  type OpenApiDocument,
  type OpenApiSource,
} from '@dynamic-field-kit/core';

export interface ConfigFromOpenApiInput {
  /** The OpenAPI 3.0/3.1 document, as an object or a JSON string. */
  document: unknown;
  /** Pick the request body of this operation... */
  operationId?: string;
  /** ...or of this path and method... */
  path?: string;
  method?: string;
  /** ...or this entry of `components.schemas`. */
  schema?: string;
  /** Request body media type; defaults to the first JSON one. */
  mediaType?: string;
  /** Keep `readOnly` properties as locked fields instead of leaving them out. */
  keepReadOnly?: boolean;
}

export interface GeneratedConfig {
  /** The field list as JSON: what can be stored, sent or checked in. */
  fields: unknown[];
  /** `default` values from the schema, shaped like the form data. */
  defaults: Record<string, unknown>;
  /** What core skipped or could not express, so nothing is dropped silently. */
  warnings: JsonSchemaWarning[];
  /**
   * Function-valued keys core generated (the `validate` rules for `required`,
   * `minLength`, `format` and so on) that JSON cannot carry, by field path.
   * Call `fieldsFromOpenApi` / `fieldsFromJsonSchema` at runtime to keep them.
   */
  droppedFunctions: { path: string; key: string }[];
}

/** Thrown for input the caller can fix; the server reports it as a tool error. */
export class InputError extends Error {}

/** Accepts a parsed object, or JSON text of one. YAML has to be parsed first. */
export function parseJsonInput(value: unknown, what: string): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new InputError(
      `${what} is a string but not JSON (${(error as Error).message}). ` +
        'Pass the parsed object, or convert YAML to JSON first.',
    );
  }
}

function sourceOf(input: ConfigFromOpenApiInput): OpenApiSource {
  const picks = [
    input.operationId !== undefined,
    input.path !== undefined || input.method !== undefined,
    input.schema !== undefined,
  ].filter(Boolean).length;
  if (picks !== 1) {
    throw new InputError(
      'say which schema becomes the form: exactly one of "operationId", ' +
        '"path" with "method", or "schema" (a components.schemas name)',
    );
  }
  if (input.operationId !== undefined) {
    return { operationId: input.operationId };
  }
  if (input.schema !== undefined) {
    return { schema: input.schema };
  }
  if (input.path === undefined || input.method === undefined) {
    throw new InputError('"path" and "method" go together');
  }
  return { path: input.path, method: input.method };
}

/** Copies a field list without its functions, listing what was dropped. */
export function toJsonConfig(
  result: FieldsFromJsonSchemaResult,
): GeneratedConfig {
  const droppedFunctions: GeneratedConfig['droppedFunctions'] = [];
  const copy = (fields: FieldDescription[], at: string): unknown[] =>
    fields.map((field, index) => {
      const path = `${at}[${index}]`;
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(field)) {
        if (typeof value === 'function') {
          droppedFunctions.push({ path, key });
        } else if (
          (key === 'fields' || key === 'section') &&
          Array.isArray(value)
        ) {
          out[key] = copy(value, `${path}.${key}`);
        } else if (value !== undefined) {
          out[key] = value;
        }
      }
      return out;
    });
  return {
    fields: copy(result.fields, ''),
    defaults: result.defaults,
    warnings: result.warnings,
    droppedFunctions,
  };
}

/**
 * A field list for the request body of an OpenAPI operation, or a named
 * schema, through core's `fieldsFromOpenApi`.
 */
export function configFromOpenApi(
  input: ConfigFromOpenApiInput,
): FieldsFromJsonSchemaResult {
  const document = parseJsonInput(input.document, '"document"');
  const source = sourceOf(input);
  try {
    return fieldsFromOpenApi(document as OpenApiDocument, source, {
      mediaType: input.mediaType,
      keepReadOnly: input.keepReadOnly,
    });
  } catch (error) {
    // fieldsFromOpenApi throws for a document or source it cannot use (not
    // OpenAPI 3, unknown operationId, no JSON body); all of them are input.
    throw new InputError((error as Error).message);
  }
}

/** A field list for a JSON Schema, through core's `fieldsFromJsonSchema`. */
export function configFromJsonSchema(
  schema: unknown,
): FieldsFromJsonSchemaResult {
  const parsed = parseJsonInput(schema, '"schema"');
  try {
    return fieldsFromJsonSchema(parsed as JsonSchema);
  } catch (error) {
    throw new InputError((error as Error).message);
  }
}
