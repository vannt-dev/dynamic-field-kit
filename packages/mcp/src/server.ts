import { createRequire } from 'node:module';
import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import {
  configFromJsonSchema,
  configFromOpenApi,
  InputError,
  parseJsonInput,
  toJsonConfig,
  type ConfigFromOpenApiInput,
} from './generate';
import { validateConfig } from './validateConfig';

const { version } = createRequire(import.meta.url)('../package.json') as {
  version: string;
};

/**
 * MCP protocol revisions this server speaks. It only offers tools, whose
 * messages are the same in all of them, so it answers in the revision the
 * client asks for when it is one of these, and in the newest otherwise.
 */
export const PROTOCOL_VERSIONS = [
  '2025-11-25',
  '2025-06-18',
  '2025-03-26',
  '2024-11-05',
] as const;

type JsonObject = Record<string, unknown>;

interface Tool {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonObject;
  annotations: JsonObject;
  run: (args: JsonObject) => unknown;
}

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const FIELD_LIST_DESCRIPTION =
  'The dynamic-field-kit field list (FieldDescription[]) as JSON: an array of ' +
  'field objects, or a JSON string of one.';

function verified(fields: unknown[]) {
  const check = validateConfig(fields);
  return { valid: check.valid, problems: check.problems };
}

export const TOOLS: Tool[] = [
  {
    name: 'validate_config',
    title: 'Validate a dynamic-field-kit form config',
    description:
      'Checks a dynamic-field-kit field list (FieldDescription[] as JSON) for what ' +
      'core would misread or silently ignore: missing or duplicate names, missing ' +
      'types, malformed appearWhen/requiredWhen/disabledWhen/readOnlyWhen ' +
      'conditions, conditions that read a field that does not exist, misspelt or ' +
      'unknown keys, and function-only keys (validate, computeValue, ...) given ' +
      'data. Pass "data" to also validate form values against the config with ' +
      "core's validateFields; a JSON config carries no validate functions, so " +
      'dataErrors then covers requiredWhen only (required: true is reported as a ' +
      'warning). Returns { valid, problems[], dataErrors? }.',
    inputSchema: {
      type: 'object',
      properties: {
        fields: { description: FIELD_LIST_DESCRIPTION },
        data: {
          type: 'object',
          description:
            'Optional form values to validate against the config, keyed by field name.',
        },
        knownTypes: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Optional field types the app has renderers for; any other type is a warning.',
        },
      },
      required: ['fields'],
    },
    annotations: READ_ONLY,
    run: (args) =>
      validateConfig(parseJsonInput(args.fields, '"fields"'), {
        data: parseJsonInput(args.data, '"data"'),
        knownTypes: Array.isArray(args.knownTypes)
          ? args.knownTypes.filter(
              (type): type is string => typeof type === 'string',
            )
          : undefined,
      }),
  },
  {
    name: 'config_from_openapi',
    title: 'Generate a form config from OpenAPI',
    description:
      'Builds a dynamic-field-kit field list from an OpenAPI 3.0/3.1 document with ' +
      "core's fieldsFromOpenApi: the JSON request body of an operation (by " +
      '"operationId", or "path" and "method"), or a named components.schemas entry ' +
      '("schema"). Returns { fields, defaults, warnings, droppedFunctions, check }. ' +
      'The fields are JSON, so the validate rules core derives (required, ' +
      'minLength, format, ...) are listed in droppedFunctions; call ' +
      'fieldsFromOpenApi at runtime to keep them. "check" is validate_config run ' +
      'on the result.',
    inputSchema: {
      type: 'object',
      properties: {
        document: {
          description:
            'The OpenAPI document as a JSON object, or a JSON string of one. Convert YAML to JSON first.',
        },
        operationId: { type: 'string' },
        path: { type: 'string', description: 'Used with "method".' },
        method: { type: 'string', description: 'post, put, patch, ...' },
        schema: {
          type: 'string',
          description: 'A components.schemas name, instead of an operation.',
        },
        mediaType: {
          type: 'string',
          description:
            'Request body media type; defaults to the first JSON one.',
        },
        keepReadOnly: {
          type: 'boolean',
          description:
            'Keep readOnly properties as locked fields instead of leaving them out.',
        },
      },
      required: ['document'],
    },
    annotations: READ_ONLY,
    run: (args) => {
      const config = toJsonConfig(
        configFromOpenApi(args as unknown as ConfigFromOpenApiInput),
      );
      return { ...config, check: verified(config.fields) };
    },
  },
  {
    name: 'config_from_json_schema',
    title: 'Generate a form config from JSON Schema',
    description:
      'Builds a dynamic-field-kit field list from a JSON Schema of type "object" ' +
      "with core's fieldsFromJsonSchema. Same result shape as config_from_openapi.",
    inputSchema: {
      type: 'object',
      properties: {
        schema: {
          description: 'The JSON Schema as an object, or a JSON string of one.',
        },
      },
      required: ['schema'],
    },
    annotations: READ_ONLY,
    run: (args) => {
      const config = toJsonConfig(configFromJsonSchema(args.schema));
      return { ...config, check: verified(config.fields) };
    },
  },
];

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: JsonObject;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function success(id: JsonRpcRequest['id'], result: unknown) {
  return { jsonrpc: '2.0', id, result };
}

