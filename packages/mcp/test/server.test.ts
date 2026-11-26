import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import {
  handleMessage,
  PROTOCOL_VERSIONS,
  runStdioServer,
  TOOLS,
} from '../src/server';
import { petstore } from './fixtures';

type Reply = {
  id: unknown;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
};

const call = (id: number, method: string, params?: unknown) =>
  handleMessage({ jsonrpc: '2.0', id, method, params }) as Reply;

const callTool = (name: string, args: unknown) =>
  call(1, 'tools/call', { name, arguments: args }).result as {
    content: { type: string; text: string }[];
    structuredContent?: Record<string, unknown>;
    isError: boolean;
  };

describe('handleMessage', () => {
  it('initializes in the protocol version the client asks for', () => {
    const reply = call(1, 'initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'test', version: '0' },
    });
    expect(reply.result).toMatchObject({
      protocolVersion: '2025-06-18',
      capabilities: { tools: {} },
      serverInfo: { name: 'dynamic-field-kit' },
    });
    expect((reply.result?.serverInfo as { version: string }).version).toMatch(
      /^\d+\.\d+\.\d+/,
    );

    const unknown = call(2, 'initialize', { protocolVersion: '1999-01-01' });
    expect(unknown.result?.protocolVersion).toBe(PROTOCOL_VERSIONS[0]);
  });

  it('answers ping and ignores notifications', () => {
    expect(call(3, 'ping')).toEqual({ jsonrpc: '2.0', id: 3, result: {} });
    expect(
      handleMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    ).toBeUndefined();
  });

  it('lists the tools with their input schemas', () => {
    const tools = call(4, 'tools/list').result?.tools as {
      name: string;
      inputSchema: { type: string; required: string[] };
    }[];
    expect(tools.map((tool) => tool.name)).toEqual([
      'validate_config',
      'config_from_openapi',
      'config_from_json_schema',
    ]);
    for (const tool of tools) {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool).not.toHaveProperty('run');
    }
    expect(tools).toHaveLength(TOOLS.length);
  });

  it('runs validate_config', () => {
    const result = callTool('validate_config', {
      fields: JSON.stringify([{ name: 'a', type: 'text' }, { name: 'a' }]),
      data: { a: 'x' },
    });
    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({ valid: false });
    expect(JSON.parse(result.content[0].text)).toEqual(
      result.structuredContent,
    );

    const typed = callTool('validate_config', {
      fields: [{ name: 'a', type: 'stars' }],
      knownTypes: ['text', 7],
    });
    expect(typed.structuredContent?.problems).toHaveLength(1);
  });

  it('runs config_from_openapi and checks what it made', () => {
    const result = callTool('config_from_openapi', {
      document: petstore,
      operationId: 'createPet',
    });
    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      defaults: { status: 'available' },
      check: { valid: true, problems: [] },
    });
    expect(
      (result.structuredContent?.fields as { name: string }[]).map(
        (field) => field.name,
      ),
    ).toEqual(['name', 'status', 'ownerEmail']);
  });

  it('runs config_from_json_schema', () => {
    const result = callTool('config_from_json_schema', {
      schema: { type: 'object', properties: { a: { type: 'boolean' } } },
    });
    expect(result.structuredContent).toMatchObject({
      check: { valid: true },
    });
  });

  it('reports bad tool input as a tool error the model can read', () => {
    const result = callTool('config_from_openapi', {
      document: petstore,
      operationId: 'missing',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/missing/);
    expect(result.structuredContent).toBeUndefined();
  });

  it('answers protocol errors with JSON-RPC errors', () => {
    expect(call(5, 'tools/call', { name: 'nope' }).error?.code).toBe(-32602);
    expect(call(6, 'resources/list').error?.code).toBe(-32601);
    expect((handleMessage({ id: 7, method: 'ping' }) as Reply).error).toEqual({
      code: -32600,
      message: 'Invalid Request',
    });
    expect((handleMessage([]) as Reply).error?.code).toBe(-32600);
  });
});

describe('runStdioServer', () => {
  it('speaks newline-delimited JSON-RPC over streams', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const done = runStdioServer(input, output);
    const replies: Reply[] = [];
    output.on('data', (chunk: Buffer) => {
      for (const line of chunk.toString().split('\n')) {
        if (line) {
          replies.push(JSON.parse(line));
        }
      }
    });

    input.write(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-11-25' },
      }) + '\n',
    );
    input.write(
      JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) +
        '\r\n',
    );
    input.write('\n{not json\n');
    input.write(
      JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) + '\n',
    );
    input.end();
    await done;

    expect(replies.map((reply) => reply.id)).toEqual([1, null, 2]);
    expect(replies[1].error?.code).toBe(-32700);
  });
});
