// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { focusFirstInvalidField } from '../src/fieldGroup';

describe('focusFirstInvalidField', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('focuses the first element flagged aria-invalid', () => {
    document.body.innerHTML = `
      <input id="first" />
      <input id="bad" aria-invalid="true" />
      <input id="alsoBad" aria-invalid="true" />
    `;

    expect(focusFirstInvalidField()).toBe(true);
    expect(document.activeElement?.id).toBe('bad');
  });

  test('searches only inside the given container', () => {
    document.body.innerHTML = `
      <div id="outside"><input id="outsideBad" aria-invalid="true" /></div>
      <div id="inside"><input id="insideBad" aria-invalid="true" /></div>
    `;
    const container = document.getElementById('inside') as HTMLElement;

    expect(focusFirstInvalidField(container)).toBe(true);
    expect(document.activeElement?.id).toBe('insideBad');
  });

  test('returns false when nothing is invalid', () => {
    document.body.innerHTML = '<input id="fine" />';

    expect(focusFirstInvalidField()).toBe(false);
  });

  test('scrolls the focused field into view when supported', () => {
    document.body.innerHTML = '<input id="bad" aria-invalid="true" />';
    const field = document.getElementById('bad') as HTMLElement;
    field.scrollIntoView = vi.fn();

    focusFirstInvalidField();

    expect(field.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
  });

  test('falls back to document.body when given null', () => {
    document.body.innerHTML = '<input id="bad" aria-invalid="true" />';

    expect(focusFirstInvalidField(null)).toBe(true);
    expect(document.activeElement?.id).toBe('bad');
  });
});
