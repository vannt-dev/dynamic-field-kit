import { resolveRequired } from './conditions';
import { resolveInputMask } from './inputMask';
import type { OptionsState } from './optionsLoader';
import type { FieldDescription, FieldRendererProps, Properties } from './types';
import {
  resolveDisabled,
  resolveOptions,
  resolveReadOnly,
  validateField,
} from './validation';

/**
 * The renderer prop contract every adapter must satisfy.
 *
 * `FieldRendererProps` used to be a type nobody enforced: each adapter
 * hand-wrote the object it passed to the registered renderer, and the three
 * lists drifted apart - React dropped `placeholder`, Vue dropped `required`
 * and the aria flags, Angular dropped `touched`, `dirty` and `id`. A renderer
 * written against one adapter could not be ported to another, which defeats
 * the point of a shared schema. Adapters now build this object through
 * `buildFieldRendererProps` instead, so the set can only change here.
 */
export const FIELD_RENDERER_PROP_KEYS = [
  'value',
  'label',
  'placeholder',
  'required',
  'disabled',
  'readOnly',
  'touched',
  'dirty',
  'error',
  'options',
  'optionsStatus',
  'optionsError',
  'className',
  'description',
  'id',
  'ariaInvalid',
  'ariaDescribedBy',
  'ariaRequired',
  'min',
  'max',
  'step',
  'accept',
  'multiple',
] as const;

export type FieldRendererPropKey = (typeof FIELD_RENDERER_PROP_KEYS)[number];

function isDev(): boolean {
  return (
    typeof process !== 'undefined' &&
    !!process.env &&
    process.env.NODE_ENV !== 'production'
  );
}

const RESERVED_PROP_KEYS: ReadonlySet<string> = new Set(
  FIELD_RENDERER_PROP_KEYS,
);
const warnedReservedProps = new Set<string>();

/** Test-only. Clears the warn-once memo so each case starts from silence. */
export function __resetReservedPropWarnings(): void {
  warnedReservedProps.clear();
}

/**
 * `props` is spread *before* the resolved contract in every adapter, so a key
 * the contract owns is silently overwritten - usually by `undefined`, which is
 * indistinguishable from the value simply vanishing. Nothing throws, so this
 * warning is the only signal a consumer gets.
 *
 * Fires once per field+key: a form re-renders constantly, and a console filled
 * with the same line is a console nobody reads.
 */
function warnOnReservedProps(
  fieldName: string,
  extraProps: Properties | undefined,
): void {
  if (!isDev() || !extraProps) {
    return;
  }
  for (const key of Object.keys(extraProps)) {
    if (!RESERVED_PROP_KEYS.has(key)) {
      continue;
    }
    const memo = `${fieldName}.${key}`;
    if (warnedReservedProps.has(memo)) {
      continue;
    }
    warnedReservedProps.add(memo);
    console.warn(
      `[dynamic-field-kit] field "${fieldName}" passes "${key}" through ` +
        `\`props\`, but "${key}" is part of the renderer prop contract and is ` +
        `resolved from the field description itself, so the value in \`props\` ` +
        `is discarded. Move it to the top level: ` +
        `{ name: "${fieldName}", ${key}: ... }.`,
    );
  }
}

/**
 * A fully resolved renderer prop bag, plus the keys the adapter layer needs
 * but the renderer never sees as-is: `type` (which renderer to look up),
 * `extraProps` (spread verbatim ahead of the standard props) and `parseInput`.
 */
export interface ResolvedFieldRendererProps extends FieldRendererProps {
  type: FieldDescription['type'];
  extraProps?: Properties;
  /**
   * Present only for a field with a `mask` whose adapter asked for it with
   * `applyMask`. `value` is then the formatted text, and this turns what the
   * renderer reports back into the value to store:
   * `onChange(parseInput ? parseInput(v) : v)`.
   *
   * An adapter keeps it for itself. Spread on to a renderer it would end up
   * as an attribute of whatever element the renderer spreads its props over.
   */
  parseInput?: (input: unknown) => unknown;
}

