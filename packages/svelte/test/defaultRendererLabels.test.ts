import { FieldRegistry, type FieldDescription } from '@dynamic-field-kit/core';
import { describe, expect, it } from 'vitest';
import MultiFieldInput from '../src/components/MultiFieldInput.svelte';
import '../src/layout/defaultLayouts';
import { probeRegistry, render } from './helpers';

// The registry's field types are open-ended; these tests use plain strings.
const list = (fields: unknown[]) => fields as FieldDescription[];

const options = [
  { label: 'Vietnam', value: 'VN' },
  { label: 'United States', value: 'US' },
];

// Every built-in type except radio, which is a group rather than one control.
const single = [
  'text',
  'number',
  'password',
  'email',
  'textarea',
  'checkbox',
  'select',
  'range',
  'file',
  'date',
  'time',
  'datetime-local',
  'switch',
];

function mountFields(
  fields: FieldDescription[],
  errors?: Record<string, string[]>,
  registry = new FieldRegistry(),
) {
  return render(
    MultiFieldInput,
    { fieldDescriptions: fields, properties: {}, idPrefix: 'f', errors },
    registry,
  ).target;
}

/** The control a label names, the way assistive technology finds it. */
function byLabelText(text: string): HTMLElement {
  const label = [...document.querySelectorAll('label')].find(
    (element) => element.textContent?.trim() === text,
  );
  const control = label?.htmlFor
    ? document.getElementById(label.htmlFor)
    : label?.querySelector('input');
  if (!control) {
    throw new Error(`no control labelled "${text}"`);
  }
  expect(
    [...((control as HTMLInputElement).labels ?? [])].includes(label!),
  ).toBe(true);
  return control;
}

describe('built-in renderers', () => {
  it.each(single)('label a %s control with <label for>', (type) => {
    mountFields(list([{ name: 'x', type, label: `The ${type}`, options }]));
    const control = byLabelText(`The ${type}`);
    expect(control.id).toBe('f-x');
    expect(control.tagName).toMatch(/INPUT|SELECT|TEXTAREA/);
  });

  it('name a radio group after its caption', () => {
    const target = mountFields(
      list([{ name: 'country', type: 'radio', label: 'Country', options }]),
    );
    const group = target.querySelector('[role="radiogroup"]')!;
    const caption = document.getElementById(
      group.getAttribute('aria-labelledby')!,
    );
    expect(caption?.textContent).toBe('Country');
    expect(group.id).toBe('f-country');
  });

  it('keep label, control and message together in one element', () => {
    const target = mountFields(
      list([{ name: 'email', type: 'email', label: 'Email' }]),
      { email: ['Invalid email'] },
    );
    const field = target.querySelector('.dfk-field')!;
    const control = byLabelText('Email');
    expect(field.contains(control)).toBe(true);
    expect(control.getAttribute('aria-invalid')).toBe('true');
    const message = document.getElementById(
      control.getAttribute('aria-describedby')!,
    );
    expect(message?.textContent?.trim()).toBe('Invalid email');
    expect(field.contains(message)).toBe(true);
  });

  it('draw no label for a field without one', () => {
    const target = mountFields(list([{ name: 'x', type: 'text' }]));
    expect(target.querySelector('.dfk-field-label')).toBeNull();
    expect(target.querySelector('.dfk-field input')).not.toBeNull();
  });

  it('leave a registered renderer as it was: no wrapper, no label', () => {
    const target = mountFields(
      list([{ name: 'x', type: 'probe', label: 'X' }]),
      undefined,
      probeRegistry(),
    );
    expect(target.querySelector('input')).not.toBeNull();
    expect(target.querySelector('.dfk-field')).toBeNull();
    expect(target.querySelector('.dfk-field-label')).toBeNull();
  });
});
