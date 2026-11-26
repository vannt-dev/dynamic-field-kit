# @dynamic-field-kit/mcp

A small [MCP](https://modelcontextprotocol.io) server for coding agents working
with dynamic-field-kit. It checks a form config (a `FieldDescription[]` as
JSON), and it generates a config from an OpenAPI document or a JSON Schema with
core's `fieldsFromOpenApi` / `fieldsFromJsonSchema`.

It speaks MCP over stdio (protocol revisions 2024-11-05 to 2025-11-25) and
offers tools only. It has no dependencies besides `@dynamic-field-kit/core`.

## Run it

The package is not on npm yet. Build it from a checkout of this repository:

```bash
npm ci
npm run build --workspace=@dynamic-field-kit/core
npm run build --workspace=@dynamic-field-kit/mcp
```

Then register `packages/mcp/dist/cli.js` with your agent, using an absolute
path:

```bash
# Claude Code
claude mcp add dynamic-field-kit -- node /abs/path/dynamic-field-kit/packages/mcp/dist/cli.js
```

```toml
# Codex: ~/.codex/config.toml
[mcp_servers.dynamic-field-kit]
command = "node"
args = ["/abs/path/dynamic-field-kit/packages/mcp/dist/cli.js"]
```

Any other MCP client takes the same command and arguments.

## Tools

### `validate_config`

Arguments: `fields` (the field list, as an array or a JSON string), and
optionally `data` (form values) and `knownTypes` (the field types your app has
renderers for).

It returns `{ valid, problems, dataErrors? }`. Each problem has a `path` such
as `[1].appearWhen.all[0]`, a `severity` (`error` or `warning`) and a
`message`. Errors make the config invalid. Warnings do not.

Errors:

- A field with no `name` or `type`, or a name used twice at the same level.
- A condition that is not one: no comparison, two comparisons, `in` without an
  array, `gt` without a number, and so on. Core treats a malformed condition
  as false, so the field quietly never shows.
- A key with a value of the wrong type.
- Data in a key that only takes a function (`validate`, `computeValue`,
  `appearCondition`, ...). JSON cannot carry a function.
- `minItems` greater than `maxItems`.

Warnings:

- An unknown key, with a "did you mean" for a misspelt one (`requried`).
- A condition that reads a field that does not exist at its level. Inside a
  group or section, set `root: true` to read a top-level field.
- Group-only keys on a field that is not a group.
- A field with both `fields` and `section`.
- With `knownTypes`, a type that has no renderer.

With `data`, it also runs core's `validateFields` over the values, once the
config has no errors, and returns the messages by field path in `dataErrors`.

Core validates form data, not the field list itself, so these structural rules
are this package's own. They follow `FieldDescription` and `FieldCondition` in
`@dynamic-field-kit/core`, and the typecheck fails if a key is added to
`FieldDescription` without being added here.

### `config_from_openapi`

Arguments: `document` (an OpenAPI 3.0 or 3.1 document, as an object or a JSON
string; convert YAML to JSON first). Pick the schema with exactly one of
`operationId`, `path` + `method`, or `schema` (a `components.schemas` name).
`mediaType` and `keepReadOnly` are optional and passed on to
`fieldsFromOpenApi`.

It returns `{ fields, defaults, warnings, droppedFunctions, check }`:

- `fields` is the config as JSON.
- `defaults` holds the schema's `default` values.
- `warnings` lists what core skipped.
- `check` is `validate_config` run on the result.

The `validate` rules that core derives from `required`, `minLength`, `format`
and so on are functions, so JSON cannot carry them. `droppedFunctions` lists
each one by path. To keep those rules, call `fieldsFromOpenApi` in the app at
runtime and use the generated JSON as a starting point or a review aid:

```ts
import { fieldsFromOpenApi } from '@dynamic-field-kit/core';

const { fields, defaults } = fieldsFromOpenApi(openApiDoc, {
  operationId: 'createPet',
});
```

### `config_from_json_schema`

Arguments: `schema` (a JSON Schema of type `object`). It returns the same
result as `config_from_openapi`, built with `fieldsFromJsonSchema`.

## As a library

The same functions are exported for scripts and tests: `validateConfig`,
`configFromOpenApi`, `configFromJsonSchema`, `toJsonConfig`, plus
`handleMessage` and `runStdioServer` for embedding the server.
