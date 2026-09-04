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
  radio: string | number;
  range: number;
  file: unknown;
  date: string;
  time: string;
  'datetime-local': string;
  switch: boolean;
}

export type Properties = Record<string, unknown>;

/** The third argument an options loader receives, for async loading. */
export interface OptionsContext {
  /**
   * Whatever the renderer last passed to `onOptionsQuery` - the search box in
   * a search-remote picker. Undefined for a purely data-driven load.
   */
  query?: string;
  /** Aborted when a newer load supersedes this one. */
  signal: AbortSignal;
}

/**
 * Resolves a field's options.
 *
 * One signature rather than a union of a sync and an async shape, and the
 * positional `(data, rootData)` is unchanged from before async loading
 * existed. Both of those are deliberate: a union of two function types
 * defeats TypeScript's contextual inference, so every existing
 * `options: (data) => …` would have started erroring under `noImplicitAny`.
 * Returning a promise is what makes a loader async, not its parameter shape.
 */
export type OptionsFn = (
  data: Properties,
  rootData?: Properties,
  ctx?: OptionsContext,
) => Properties[] | Promise<Properties[]>;

export type OptionsStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ValidationContext {
  /** Aborted when a newer validation run supersedes this one. */
  signal?: AbortSignal;
  /**
   * Resolves a validator's message key against the catalog in effect for this
   * form, returning undefined for a key the catalog omits so the validator
   * falls back to its own default. Supplied by the adapters from
   * `useDynamicForm({ messages })`.
   *
   * It lives here rather than in a parameter of its own because `validate`
   * already receives this context as its fourth argument - one object carries
   * both concerns, and an async validator gets the resolver for free.
   */
  t?: (key: string, params?: Properties) => string | undefined;
}

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
  /**
   * Where the option list currently stands. Only ever set for a field with an
   * async loader; undefined means the options are static or synchronous and
   * there is nothing to wait for.
   */
  optionsStatus?: OptionsStatus;
  /** Whatever the async loader rejected with, when `optionsStatus` is 'error'. */
  optionsError?: unknown;
  /**
   * Ask for a fresh option list matching `query` - the search box in a
   * search-remote picker. Debounced by the field's `debounceMs`.
   *
   * Not part of `FIELD_RENDERER_PROP_KEYS`: it is a callback, attached by the
   * adapter alongside `onValueChange` and `onBlur`.
   */
  onOptionsQuery?: (query: string) => void;
  className?: string;
  description?: unknown;
  id?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  ariaRequired?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  accept?: string;
  multiple?: boolean;
}

export interface FieldDescription<T extends FieldTypeKey = FieldTypeKey> {
  name: string;
  type: T;
  /**
   * Pins this field's DOM id. When omitted the id is derived from the owning
   * MultiFieldInput's instance prefix plus `name`, which keeps it unique when
   * two forms render the same field name at once.
   */
  id?: string;
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
    rootData?: Properties,
    context?: ValidationContext,
  ) => string | string[] | undefined | Promise<string | string[] | undefined>;
  /**
   * Declare Promise-returning validators so synchronous/live validation can
   * mark them pending without invoking them. Native `async` functions are
   * detected automatically; use this for functions that return a Promise
   * without the `async` keyword.
   */
  validationMode?: 'sync' | 'async';
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
  /**
   * A static list, a synchronous function of the form data, or an
   * asynchronous loader. Declare `optionsMode: 'async'` for a loader that
   * returns a promise without the `async` keyword, the way `validationMode`
   * works.
   */
  options?: Properties[] | OptionsFn;
  /** Mirrors `validationMode`, for the options loader. */
  optionsMode?: 'sync' | 'async';
  /**
   * Values an async loader depends on. It refetches when any of them changes,
   * compared shallowly with `Object.is`. Defaults to `[]`, meaning fetch once:
   * without this the loader would have to refetch on every keystroke in the
   * whole form, since it cannot see what the loader function reads.
   *
   * Ignored for synchronous options.
   */
  optionsDeps?: (data: Properties, rootData?: Properties) => unknown[];
  min?: number | string;
  max?: number | string;
  step?: number | string;
  accept?: string;
  multiple?: boolean;
  /**
   * Debounce for the async options loader, in milliseconds. Rapid `update` or
   * `onOptionsQuery` calls inside the window collapse into one fetch.
   *
   * Ignored for synchronous options. Before 1.7.0 this was declared but read
   * by nothing at all - setting it did nothing.
   */
  debounceMs?: number;
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
