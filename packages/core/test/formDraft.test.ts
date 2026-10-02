import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createFormDraft,
  draftExclusions,
  type DraftStorage,
} from '../src/formDraft';
import type { FieldDescription } from '../src/types';

function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  const storage: DraftStorage = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
  return { storage, items };
}

describe('createFormDraft', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('saves after the debounce window and loads the data back', () => {
    const { storage, items } = memoryStorage();
    const draft = createFormDraft({ key: 'signup', storage, now: () => 1000 });

    expect(draft.load()).toBeUndefined();
    expect(draft.savedAt()).toBeUndefined();

    draft.save({ name: 'A' });
    draft.save({ name: 'Ad' });
    draft.save({ name: 'Ada' });
    expect(items.size).toBe(0);

    vi.advanceTimersByTime(299);
    expect(items.size).toBe(0);
    vi.advanceTimersByTime(1);

    expect(JSON.parse(items.get('signup') as string)).toEqual({
      v: null,
      t: 1000,
      d: { name: 'Ada' },
    });
    expect(draft.load()).toEqual({ name: 'Ada' });
    expect(draft.savedAt()).toBe(1000);
  });

  it('writes at once when debounceMs is 0, dropping an earlier pending write', () => {
    const { storage, items } = memoryStorage();
    const slow = createFormDraft({ key: 'a', storage });
    slow.save({ step: 1 });

    const fast = createFormDraft({ key: 'b', storage, debounceMs: 0 });
    fast.save({ step: 2 });
    expect(JSON.parse(items.get('b') as string).d).toEqual({ step: 2 });
    expect(items.has('a')).toBe(false);

    fast.save({ step: 3 });
    expect(fast.load()).toEqual({ step: 3 });
  });

  it('flush writes the pending data now and only once', () => {
    const { storage, items } = memoryStorage();
    const setItem = vi.spyOn(storage, 'setItem');
    const draft = createFormDraft({ key: 'k', storage });

    draft.flush();
    expect(setItem).not.toHaveBeenCalled();

    draft.save({ a: 1 });
    draft.flush();
    expect(JSON.parse(items.get('k') as string).d).toEqual({ a: 1 });

    vi.advanceTimersByTime(1000);
    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it('clear removes the draft and cancels a pending write', () => {
    const { storage, items } = memoryStorage();
    const draft = createFormDraft({ key: 'k', storage });
    draft.save({ a: 1 });
    draft.flush();
    draft.save({ a: 2 });

    draft.clear();
    vi.advanceTimersByTime(1000);

    expect(items.size).toBe(0);
    expect(draft.load()).toBeUndefined();
  });

  it('never writes excluded fields', () => {
    const { storage } = memoryStorage();
    const draft = createFormDraft({
      key: 'k',
      storage,
      debounceMs: 0,
      exclude: ['password', 'avatar'],
    });

    draft.save({ email: 'a@b.c', password: 'hunter2', avatar: { size: 3 } });

    expect(draft.load()).toEqual({ email: 'a@b.c' });
  });

  it('discards a draft saved under another version', () => {
    const { storage, items } = memoryStorage();
    createFormDraft({ key: 'k', storage, debounceMs: 0, version: 1 }).save({
      a: 1,
    });

    expect(createFormDraft({ key: 'k', storage, version: 1 }).load()).toEqual({
      a: 1,
    });
    expect(
      createFormDraft({ key: 'k', storage, version: 2 }).load(),
    ).toBeUndefined();
    expect(items.size).toBe(0);
  });

  it('discards a draft older than maxAgeMs', () => {
    const { storage, items } = memoryStorage();
    let clock = 1_000;
    const draft = createFormDraft({
      key: 'k',
      storage,
      debounceMs: 0,
      maxAgeMs: 60_000,
      now: () => clock,
    });
    draft.save({ a: 1 });

    clock += 60_000;
    expect(draft.load()).toEqual({ a: 1 });
    clock += 1;
    expect(draft.load()).toBeUndefined();
    expect(items.size).toBe(0);
  });

  it('ignores stored text that is not a draft and reports it', () => {
    const onError = vi.fn();
    for (const stored of [
      'not json',
      '"text"',
      '{"t":"x","d":{}}',
      '{"t":1,"d":[]}',
      'null',
    ]) {
      const { storage } = memoryStorage({ k: stored });
      const draft = createFormDraft({ key: 'k', storage, onError });
      expect(draft.load()).toBeUndefined();
      expect(draft.savedAt()).toBeUndefined();
    }
    expect(onError).toHaveBeenCalledTimes(10);
  });

  it('survives a storage that throws on every call', () => {
    const boom = () => {
      throw new Error('QuotaExceededError');
    };
    const onError = vi.fn();
    const draft = createFormDraft({
      key: 'k',
      storage: { getItem: boom, setItem: boom, removeItem: boom },
      debounceMs: 0,
      onError,
    });

    expect(() => draft.save({ a: 1 })).not.toThrow();
    expect(draft.load()).toBeUndefined();
    expect(() => draft.clear()).not.toThrow();
    expect(onError).toHaveBeenCalledTimes(3);
  });

  it('reports data that cannot be serialised instead of throwing', () => {
    const { storage, items } = memoryStorage();
    const onError = vi.fn();
    const draft = createFormDraft({
      key: 'k',
      storage,
      debounceMs: 0,
      onError,
    });
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() => draft.save(circular)).not.toThrow();
    expect(items.size).toBe(0);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('uses localStorage by default and does nothing without one', () => {
    const { storage, items } = memoryStorage();
    vi.stubGlobal('localStorage', storage);
    createFormDraft({ key: 'k', debounceMs: 0 }).save({ a: 1 });
    expect(items.has('k')).toBe(true);

    vi.stubGlobal('localStorage', undefined);
    const inert = createFormDraft({ key: 'k', debounceMs: 0 });
    expect(() => inert.save({ a: 2 })).not.toThrow();
    expect(inert.load()).toBeUndefined();
    expect(() => inert.clear()).not.toThrow();
  });

  it('does nothing when reading localStorage itself throws', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      'localStorage',
    );
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError');
      },
    });
    try {
      const draft = createFormDraft({ key: 'k', debounceMs: 0 });
      expect(() => draft.save({ a: 1 })).not.toThrow();
      expect(draft.load()).toBeUndefined();
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, 'localStorage', descriptor);
      } else {
        delete (globalThis as { localStorage?: unknown }).localStorage;
      }
    }
  });
});

describe('draftExclusions', () => {
  it('names the top-level password and file fields', () => {
    const fields: FieldDescription[] = [
      { name: 'email', type: 'email' },
      { name: 'password', type: 'password' },
      { name: 'avatar', type: 'file' },
      {
        name: 'accounts',
        type: 'text',
        fields: [{ name: 'secret', type: 'password' }],
      },
    ];

    expect(draftExclusions(fields)).toEqual(['password', 'avatar']);
  });
});