function failure(
  id: JsonRpcRequest['id'] | null,
  code: number,
  message: string,
) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

function callTool(params: JsonObject | undefined) {
  const tool = TOOLS.find((candidate) => candidate.name === params?.name);
  if (!tool) {
    return { error: `Unknown tool: ${String(params?.name)}` };
  }
  const args = isObject(params?.arguments) ? params.arguments : {};
  try {
    const result = tool.run(args);
    return {
      result: {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
        isError: false,
      },
    };
  } catch (error) {
    if (!(error instanceof InputError)) {
      throw error;
    }
    // A tool error, not a protocol one: the model sees it and can fix the call.
    return {
      result: {
        content: [{ type: 'text', text: error.message }],
        isError: true,
      },
    };
  }
}

/**
 * Answers one JSON-RPC message. Returns undefined for a notification, which
 * gets no reply.
 */
export function handleMessage(message: unknown): unknown {
  if (
    !isObject(message) ||
    message.jsonrpc !== '2.0' ||
    typeof message.method !== 'string'
  ) {
    return failure(
      isObject(message) ? (message.id as JsonRpcRequest['id']) : null,
      -32600,
      'Invalid Request',
    );
  }
  const request = message as unknown as JsonRpcRequest;
  const isNotification = !('id' in request);
  if (isNotification) {
    return undefined;
  }
  const params = isObject(request.params) ? request.params : undefined;

  switch (request.method) {
    case 'initialize': {
      const asked = params?.protocolVersion;
      const protocolVersion = PROTOCOL_VERSIONS.includes(
        asked as (typeof PROTOCOL_VERSIONS)[number],
      )
        ? asked
        : PROTOCOL_VERSIONS[0];
      return success(request.id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: {
          name: 'dynamic-field-kit',
          title: 'dynamic-field-kit',
          version,
        },
        instructions:
          'Tools for dynamic-field-kit form configs (FieldDescription[] as JSON): ' +
          'validate_config checks one, config_from_openapi and ' +
          'config_from_json_schema generate one.',
      });
    }
    case 'ping':
      return success(request.id, {});
    case 'tools/list':
      return success(request.id, {
        tools: TOOLS.map(({ run: _run, ...tool }) => tool),
      });
    case 'tools/call': {
      try {
        const outcome = callTool(params);
        return outcome.error !== undefined
          ? failure(request.id, -32602, outcome.error)
          : success(request.id, outcome.result);
      } catch (error) {
        return failure(request.id, -32603, (error as Error).message);
      }
    }
    default:
      return failure(request.id, -32601, `Method not found: ${request.method}`);
  }
}

/**
 * Serves MCP over stdio: one JSON-RPC message per line in, one per line out.
 * Resolves when the input ends.
 */
export function runStdioServer(
  input: Readable,
  output: Writable,
): Promise<void> {
  const lines = createInterface({ input, crlfDelay: Infinity });
  lines.on('line', (line) => {
    if (line.trim() === '') {
      return;
    }
    let reply: unknown;
    try {
      reply = handleMessage(JSON.parse(line));
    } catch {
      reply = failure(null, -32700, 'Parse error');
    }
    if (reply !== undefined) {
      output.write(JSON.stringify(reply) + '\n');
    }
  });
  return new Promise((resolve) => lines.once('close', () => resolve()));
}
