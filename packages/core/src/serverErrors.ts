/**
 * Where errors that name no field are kept: a rejected order, a stale token.
 * A form shows them above its fields rather than under one of them.
 */
export const FORM_ERROR_KEY = '_form';

export interface ServerErrorsOptions {
  /**
   * The form's field paths (`collectFieldPaths(fields, data)`). A key that
   * differs from one of them only by case takes its spelling, so `Email` from
   * a backend that writes property names in PascalCase lands on `email`.
   */
  paths?: readonly string[];
}

type Bag = Map<string, string[]>;

const FIELD_KEYS = ['field', 'path', 'name', 'property', 'param', 'pointer'];
const MESSAGE_KEYS = ['message', 'detail', 'msg', 'error'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toMessages(value: unknown): string[] {
  const list = Array.isArray(value) ? value : [value];
  return list
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item !== '');
}

/** A map of field to message or messages, and nothing else. */
function isErrorMap(value: Record<string, unknown>): boolean {
  return Object.values(value).every(
    (entry) =>
      entry === null ||
      entry === undefined ||
      typeof entry === 'string' ||
      (Array.isArray(entry) && entry.every((item) => typeof item === 'string')),
  );
}

/**
 * A field's address as the kit writes it (`contacts[1].email`), from a JSON
 * Pointer (`/contacts/1/email`), a dotted path (`contacts.1.email`), a JSONPath
 * (`$.contacts[1].email`) or a list of segments (`['contacts', 1, 'email']`).
 */
function toFieldPath(key: unknown): string {
  let segments: string[];
  if (Array.isArray(key)) {
    segments = key.map((segment) => String(segment));
  } else if (typeof key === 'string') {
    let text = key.trim();
    if (text.startsWith('#')) {
      text = text.slice(1);
    }
    if (text.startsWith('/')) {
      segments = text
        .split('/')
        .slice(1)
        .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
      // JSON:API addresses a resource's fields under /data/attributes.
      if (segments[0] === 'data' && segments[1] === 'attributes') {
        segments = segments.slice(2);
      }
    } else {
      segments = text
        .replace(/^\$\.?/, '')
        .replace(/\[(\d+)\]/g, '.$1')
        .split('.');
    }
  } else {
    return '';
  }
  let path = '';
  for (const segment of segments) {
    if (segment === '') {
      continue;
    }
    if (/^\d+$/.test(segment)) {
      path += `[${segment}]`;
    } else {
      path += path ? `.${segment}` : segment;
    }
  }
  return path;
}

function fieldOf(item: Record<string, unknown>): unknown {
  for (const key of FIELD_KEYS) {
    const value = item[key];
    if (typeof value === 'string' || Array.isArray(value)) {
      return value;
    }
  }
  const source = item.source;
  return isRecord(source) ? source.pointer : undefined;
}

function messagesOf(item: Record<string, unknown>): string[] {
  for (const key of MESSAGE_KEYS) {
    const messages = toMessages(item[key]);
    if (messages.length > 0) {
      return messages;
    }
  }
  // class-validator: { property, constraints: { isEmail: '...' } }
  return isRecord(item.constraints)
    ? toMessages(Object.values(item.constraints))
    : [];
}

/**
 * The validation errors of a backend's answer, by field path, ready for a form
 * store's `setServerErrors`.
 *
 * Reads the shapes backends commonly send: a map of field to message or
 * messages; that map under `errors` (ASP.NET, Laravel) or `fieldErrors`
 * (Zod's flattened error, with `formErrors` beside it); and a list under
 * `errors` or `issues` whose items name their field as `field`, `path`,
 * `name`, `property`, `param`, `pointer` or `source.pointer` and carry a
 * `message`, `detail`, `msg` or `constraints`.
 *
 * What names no field is kept under `FORM_ERROR_KEY`. Anything else answers an
 * empty object: a body that is not a set of field errors has none to show.
 */
export function serverErrorsFrom(
  input: unknown,
  options: ServerErrorsOptions = {},
): Record<string, string[]> {
  const known = new Map(
    (options.paths ?? []).map((path) => [path.toLowerCase(), path] as const),
  );
  const bag: Bag = new Map();
  const add = (key: unknown, messages: string[]): void => {
    if (messages.length === 0) {
      return;
    }
    const path = toFieldPath(key);
    const name =
      path === '' ? FORM_ERROR_KEY : (known.get(path.toLowerCase()) ?? path);
    bag.set(name, [...(bag.get(name) ?? []), ...messages]);
  };
  const addMap = (map: Record<string, unknown>): void => {
    for (const [key, value] of Object.entries(map)) {
      add(key, toMessages(value));
    }
  };
  const addList = (list: unknown[]): void => {
    for (const item of list) {
      if (isRecord(item)) {
        add(fieldOf(item), messagesOf(item));
      }
    }
  };

  if (Array.isArray(input)) {
    addList(input);
  } else if (isRecord(input)) {
    const { errors, issues, fieldErrors, formErrors } = input;
    if (Array.isArray(errors)) {
      addList(errors);
    } else if (isRecord(errors) && isErrorMap(errors)) {
      addMap(errors);
    } else if (Array.isArray(issues)) {
      addList(issues);
    } else if (isRecord(fieldErrors) && isErrorMap(fieldErrors)) {
      addMap(fieldErrors);
      add('', toMessages(formErrors));
    } else if (!('errors' in input) && isErrorMap(input)) {
      addMap(input);
    }
  }
  return Object.fromEntries(bag);
}
