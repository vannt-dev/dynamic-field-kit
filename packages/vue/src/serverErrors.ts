// Kept in each adapter rather than in core: an adapter may only call core APIs
// that exist in the oldest core its peer range allows, and these are newer.
import type { Properties } from '@dynamic-field-kit/core';

/** What `setServerErrors` takes: a message or messages by field path. */
export type ServerErrorsInput = Record<
  string,
  string | readonly string[] | null | undefined
>;

export type FieldErrors = Record<string, string[]>;

export function toFieldErrors(input: ServerErrorsInput): FieldErrors {
  const errors: FieldErrors = {};
  for (const [path, value] of Object.entries(input)) {
    const messages = (typeof value === 'string' ? [value] : [...(value ?? [])])
      .filter((message) => typeof message === 'string')
      .map((message) => message.trim())
      .filter((message) => message !== '');
    if (messages.length > 0) {
      errors[path] = messages;
    }
  }
  return errors;
}

/** The form's own errors with the server's after them, field by field. */
export function mergeFieldErrors(
  own: FieldErrors,
  server: FieldErrors,
): FieldErrors {
  const paths = Object.keys(server);
  if (paths.length === 0) {
    return own;
  }
  const merged: FieldErrors = { ...own };
  for (const path of paths) {
    merged[path] = [...(own[path] ?? []), ...(server[path] as string[])];
  }
  return merged;
}

function valueAt(data: Properties, path: string): unknown {
  let value: unknown = data;
  for (const segment of path.match(/[^.[\]]+/g) ?? []) {
    if (value === null || typeof value !== 'object') {
      return undefined;
    }
    value = (value as Record<string, unknown>)[segment];
  }
  return value;
}

/**
 * The server's errors without those of the fields whose value changed: the
 * server judged a value that is no longer the one in the field.
 */
export function withoutChangedFields(
  server: FieldErrors,
  previous: Properties,
  next: Properties,
): FieldErrors {
  const paths = Object.keys(server);
  const kept = paths.filter((path) =>
    Object.is(valueAt(previous, path), valueAt(next, path)),
  );
  if (kept.length === paths.length) {
    return server;
  }
  return Object.fromEntries(kept.map((path) => [path, server[path]!]));
}

/** The errors without those of one field. */
export function withoutField(errors: FieldErrors, name: string): FieldErrors {
  return Object.fromEntries(
    Object.entries(errors).filter(([path]) => path !== name),
  );
}
