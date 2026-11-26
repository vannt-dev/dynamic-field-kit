---
'@dynamic-field-kit/mcp': minor
---

New package: a stdio MCP server for coding agents. `validate_config` checks a field list (as JSON)
for missing or duplicate names, malformed conditions, conditions that read a missing field,
misspelt keys and function-only keys given data, and can validate form data with core's
`validateFields`. `config_from_openapi` and `config_from_json_schema` generate a config with
core's `fieldsFromOpenApi` / `fieldsFromJsonSchema`, list the validator functions JSON cannot
carry, and check the result.
