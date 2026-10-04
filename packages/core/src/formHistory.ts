import type { Properties } from './types';

export interface FormHistoryOptions {
  /** How many undo steps are kept; the oldest go first. Default 100. */
  limit?: number;
  /**
   * Pushes that change the same top-level fields within this many
   * milliseconds of each other become one step, so typing a word is undone
   * as a whole. `0` makes every push its own step. Default 500.
   */
  coalesceMs?: number;
  /** Clock, for tests. */
  now?: () => number;
}

export interface FormHistory<T extends Properties = Properties> {
  /** Records the form's data after a change. Data equal to `current()` is ignored. */
  push(data: T): void;
  /** Steps back and returns the data to show, or undefined at the start. */
  undo(): T | undefined;
  /** Steps forward again and returns the data to show, or undefined at the end. */
  redo(): T | undefined;
  canUndo(): boolean;
  canRedo(): boolean;
  /** The data at the current step. */
  current(): T;
  /** Forgets every step and starts again from `data`, for example after a submit. */
  reset(data: T): void;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => isEqual(item, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length &&
      keys.every((key) => key in b && isEqual(a[key], b[key]))
    );
  }
  return false;
}

/** Top-level names whose values differ, sorted so two lists can be compared. */
function changedFields(before: Properties, after: Properties): string {
  const names = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...names]
    .filter((name) => !isEqual(before[name], after[name]))
    .sort()
    .join('\u0000');
}

/**
 * Undo and redo for a form's data.
 *
 * It is not tied to an adapter: push the data whenever it changes, and put
 * what `undo` or `redo` returns back into the form. Pushing that same data
 * back is ignored, so the usual "push on every change" wiring needs no guard.
 * Snapshots are kept by reference, so treat form data as immutable.
 */
export function createFormHistory<T extends Properties = Properties>(
  initial: T,
  options: FormHistoryOptions = {},
): FormHistory<T> {
  const limit = Math.max(1, options.limit ?? 100);
  const coalesceMs = options.coalesceMs ?? 500;
  const now = options.now ?? Date.now;

  let steps: T[] = [initial];
  let index = 0;
  // What the last push changed and when; cleared by anything but a push,
  // so an edit after an undo always starts its own step.
  let lastFields: string | undefined;
  let lastAt = 0;

  return {
    push(data) {
      const current = steps[index];
      if (isEqual(current, data)) {
        return;
      }
      const fields = changedFields(current, data);
      const at = now();
      const merge =
        coalesceMs > 0 &&
        lastFields === fields &&
        index === steps.length - 1 &&
        at - lastAt <= coalesceMs;

      if (merge) {
        steps[index] = data;
      } else {
        steps = steps.slice(0, index + 1);
        steps.push(data);
        if (steps.length > limit + 1) {
          steps = steps.slice(steps.length - limit - 1);
        }
        index = steps.length - 1;
      }
      lastFields = fields;
      lastAt = at;
    },

    undo() {
      if (index === 0) {
        return undefined;
      }
      index -= 1;
      lastFields = undefined;
      return steps[index];
    },

    redo() {
      if (index === steps.length - 1) {
        return undefined;
      }
      index += 1;
      lastFields = undefined;
      return steps[index];
    },

    canUndo: () => index > 0,
    canRedo: () => index < steps.length - 1,
    current: () => steps[index],

    reset(data) {
      steps = [data];
      index = 0;
      lastFields = undefined;
    },
  };
}
