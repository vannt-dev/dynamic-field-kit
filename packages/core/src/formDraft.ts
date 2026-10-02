import type { FieldDescription, Properties } from './types';

/** The part of the Web Storage API a draft needs. `localStorage` fits as is. */
export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface FormDraftOptions {
  /** Storage key. Use one per form, and per record when editing existing data. */
  key: string;
  /**
   * Where the draft is kept. Defaults to `localStorage` when there is one;
   * without it (server rendering, a locked-down browser) the draft does
   * nothing rather than throw.
   */
  storage?: DraftStorage;
  /**
   * Bump this when the shape of the form changes. A draft saved under another
   * version is discarded instead of being loaded into fields that no longer
   * match it.
   */
  version?: string | number;
  /**
   * Writes are held back this long after the last `save`, so typing does not
   * serialise the form on every keystroke. `0` writes at once. Default 300.
   */
  debounceMs?: number;
  /** A draft older than this is discarded on load. No limit by default. */
  maxAgeMs?: number;
  /**
   * Top-level field names that are never written. Passwords and file inputs
   * belong here; see `draftExclusions`.
   */
  exclude?: string[];
  /**
   * Called when storage refuses a read or a write: the quota is full, the
   * stored text is not ours, the data cannot be serialised. The draft carries
   * on without it either way.
   */
  onError?: (error: unknown) => void;
  /** Clock, for tests. */
  now?: () => number;
}

export interface FormDraft<T extends Properties = Properties> {
  /** The saved data, or undefined when there is no usable draft. */
  load(): T | undefined;
  /** Schedules a write of `data`. */
  save(data: T): void;
  /** Writes a pending `save` now, for example before the page unloads. */
  flush(): void;
  /** Removes the draft and drops any pending write. Call it after a submit. */
  clear(): void;
  /** When the stored draft was written, in milliseconds since the epoch. */
  savedAt(): number | undefined;
}

interface Envelope {
  v: string | number | null;
  t: number;
  d: Properties;
}

function defaultStorage(): DraftStorage | undefined {
  try {
    // Reading the property itself throws in some sandboxed frames.
    return (globalThis as { localStorage?: DraftStorage }).localStorage;
  } catch {
    return undefined;
  }
}

function isEnvelope(value: unknown): value is Envelope {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.t === 'number' &&
    typeof candidate.d === 'object' &&
    candidate.d !== null &&
    !Array.isArray(candidate.d)
  );
}

/**
 * Field names a draft should leave out: passwords, which do not belong in
 * storage, and file inputs, whose values cannot be serialised. Only top-level
 * fields are looked at.
 */
export function draftExclusions(fields: FieldDescription[]): string[] {
  return fields
    .filter((field) => field.type === 'password' || field.type === 'file')
    .map((field) => field.name);
}

/**
 * Keeps a form's data in storage between visits, so a reload or a closed tab
 * does not lose what was typed.
 *
 * It is not tied to an adapter: load the draft into the form's initial
 * values, call `save` whenever the data changes, and `clear` once the form
 * has been submitted.
 */
export function createFormDraft<T extends Properties = Properties>(
  options: FormDraftOptions,
): FormDraft<T> {
  const storage = options.storage ?? defaultStorage();
  const version = options.version ?? null;
  const debounceMs = options.debounceMs ?? 300;
  const exclude = new Set(options.exclude ?? []);
  const now = options.now ?? Date.now;
  const report = (error: unknown) => options.onError?.(error);

  let pending: T | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function read(): Envelope | undefined {
    if (!storage) {
      return undefined;
    }
    try {
      const raw = storage.getItem(options.key);
      if (raw === null) {
        return undefined;
      }
      const parsed: unknown = JSON.parse(raw);
      if (!isEnvelope(parsed)) {
        throw new TypeError(`"${options.key}" does not hold a form draft`);
      }
      return parsed;
    } catch (error) {
      report(error);
      return undefined;
    }
  }

  function remove(): void {
    try {
      storage?.removeItem(options.key);
    } catch (error) {
      report(error);
    }
  }

  function write(data: T): void {
    if (!storage) {
      return;
    }
    const kept: Properties = {};
    for (const [name, value] of Object.entries(data)) {
      if (!exclude.has(name)) {
        kept[name] = value;
      }
    }
    try {
      const envelope: Envelope = { v: version, t: now(), d: kept };
      storage.setItem(options.key, JSON.stringify(envelope));
    } catch (error) {
      report(error);
    }
  }

  function cancel(): void {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    pending = undefined;
  }

  function flush(): void {
    const data = pending;
    cancel();
    if (data !== undefined) {
      write(data);
    }
  }

  return {
    load() {
      const envelope = read();
      if (!envelope) {
        return undefined;
      }
      const stale =
        envelope.v !== version ||
        (options.maxAgeMs !== undefined &&
          now() - envelope.t > options.maxAgeMs);
      if (stale) {
        // Left in place it would be read and rejected on every visit.
        remove();
        return undefined;
      }
      return envelope.d as T;
    },

    save(data) {
      if (debounceMs <= 0) {
        cancel();
        write(data);
        return;
      }
      pending = data;
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      timer = setTimeout(flush, debounceMs);
    },

    flush,

    clear() {
      cancel();
      remove();
    },

    savedAt() {
      return read()?.t;
    },
  };
}
