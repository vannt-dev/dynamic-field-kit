import type { Properties, ValidationContext } from './types';

/**
 * Default messages for the built-in validators, keyed by validator name.
 * `{name}` placeholders are filled from the params each validator supplies -
 * `{min}` for `minLength`/`min`, `{max}`, `{other}` for `matches`.
 *
 * No locale bundles ship with this library: supply your own catalog, and
 * anything omitted falls through to the English default baked into the
 * validator itself.
 */
export interface MessageCatalog {
  required?: string;
  email?: string;
  minLength?: string;
  maxLength?: string;
  min?: string;
  max?: string;
  pattern?: string;
  matches?: string;
}

export type MessageResolver = (
  key: string,
  params?: Properties,
) => string | undefined;

function interpolate(template: string, params?: Properties): string {
  if (!params) {
    return template;
  }
  // An unknown placeholder is left verbatim rather than replaced with
  // "undefined": a visible `{unit}` in the UI reads as a bug report, whereas
  // the string "undefined" reads as a mystery.
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key)
      ? String(params[key])
      : match,
  );
}

export function createMessageResolver(
  catalog?: MessageCatalog,
): MessageResolver {
  return (key, params) => {
    const template = catalog?.[key as keyof MessageCatalog];
    return template === undefined ? undefined : interpolate(template, params);
  };
}

let defaultMessages: MessageCatalog | undefined;

/**
 * A process-wide catalog, for code that calls `validateFields` directly and has
 * nowhere to thread a context through. A per-form catalog passed to
 * `useDynamicForm({ messages })` takes precedence over this.
 */
export function setDefaultMessages(catalog?: MessageCatalog): void {
  defaultMessages = catalog;
}

export function getDefaultMessages(): MessageCatalog | undefined {
  return defaultMessages;
}

/**
 * Message precedence, in one place so every built-in validator agrees:
 * an explicitly passed message, then this form's catalog, then the global
 * catalog, then the validator's own English default.
 */
export function resolveMessage(
  ctx: ValidationContext | undefined,
  key: keyof MessageCatalog,
  params: Properties | undefined,
  fallback: string,
  explicit?: string,
): string {
  if (explicit !== undefined) {
    return explicit;
  }
  const fromContext = ctx?.t?.(key, params);
  if (fromContext !== undefined) {
    return fromContext;
  }
  const fromGlobal = createMessageResolver(defaultMessages)(key, params);
  return fromGlobal ?? fallback;
}
