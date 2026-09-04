import type {
  FieldDescription,
  OptionsFn,
  OptionsStatus,
  Properties,
} from './types';

export interface OptionsState {
  status: OptionsStatus;
  options?: Properties[];
  error?: unknown;
}

export interface OptionsLoader {
  /**
   * Re-evaluates `optionsDeps` against the current data and fetches only when
   * they actually changed. Safe to call on every render or keystroke.
   */
  update(data: Properties, rootData?: Properties): void;
  /**
   * Renderer-driven refetch for a search-remote field. Always fetches (after
   * the debounce), because the query is state the form data never sees.
   */
  setQuery(query: string): void;
  current(): OptionsState;
  /** Aborts anything in flight and stops further callbacks. */
  dispose(): void;
}

/**
 * Whether this field's options are loaded asynchronously.
 *
 * Detected the same way `validationMode` detects async validators
 * (`constructor.name === 'AsyncFunction'`), with `optionsMode: 'async'` as the
 * explicit escape hatch for a function that returns a promise without the
 * `async` keyword.
 */
export function isAsyncOptions(field: FieldDescription): boolean {
  if (field.optionsMode === 'async') {
    return true;
  }
  if (field.optionsMode === 'sync') {
    return false;
  }
  return (
    typeof field.options === 'function' &&
    field.options.constructor?.name === 'AsyncFunction'
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function sameDeps(left: unknown[], right: unknown[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => Object.is(value, right[index]))
  );
}

/**
 * Owns everything hard about loading a field's options asynchronously:
 * debouncing, aborting a superseded run, discarding a response that lands out
 * of order, and deciding whether the dependencies actually changed.
 *
 * Framework-agnostic on purpose. Each adapter wraps this in its own reactivity
 * primitive and forwards the state as renderer props, so the logic exists once
 * rather than three times.
 */
export function createOptionsLoader(
  field: FieldDescription,
  onChange: (state: OptionsState) => void,
): OptionsLoader {
  let state: OptionsState = { status: 'idle' };
  let disposed = false;

  // Incremented per fetch. A response whose run is stale is dropped even if the
  // abort did not take - a fetch implementation is free to ignore the signal,
  // and this is the check that does not depend on it cooperating.
  let run = 0;
  let controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  let lastDeps: unknown[] | undefined;
  let currentQuery: string | undefined;
  let latestData: Properties = {};
  let latestRootData: Properties | undefined;

  function emit(next: OptionsState): void {
    if (disposed) {
      return;
    }
    state = next;
    onChange(state);
  }

  function fetchNow(): void {
    if (disposed) {
      return;
    }
    const thisRun = ++run;
    controller?.abort();
    const thisController = new AbortController();
    controller = thisController;

    emit({ ...state, status: 'loading' });

    const load = field.options as OptionsFn;
    Promise.resolve(
      load(latestData, latestRootData, {
        query: currentQuery,
        signal: thisController.signal,
      }),
    ).then(
      (options) => {
        if (thisRun !== run) {
          return;
        }
        emit({ status: 'ready', options });
      },
      (error: unknown) => {
        if (thisRun !== run) {
          return;
        }
        // Being superseded is normal, not a failure. Reporting it as one would
        // flash an error in the UI on every keystroke of a search box.
        if (isAbortError(error)) {
          return;
        }
        emit({ status: 'error', error, options: state.options });
      },
    );
  }

  function schedule(): void {
    if (disposed) {
      return;
    }
    const wait = field.debounceMs ?? 0;
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    if (wait <= 0) {
      // Not setTimeout(0): the undebounced case should not wait on the timer
      // queue, which in a test with fake timers would never fire at all.
      fetchNow();
      return;
    }
    timer = setTimeout(() => {
      timer = undefined;
      fetchNow();
    }, wait);
  }

  return {
    update(data, rootData) {
      latestData = data;
      latestRootData = rootData;
      const deps = field.optionsDeps?.(data, rootData) ?? [];
      if (lastDeps !== undefined && sameDeps(lastDeps, deps)) {
        return;
      }
      lastDeps = deps;
      schedule();
    },

    setQuery(query) {
      currentQuery = query;
      schedule();
    },

    current() {
      return state;
    },

    dispose() {
      disposed = true;
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      controller?.abort();
    },
  };
}
