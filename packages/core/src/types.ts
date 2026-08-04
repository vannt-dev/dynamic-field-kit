/* eslint-disable @typescript-eslint/no-empty-interface */
export type FieldTypeKey = keyof FieldTypeMap & string;

// 👇 Core provides standard HTML5 input defaults; apps can extend via declaration merging
export interface FieldTypeMap {
  text: string;
  number: number;
  select: string;
  checkbox: boolean;
  textarea: string;
  password: string;
  email: string;
}

export type Properties = Record<string, unknown>;

export interface FieldRendererProps<T = unknown> {
  value?: T;
  onValueChange?: (value: T) => void;
  onBlur?: () => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  touched?: boolean;
  dirty?: boolean;
  error?: string | string[];
  options?: Properties[];
  className?: string;
  description?: unknown;
  id?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  ariaRequired?: boolean;
}

export interface FieldDescription<T extends FieldTypeKey = FieldTypeKey> {
  name: string;
  type: T;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  /**
   * Returns one or more validation error messages for `value`, or a falsy
   * value when it is valid. Can return a Promise for async validation.
   * `rootData` is the top-level form (equal to `data` outside a group).
   */
  validate?: (
    value: unknown,
    data: Properties,
    rootData?: Properties
  ) => string | string[] | undefined | Promise<string | string[] | undefined>;
  /**
   * Runtime visibility condition. `data` is the data at this field's own level
   * (the group item, when the field lives inside a repeatable group); `rootData`
   * is always the top-level form data, so a field nested in a group can still
   * branch on a top-level value.
   */
  appearCondition?: (data: Properties, rootData?: Properties) => boolean;
  /**
   * Derives this field's value from the rest of the form data (e.g. a "full
   * name" field computed from firstName + lastName). Re-evaluated once,
   * against the post-change data, whenever any field's value changes - it is
   * not re-run to a fixed point, so avoid chaining computeValue fields off
   * one another in a cycle. `data` is this field's own level; `rootData` is the
   * top-level form data (equal to `data` outside a group).
   */
  computeValue?: (data: Properties, rootData?: Properties) => unknown;
  /** Dynamic disabled state, OR-ed with the static `disabled` flag. */
  disabledCondition?: (data: Properties, rootData?: Properties) => boolean;
  /** Dynamic read-only state. */
  readOnlyCondition?: (data: Properties, rootData?: Properties) => boolean;
  /** Dynamic options list or static mảng options. */
  options?:
    | Properties[]
    | ((data: Properties, rootData?: Properties) => Properties[]);
  className?: string;
  description?: unknown;
  /**
   * Extra, framework-agnostic props forwarded verbatim to the registered
   * renderer (e.g. `acceptFile`, `maxLength`). Keeps domain-specific inputs out
   * of the generic adapter layer while still letting renderers receive them.
   */
  props?: Properties;
  /**
   * Declares this field as a repeatable group instead of a registry-rendered
   * leaf field: `data[name]` becomes an array of items, each shaped by
   * `fields`. Renders an "add item" / per-item "remove" control instead of
   * going through fieldRegistry.
   */
  fields?: FieldDescription[];
  /** Values to seed a newly-added item with. Defaults to `{}`. */
  defaultItem?: Properties;
  /**
   * Property on each group item to use as its stable React key / Vue key /
   * Angular trackBy identity. When omitted, the array index is used - which is
   * unsafe if items can be reordered or removed from the middle.
   */
  keyField?: string;
  minItems?: number;
  maxItems?: number;
  addLabel?: string;
  removeLabel?: string;
}
