/* eslint-disable @typescript-eslint/no-empty-interface */
export type FieldTypeKey = keyof FieldTypeMap & string;

// 👇 App sẽ augment interface này
export interface FieldTypeMap {}

export type Properties = Record<string, unknown>;

export interface FieldRendererProps<T = unknown> {
  value?: T;
  onValueChange?: (value: T) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  options?: Properties[];
  className?: string;
  description?: unknown;
}

export interface FieldDescription<T extends FieldTypeKey = FieldTypeKey> {
  name: string;
  type: T;
  label?: string;
  placeholder?: string;
  required?: boolean;
  appearCondition?: (data: Properties) => boolean;
  /**
   * Derives this field's value from the rest of the form data (e.g. a "full
   * name" field computed from firstName + lastName). Re-evaluated once,
   * against the post-change data, whenever any field's value changes - it is
   * not re-run to a fixed point, so avoid chaining computeValue fields off
   * one another in a cycle.
   */
  computeValue?: (data: Properties) => unknown;
  options?: Properties[];
  className?: string;
  description?: unknown;
  /**
   * Declares this field as a repeatable group instead of a registry-rendered
   * leaf field: `data[name]` becomes an array of items, each shaped by
   * `fields`. Renders an "add item" / per-item "remove" control instead of
   * going through fieldRegistry.
   */
  fields?: FieldDescription[];
  /** Values to seed a newly-added item with. Defaults to `{}`. */
  defaultItem?: Properties;
  minItems?: number;
  maxItems?: number;
  addLabel?: string;
  removeLabel?: string;
}