export interface BuildFieldRendererPropsInput {
  fieldDescription: FieldDescription;
  /** Data at this field's own level (the group item, inside a repeatable group). */
  data: Properties;
  /** Top-level form data. Equal to `data` outside a group. */
  rootData?: Properties;
  /** Resolved DOM id for this field - see `makeFieldId`. */
  id: string;
  /**
   * Current state of an async options load, from `createOptionsLoader`.
   * Omitted for static or synchronous options, where there is nothing to wait
   * for and `resolveOptions` already has the answer.
   */
  optionsState?: OptionsState;
  touched?: boolean;
  dirty?: boolean;
  /**
   * Errors supplied by an owning form store. An empty array explicitly means
   * valid; `undefined` keeps the legacy live-validation behaviour.
   */
  validationErrors?: string[];
  /**
   * Set by an adapter that sends what its renderer reports back through
   * `parseInput`. Without it a field's `mask` is left alone: an adapter that
   * knows nothing of masks would show the formatted text and then store that
   * text as the value.
   */
  applyMask?: boolean;
}

/**
 * Resolves a field's DOM id.
 *
 * `prefix` is per-`MultiFieldInput`-instance, so two forms rendering the same
 * field name no longer emit duplicate ids (invalid HTML, and it makes every
 * `label[for]` ambiguous). A field can opt out and pin its own id via
 * `FieldDescription.id`.
 */
export function makeFieldId(
  fieldDescription: Pick<FieldDescription, 'name' | 'id'>,
  prefix: string,
): string {
  return fieldDescription.id ?? `${prefix}-${fieldDescription.name}`;
}

/**
 * The id of the node that renders a field's validation message.
 *
 * `ariaDescribedBy` points here, so a renderer that forwards it must put this
 * id on whatever element shows the error - otherwise the reference dangles and
 * assistive technology has nothing to read.
 */
export function makeErrorId(id: string): string {
  return `${id}-error`;
}

/**
 * Builds the complete renderer prop bag for one field. Shared by the React,
 * Vue and Angular adapters so all three forward an identical set.
 */
export function buildFieldRendererProps({
  fieldDescription,
  data,
  rootData,
  id,
  touched,
  dirty,
  validationErrors,
  optionsState,
  applyMask,
}: BuildFieldRendererPropsInput): ResolvedFieldRendererProps {
  const {
    name,
    type,
    label,
    placeholder,
    className,
    description,
    min,
    max,
    step,
    accept,
    multiple,
    props: extraProps,
  } = fieldDescription;

  warnOnReservedProps(name, extraProps);

  // Left exactly as given unless `requiredWhen` has a say, so a field without
  // one is built key for key as it was before declarative conditions.
  const required =
    fieldDescription.requiredWhen === undefined
      ? fieldDescription.required
      : resolveRequired(fieldDescription, data, rootData);
  const disabled = resolveDisabled(fieldDescription, data, rootData);
  const readOnly = resolveReadOnly(fieldDescription, data, rootData);
  // An async loader owns the list; resolveOptions returns undefined for those.
  const options = optionsState
    ? optionsState.options
    : resolveOptions(fieldDescription, data, rootData);

  // A disabled field is not submitted, so validating it would surface an error
  // the user cannot act on.
  const errors = disabled
    ? []
    : (validationErrors ??
      validateField(fieldDescription, data[name], data, rootData));
  const error = errors.length > 0 ? errors : undefined;

  const stored = data[name];
  const mask = applyMask ? resolveInputMask(fieldDescription.mask) : undefined;

  const resolved: ResolvedFieldRendererProps = {
    type,
    value: mask ? mask.format(stored) : stored,
    label,
    placeholder,
    required,
    disabled,
    readOnly,
    touched,
    dirty,
    error,
    options,
    optionsStatus: optionsState?.status,
    optionsError: optionsState?.error,
    className,
    description,
    id,
    ariaInvalid: Boolean(error),
    // Points at the error node, but only when there is an error to point at.
    // The adapters render that node for default renderers; a custom renderer
    // that forwards this prop must put `makeErrorId(id)` on its own message
    // element, or the reference dangles.
    ariaDescribedBy: error ? makeErrorId(id) : undefined,
    ariaRequired: Boolean(required),
    min,
    max,
    step,
    accept,
    multiple,
    extraProps,
  };
  if (mask) {
    // Added only here, so a field without a mask is built key for key as it
    // was before masks existed.
    resolved.parseInput = (input) =>
      typeof input === 'string' ? mask.parse(input, stored) : input;
  }
  return resolved;
}
