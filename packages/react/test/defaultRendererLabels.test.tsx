import type { FieldDescription } from '@dynamic-field-kit/core';
import { FieldRegistry } from '@dynamic-field-kit/core';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import MultiFieldInput from '../src/components/MultiFieldInput';
import { FieldRegistryProvider } from '../src/FieldRegistryContext';
import '../src/layout/defaultLayouts';

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

function renderFields(
  fields: FieldDescription[],
  errors?: Record<string, string[]>,
) {
  // A registry of its own, so no renderer registered by another test file is
  // picked over the built-in one.
  return render(
    <FieldRegistryProvider registry={new FieldRegistry()}>
      <MultiFieldInput
        fieldDescriptions={fields}
        properties={{}}
        idPrefix="f"
        errors={errors}
      />
    </FieldRegistryProvider>,
  );
}

describe('built-in renderers', () => {
  it.each(single)('label a %s control with <label for>', (type) => {
    renderFields(list([{ name: 'x', type, label: `The ${type}`, options }]));
    const control = screen.getByLabelText(`The ${type}`);
    expect(control.id).toBe('f-x');
    expect(control.tagName).toMatch(/INPUT|SELECT|TEXTAREA/);
  });

  it('name a radio group after its caption', () => {
    renderFields(
      list([{ name: 'country', type: 'radio', label: 'Country', options }]),
    );
    const group = screen.getByRole('radiogroup', { name: 'Country' });
    expect(group.id).toBe('f-country');
    // Each button keeps the label of its own option.
    expect(screen.getByLabelText('Vietnam')).toBeTruthy();
  });

  it('keep label, control and message together in one element', () => {
    const { container } = renderFields(
      list([{ name: 'email', type: 'email', label: 'Email' }]),
      { email: ['Invalid email'] },
    );
    const field = container.querySelector('.dfk-field')!;
    expect(field.querySelector('label.dfk-field-label')?.textContent).toBe(
      'Email',
    );
    const control = screen.getByLabelText('Email');
    expect(field.contains(control)).toBe(true);
    expect(control.getAttribute('aria-invalid')).toBe('true');
    const message = document.getElementById(
      control.getAttribute('aria-describedby')!,
    );
    expect(message?.textContent).toBe('Invalid email');
    expect(field.contains(message)).toBe(true);
  });

  it('draw no label for a field without one', () => {
    const { container } = renderFields(list([{ name: 'x', type: 'text' }]));
    expect(container.querySelector('.dfk-field-label')).toBeNull();
    expect(container.querySelector('.dfk-field input')).not.toBeNull();
  });

  it('leave a registered renderer as it was: no wrapper, no label', () => {
    const registry = new FieldRegistry();
    registry.register('text', (() => <input data-testid="mine" />) as never);
    const { container } = render(
      <FieldRegistryProvider registry={registry}>
        <MultiFieldInput
          fieldDescriptions={list([{ name: 'x', type: 'text', label: 'X' }])}
          properties={{}}
        />
      </FieldRegistryProvider>,
    );
    expect(screen.getByTestId('mine')).toBeTruthy();
    expect(container.querySelector('.dfk-field')).toBeNull();
    expect(container.querySelector('label')).toBeNull();
  });
});
