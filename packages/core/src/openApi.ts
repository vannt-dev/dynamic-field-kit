import {
  fieldsFromSchemaIn,
  type FieldsFromJsonSchemaOptions,
  type FieldsFromJsonSchemaResult,
} from './jsonSchema';

/** An OpenAPI 3.0 or 3.1 document, parsed from JSON or YAML. */
export type OpenApiDocument = { [key: string]: unknown };

/**
 * Which schema of the document becomes the form: the JSON request body of an
 * operation, found by its `operationId` or by its path and method, or a named
 * entry of `components.schemas`.
 */
export type OpenApiSource =
  | { operationId: string }
  | { path: string; method: string }
  | { schema: string };

export interface FieldsFromOpenApiOptions extends FieldsFromJsonSchemaOptions {
  /**
   * The request body media type to read. By default `application/json`, or
   * else the first JSON one the operation lists (`application/merge-patch+json`).
   */
  mediaType?: string;
  /**
   * `readOnly` properties are set by the server and do not belong in a request,
   * so they are left out. Set this to keep them as locked fields instead.
   */
  keepReadOnly?: boolean;
}

type Node = { [key: string]: unknown };

const METHODS = [
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
];

function isObject(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonMediaType(mediaType: string): boolean {
  const essence = mediaType.split(';')[0].trim().toLowerCase();
  return essence === 'application/json' || /\/[^/]*\+json$/.test(essence);
}

function pointer(doc: Node, ref: string): unknown {
  let node: unknown = doc;
  for (const raw of ref.slice(2).split('/')) {
    const key = decodeURIComponent(raw).replace(/~1/g, '/').replace(/~0/g, '~');
    if (!isObject(node)) {
      return undefined;
    }
    node = node[key];
  }
  return node;
}

/**
 * Follows the `$ref` of a path item, request body or schema. Only references
 * inside the document are read; an external one throws rather than producing
 * a form with holes in it.
 */
function follow(doc: Node, value: unknown, what: string): unknown {
  let current = value;
  for (
    let depth = 0;
    isObject(current) && current.$ref !== undefined;
    depth++
  ) {
    const ref = current.$ref;
    if (typeof ref !== 'string' || !ref.startsWith('#/')) {
      throw new Error(
        `fieldsFromOpenApi: ${what} has the $ref ${JSON.stringify(ref)}, which ` +
          'points outside the document. External references are not supported; ' +
          'bundle the document into one file first.',
      );
    }
    if (depth >= 32) {
      throw new Error(`fieldsFromOpenApi: ${what} has a circular $ref ${ref}`);
    }
    const target = pointer(doc, ref);
    if (target === undefined) {
      throw new Error(
        `fieldsFromOpenApi: ${what} has the $ref ${ref}, which does not resolve`,
      );
    }
    current = target;
  }
  return current;
}

interface Operation {
  /** How errors name it: `createPet` or `POST /pets`. */
  label: string;
  node: Node;
}

function findOperation(
  doc: Node,
  source: { operationId: string } | { path: string; method: string },
): Operation {
  const paths = isObject(doc.paths) ? doc.paths : {};
  if ('operationId' in source) {
    const known: string[] = [];
    for (const [path, rawItem] of Object.entries(paths)) {
      const item = follow(doc, rawItem, `path "${path}"`);
      if (!isObject(item)) {
        continue;
      }
      for (const method of METHODS) {
        const operation = item[method];
        if (!isObject(operation) || typeof operation.operationId !== 'string') {
          continue;
        }
        if (operation.operationId === source.operationId) {
          return {
            label: `operation "${source.operationId}"`,
            node: operation,
          };
        }
        known.push(operation.operationId);
      }
    }
    throw new Error(
      `fieldsFromOpenApi: no operation has the operationId "${source.operationId}"` +
        (known.length > 0
          ? `; the document has ${known.map((id) => `"${id}"`).join(', ')}`
          : ''),
    );
  }

  const method = source.method.toLowerCase();
  const label = `${method.toUpperCase()} ${source.path}`;
  if (!METHODS.includes(method)) {
    throw new Error(
      `fieldsFromOpenApi: "${source.method}" is not an HTTP method OpenAPI describes`,
    );
  }
  if (!(source.path in paths)) {
    throw new Error(
      `fieldsFromOpenApi: the document has no path "${source.path}". ` +
        'Use the template exactly as it is written there ("/pets/{petId}").',
    );
  }
  const item = follow(doc, paths[source.path], `path "${source.path}"`);
  const operation = isObject(item) ? item[method] : undefined;
  if (!isObject(operation)) {
    throw new Error(
      `fieldsFromOpenApi: the document has no operation ${label}`,
    );
  }
  return {
    label:
      typeof operation.operationId === 'string'
        ? `operation "${operation.operationId}"`
        : `operation ${label}`,
    node: operation,
  };
}

function requestBodySchema(
  doc: Node,
  operation: Operation,
  mediaType: string | undefined,
): unknown {
  const body = follow(
    doc,
    operation.node.requestBody,
    `the request body of ${operation.label}`,
  );
  if (!isObject(body)) {
    throw new Error(
      `fieldsFromOpenApi: ${operation.label} has no request body`,
    );
  }
  const content = isObject(body.content) ? body.content : {};
  const types = Object.keys(content);
  const chosen = mediaType
    ? types.find((type) => type.toLowerCase() === mediaType.toLowerCase())
    : (types.find(
        (type) =>
          type.split(';')[0].trim().toLowerCase() === 'application/json',
      ) ?? types.find(isJsonMediaType));
  const accepts = types.length > 0 ? types.join(', ') : 'no media type';
  if (!chosen) {
    throw new Error(
      mediaType
        ? `fieldsFromOpenApi: the request body of ${operation.label} has no ` +
            `"${mediaType}" content (it accepts ${accepts})`
        : `fieldsFromOpenApi: the request body of ${operation.label} is not JSON (it accepts ${accepts}). ` +
            'Only application/json and other +json media types are read; pass `mediaType` to pick one.',
    );
  }
  const media = content[chosen];
  if (!isObject(media) || media.schema === undefined) {
    throw new Error(
      `fieldsFromOpenApi: the "${chosen}" request body of ${operation.label} has no schema`,
    );
  }
  return media.schema;
}

/**
 * Builds a field list from an OpenAPI 3.0 or 3.1 document: the JSON request
 * body of one operation, or one schema under `components.schemas`.
 *
 * The schema is read by `fieldsFromJsonSchema`, with `$ref`s resolved against
 * the whole document (`#/components/schemas/Pet`), so everything that reads
 * applies here too, and the result has the same `fields`, `defaults` and
 * `warnings`. Both dialects are read: `nullable: true` (3.0) and type arrays
 * such as `["string", "null"]` (3.1), and `exclusiveMinimum` as a boolean (3.0)
 * or a number (3.1), which is reported rather than enforced.
 *
 * `readOnly` properties are left out, since the server sets them and a request
 * does not carry them; `keepReadOnly` keeps them as locked fields.
 *
 * Throws when the source cannot be found (an unknown `operationId`, path,
 * method or schema name), when the operation has no request body or no JSON
 * one, and when the body or the schema is a `$ref` to another file: external
 * references are not supported, so bundle the document first. A `$ref` to
 * another file deeper inside the schema is a warning, like in
 * `fieldsFromJsonSchema`.
 */
export function fieldsFromOpenApi(
  doc: OpenApiDocument,
  source: OpenApiSource,
  options: FieldsFromOpenApiOptions = {},
): FieldsFromJsonSchemaResult {
  if (!isObject(doc)) {
    throw new TypeError(
      'fieldsFromOpenApi expects a parsed OpenAPI document object',
    );
  }
  if (typeof doc.openapi !== 'string' || !doc.openapi.startsWith('3.')) {
    throw new TypeError(
      'swagger' in doc
        ? 'fieldsFromOpenApi reads OpenAPI 3.0 and 3.1; this is a Swagger 2.0 document. Convert it to OpenAPI 3 first.'
        : 'fieldsFromOpenApi expects an OpenAPI 3.0 or 3.1 document, with an "openapi" version field',
    );
  }

  let schema: unknown;
  let where: string;
  if ('schema' in source) {
    const schemas =
      isObject(doc.components) && isObject(doc.components.schemas)
        ? doc.components.schemas
        : {};
    if (!(source.schema in schemas)) {
      const names = Object.keys(schemas);
      throw new Error(
        `fieldsFromOpenApi: components.schemas has no "${source.schema}"` +
          (names.length > 0
            ? `; it has ${names.map((name) => `"${name}"`).join(', ')}`
            : ''),
      );
    }
    where = `components.schemas.${source.schema}`;
    schema = schemas[source.schema];
  } else {
    const operation = findOperation(doc, source);
    where = `the request body of ${operation.label}`;
    schema = requestBodySchema(doc, operation, options.mediaType);
  }

  // Following the top-level reference here makes an external one an error;
  // the generator resolves the rest against the document.
  const resolved = follow(doc, schema, where);
  if (!isObject(resolved)) {
    throw new Error(`fieldsFromOpenApi: ${where} is not a schema object`);
  }
  return fieldsFromSchemaIn(resolved, doc, {
    overrides: options.overrides,
    skipReadOnly: !options.keepReadOnly,
    notAnObject:
      `fieldsFromOpenApi: ${where} is not an object with "properties", so it has no fields ` +
      '(an array body, for one, has no single form)',
  });
}
