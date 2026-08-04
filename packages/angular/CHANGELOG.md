# @dynamic-field-kit/angular

## 1.4.0

### Minor Changes

- 132f74b: Framework adapters: validation support, scoped field registries via dependency
  injection, and unified cross-framework layout types.

  - Validation wired through `DynamicInput` / `FieldInput` / `MultiFieldInput`.
  - Scoped `FieldRegistry` injection (React context, Vue provide/inject, Angular
    `FIELD_REGISTRY` token) so consumers can supply their own registry.
  - Shared layout type definitions aligned across React, Vue, and Angular.

  Requires `@dynamic-field-kit/core@^1.3.0` (peer dependency) for the new
  validation and layout APIs.

  Note: `@dynamic-field-kit/core` is a peer dependency (not bundled). Consumers
  must install it alongside the adapter.
