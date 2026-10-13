import type { FieldDescription, Properties } from '@dynamic-field-kit/core';
import { describe, expect, it } from 'vitest';
import '../src/layout/defaultLayouts';
import FormHarness from './fixtures/FormHarness.svelte';
import { seen } from './fixtures/ProbeRenderer.svelte';
import { probeRegistry, render, settle, type } from './helpers';

const phone: FieldDescription = {
  name: 'phone',
  type: 'text',
  mask: '(999) 999-9999',
};

// A form that keeps what its fields report, the way an application's does.
function mountForm(fields: FieldDescription[], initialValues: Properties) {
  const { target } = render(
    FormHarness,
    { fields, initialValues },
    probeRegistry(),
  );
  const input = () => target.querySelector<HTMLInputElement>('input')!;
  const data = () =>
    JSON.parse(target.querySelector('[data-testid="data"]')!.textContent!);
  return { input, data };
}

describe('a field with a mask', () => {
  it('shows the formatted text and stores what was typed', () => {
    const { input, data } = mountForm([phone], { phone: '' });
    expect(input().value).toBe('');

    type(input(), '5');
    expect(input().value).toBe('(5');
    type(input(), '(5551');
    expect(input().value).toBe('(555) 1');
    expect(data()).toEqual({ phone: '5551' });
  });

  it('lays out a value the form already holds', () => {
    const { input } = mountForm([phone], { phone: '5551234567' });
    expect(input().value).toBe('(555) 123-4567');
  });

  it('takes the character before a separator that was deleted', () => {
    const { input, data } = mountForm([phone], { phone: '5551234567' });
    type(input(), '(555 123-4567');
    expect(data()).toEqual({ phone: '551234567' });
    expect(input().value).toBe('(551) 234-567');
  });

  it('does not leave on screen what the mask refused', async () => {
    const { input, data } = mountForm([phone], { phone: '' });

    // A letter where a digit belongs: nothing is stored, nothing is shown.
    type(input(), 'x');
    await settle();
    expect(data()).toEqual({ phone: '' });
    expect(input().value).toBe('');

    // One digit more than the pattern has places for.
    type(input(), '5551234567');
    expect(input().value).toBe('(555) 123-4567');
    type(input(), '(555) 123-45678');
    await settle();
    expect(data()).toEqual({ phone: '5551234567' });
    expect(input().value).toBe('(555) 123-4567');

    // And the same refusal a second time is put right a second time.
    type(input(), '(555) 123-45679');
    await settle();
    expect(input().value).toBe('(555) 123-4567');
  });

  it('does not leave it on screen in a renderer of the application either', async () => {
    const { input, data } = mountForm([{ ...phone, type: 'probe' }], {
      phone: '5551234567',
    });
    type(input(), '(555) 123-45678');
    await settle();
    expect(data()).toEqual({ phone: '5551234567' });
    expect(input().value).toBe('(555) 123-4567');
  });

  it('does not hand parseInput on to the renderer', () => {
    mountForm([{ ...phone, type: 'probe' }], { phone: '555' });
    const props = seen.get('f-phone')!;
    expect(props.value).toBe('(555');
    expect('parseInput' in props).toBe(false);
  });

  it('leaves a field without a mask as it was', () => {
    const { input, data } = mountForm([{ name: 'phone', type: 'text' }], {
      phone: '',
    });
    type(input(), '(555) 1');
    expect(data()).toEqual({ phone: '(555) 1' });
    expect(input().value).toBe('(555) 1');
  });

  it('works for a field inside a repeatable group', () => {
    const { input, data } = mountForm(
      [{ name: 'contacts', type: 'text', fields: [phone] }],
      { contacts: [{ phone: '' }] },
    );
    type(input(), '5551234');
    expect(data()).toEqual({ contacts: [{ phone: '5551234' }] });
    expect(input().value).toBe('(555) 123-4');
  });
});
