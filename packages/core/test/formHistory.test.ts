import { describe, expect, it } from 'vitest';
import { createFormHistory } from '../src/formHistory';

function clock(start = 0) {
  let time = start;
  return {
    now: () => time,
    advance: (ms: number) => {
      time += ms;
    },
  };
}

describe('createFormHistory', () => {
  it('starts at the initial data with nothing to undo or redo', () => {
    const history = createFormHistory({ name: '' });

    expect(history.current()).toEqual({ name: '' });
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
    expect(history.undo()).toBeUndefined();
    expect(history.redo()).toBeUndefined();
  });

  it('steps back and forward through pushed data', () => {
    const history = createFormHistory({ a: 1 }, { coalesceMs: 0 });
    history.push({ a: 2 });
    history.push({ a: 3 });

    expect(history.undo()).toEqual({ a: 2 });
    expect(history.undo()).toEqual({ a: 1 });
    expect(history.canUndo()).toBe(false);
    expect(history.redo()).toEqual({ a: 2 });
    expect(history.redo()).toEqual({ a: 3 });
    expect(history.canRedo()).toBe(false);
    expect(history.current()).toEqual({ a: 3 });
  });

  it('drops the redo steps when new data is pushed after an undo', () => {
    const history = createFormHistory({ a: 1 }, { coalesceMs: 0 });
    history.push({ a: 2 });
    history.push({ a: 3 });
    history.undo();
    history.push({ a: 9 });

    expect(history.canRedo()).toBe(false);
    expect(history.undo()).toEqual({ a: 2 });
  });

  it('ignores a push of the data it already holds', () => {
    const history = createFormHistory({ a: 1, tags: ['x'] }, { coalesceMs: 0 });
    history.push({ a: 2, tags: ['x'] });
    const restored = history.undo();

    // The form takes the restored data and reports it back unchanged.
    history.push({ a: 1, tags: ['x'] });

    expect(restored).toEqual({ a: 1, tags: ['x'] });
    expect(history.canRedo()).toBe(true);
    expect(history.redo()).toEqual({ a: 2, tags: ['x'] });
  });

  it('merges quick edits of the same fields into one step', () => {
    const time = clock();
    const history = createFormHistory(
      { name: '', email: '' },
      { coalesceMs: 500, now: time.now },
    );

    for (const name of ['h', 'he', 'hel', 'hell', 'hello']) {
      time.advance(100);
      history.push({ name, email: '' });
    }

    expect(history.undo()).toEqual({ name: '', email: '' });
    expect(history.canUndo()).toBe(false);
  });

  it('starts a new step after a pause or when another field changes', () => {
    const time = clock();
    const history = createFormHistory(
      { name: '', email: '' },
      { coalesceMs: 500, now: time.now },
    );

    history.push({ name: 'a', email: '' });
    time.advance(100);
    history.push({ name: 'a', email: 'x' });
    time.advance(100);
    history.push({ name: 'a', email: 'xy' });
    time.advance(1000);
    history.push({ name: 'a', email: 'xyz' });

    expect(history.undo()).toEqual({ name: 'a', email: 'xy' });
    expect(history.undo()).toEqual({ name: 'a', email: '' });
    expect(history.undo()).toEqual({ name: '', email: '' });
  });

  it('does not merge into a step reached by undo', () => {
    const time = clock();
    const history = createFormHistory(
      { n: 0 },
      { coalesceMs: 500, now: time.now },
    );
    history.push({ n: 1 });
    time.advance(1000);
    history.push({ n: 2 });
    history.undo();
    time.advance(10);
    history.push({ n: 5 });

    expect(history.undo()).toEqual({ n: 1 });
  });

  it('keeps at most `limit` steps, dropping the oldest', () => {
    const history = createFormHistory({ n: 0 }, { limit: 3, coalesceMs: 0 });
    for (let n = 1; n <= 5; n += 1) {
      history.push({ n });
    }

    expect(history.undo()).toEqual({ n: 4 });
    expect(history.undo()).toEqual({ n: 3 });
    expect(history.undo()).toEqual({ n: 2 });
    expect(history.canUndo()).toBe(false);
  });

  it('forgets everything on reset', () => {
    const history = createFormHistory({ a: 1 }, { coalesceMs: 0 });
    history.push({ a: 2 });
    history.reset({ a: 7 });

    expect(history.current()).toEqual({ a: 7 });
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
  });

  it('compares values other than plain objects and arrays by identity', () => {
    const first = new Date(0);
    const history = createFormHistory({ at: first }, { coalesceMs: 0 });
    history.push({ at: new Date(0) });

    expect(history.canUndo()).toBe(true);
    expect(history.undo()?.at).toBe(first);
  });
});
