import { fieldsFromJsonSchema } from '@dynamic-field-kit/core';
import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MultiFieldInput } from '../src';

describe('a form generated from a JSON Schema', () => {
  it('renders with the default renderers and reports changes', () => {
    const { fields, defaults, warnings } = fieldsFromJsonSchema({
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', format: 'email' },
        age: { type: 'integer', minimum: 18 },
        plan: { enum: ['free', 'pro'], default: 'free' },
        newsletter: { type: 'boolean' },
        contacts: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            properties: { phone: { type: 'string' } },
          },
        },
      },
    });
    expect(warnings).toEqual([]);

    const onChange = vi.fn();
    const { container } = render(
      <MultiFieldInput
        fieldDescriptions={fields}
        properties={defaults}
        onChange={onChange}
      />,
    );

    const inputTypes = [...container.querySelectorAll('input')].map(
      (input) => input.type,
    );
    // email, age, newsletter, then the phone of the one seeded contact.
    expect(inputTypes).toEqual(['email', 'number', 'checkbox', 'text']);
    const select = container.querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('free');
    expect([...select.options].map((option) => option.value)).toContain('pro');

    const email = container.querySelector(
      'input[type="email"]',
    ) as HTMLInputElement;
    fireEvent.change(email, { target: { value: 'ada@example.com' } });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ email: 'ada@example.com', plan: 'free' }),
    );
  });
});
