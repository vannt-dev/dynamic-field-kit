import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createOptionsLoader,
  isAsyncOptions,
  type OptionsState,
} from '../src/optionsLoader';
import type { FieldDescription, Properties } from '../src/types';
import { resolveOptions } from '../src/validation';

const OPTIONS: Properties[] = [{ label: 'Hanoi', value: 'hn' }];

function collect() {
  const states: OptionsState[] = [];
  return { states, onChange: (s: OptionsState) => states.push({ ...s }) };
}

describe('isAsyncOptions', () => {
  it('is false for a static array', () => {
    expect(isAsyncOptions({ name: 'a', type: 'text', options: OPTIONS })).toBe(
      false,
    );
  });

  it('is false for a synchronous function', () => {
    expect(
      isAsyncOptions({ name: 'a', type: 'text', options: () => OPTIONS }),
    ).toBe(false);
  });

  it('is true for a native async function', () => {
    expect(
      isAsyncOptions({
        name: 'a',
        type: 'text',
        options: async () => OPTIONS,
      }),
    ).toBe(true);
  });

  it('honours an explicit optionsMode for a promise-returning non-async fn', () => {
    expect(
      isAsyncOptions({
        name: 'a',
        type: 'text',
        optionsMode: 'async',
        options: () => Promise.resolve(OPTIONS),
      }),
    ).toBe(true);
  });
});

describe('resolveOptions leaves async loaders alone', () => {
  it('returns undefined rather than handing the renderer a promise', () => {
    const field: FieldDescription = {
      name: 'city',
      type: 'text',
      options: async () => OPTIONS,
    };
    expect(resolveOptions(field, {})).toBeUndefined();
  });

  it('still resolves a synchronous function', () => {
    const field: FieldDescription = {
      name: 'city',
      type: 'text',
      options: () => OPTIONS,
    };
    expect(resolveOptions(field, {})).toEqual(OPTIONS);
  });
});

describe('createOptionsLoader', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fetches once and reports idle -> loading -> ready', async () => {
    const field: FieldDescription = {
      name: 'city',
      type: 'text',
      options: async () => OPTIONS,
    };
    const { states, onChange } = collect();
    const loader = createOptionsLoader(field, onChange);

    expect(loader.current().status).toBe('idle');
    loader.update({});
    expect(states.map((s) => s.status)).toEqual(['loading']);

    await vi.runAllTimersAsync();

    expect(states.map((s) => s.status)).toEqual(['loading', 'ready']);
    expect(loader.current().options).toEqual(OPTIONS);
  });

  it('collapses calls inside the debounce window into one fetch', async () => {
    const load = vi.fn(async () => OPTIONS);
    const field: FieldDescription = {
      name: 'city',
      type: 'text',
      options: load,
      debounceMs: 100,
      optionsDeps: (data) => [data.country],
    };
    const loader = createOptionsLoader(field, () => {});

    loader.update({ country: 'a' });
    loader.update({ country: 'b' });
    loader.update({ country: 'c' });

    await vi.advanceTimersByTimeAsync(150);

    expect(load).toHaveBeenCalledTimes(1);
    expect(loader.current().options).toEqual(OPTIONS);
  });

  it('does not refetch when the deps are unchanged', async () => {
    const load = vi.fn(async () => OPTIONS);
    const field: FieldDescription = {
      name: 'city',
      type: 'text',
      options: load,
      optionsDeps: (data) => [data.country],
    };
    const loader = createOptionsLoader(field, () => {});

    loader.update({ country: 'vn', unrelated: 1 });
    await vi.runAllTimersAsync();
    loader.update({ country: 'vn', unrelated: 2 });
    await vi.runAllTimersAsync();

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('refetches when the deps change', async () => {
    const load = vi.fn(async () => OPTIONS);
    const field: FieldDescription = {
      name: 'city',
      type: 'text',
      options: load,
      optionsDeps: (data) => [data.country],
    };
    const loader = createOptionsLoader(field, () => {});

    loader.update({ country: 'vn' });
    await vi.runAllTimersAsync();
    loader.update({ country: 'us' });
    await vi.runAllTimersAsync();

    expect(load).toHaveBeenCalledTimes(2);
  });

  it('fetches exactly once with no optionsDeps declared', async () => {
    const load = vi.fn(async () => OPTIONS);
    const field: FieldDescription = {
      name: 'city',
      type: 'text',
      options: load,
    };
    const loader = createOptionsLoader(field, () => {});

    loader.update({ a: 1 });
    loader.update({ a: 2 });
    await vi.runAllTimersAsync();

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('aborts the previous run when a newer one starts', async () => {
    const signals: AbortSignal[] = [];
    const field: FieldDescription = {
      name: 'city',
      type: 'text',
      options: async (_data, _root, ctx) => {
        signals.push(ctx!.signal);
        return OPTIONS;
      },
    };
    const loader = createOptionsLoader(field, () => {});

    loader.setQuery('a');
    loader.setQuery('b');
    await vi.runAllTimersAsync();

    expect(signals).toHaveLength(2);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it('discards a slow first response that lands after a faster second', async () => {
    const field: FieldDescription = {
      name: 'city',
      type: 'text',
      options: async (_data, _root, ctx) => {
        if (ctx?.query === 'slow') {
          await new Promise((resolve) => setTimeout(resolve, 500));
          return [{ value: 'STALE' }];
        }
        return [{ value: 'FRESH' }];
      },
    };
    const loader = createOptionsLoader(field, () => {});

    loader.setQuery('slow');
    loader.setQuery('fast');
    await vi.advanceTimersByTimeAsync(1000);

    expect(loader.current().options).toEqual([{ value: 'FRESH' }]);
  });

  it('reports a rejection as an error state without throwing', async () => {
    const boom = new Error('network down');
    const field: FieldDescription = {
      name: 'city',
      type: 'text',
      optionsMode: 'async',
      options: () => Promise.reject(boom),
    };
    const loader = createOptionsLoader(field, () => {});

    loader.update({});
    await vi.runAllTimersAsync();

    expect(loader.current().status).toBe('error');
    expect(loader.current().error).toBe(boom);
  });

  it('does not report an AbortError as an error state', async () => {
    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    const field: FieldDescription = {
      name: 'city',
      type: 'text',
      optionsMode: 'async',
      options: () => Promise.reject(abortErr),
    };
    const loader = createOptionsLoader(field, () => {});

    loader.update({});
    await vi.runAllTimersAsync();

    expect(loader.current().status).not.toBe('error');
  });

  it('passes the query through to the loader', async () => {
    const seen: (string | undefined)[] = [];
    const field: FieldDescription = {
      name: 'user',
      type: 'text',
      options: async (_data, _root, ctx) => {
        seen.push(ctx?.query);
        return OPTIONS;
      },
    };
    const loader = createOptionsLoader(field, () => {});

    loader.setQuery('ada');
    await vi.runAllTimersAsync();

    expect(seen).toEqual(['ada']);
  });

  it('stops emitting after dispose', async () => {
    const { states, onChange } = collect();
    const field: FieldDescription = {
      name: 'city',
      type: 'text',
      options: async () => OPTIONS,
    };
    const loader = createOptionsLoader(field, onChange);

    loader.update({});
    loader.dispose();
    await vi.runAllTimersAsync();

    expect(states.map((s) => s.status)).toEqual(['loading']);
  });
});
