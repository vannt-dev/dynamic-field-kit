import type { FieldDescription } from '@dynamic-field-kit/core';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MultiFieldInput from '../src/components/MultiFieldInput';
import { fieldRegistry } from '../src/fieldRegistry';
import '../src/layout/defaultLayouts';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
  }
}

describe('FieldGroupInput (repeatable field group)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fieldRegistry.register(
      'text',
      vi.fn(({ value, onValueChange, label }: any) => (
        <div data-testid="field">
          <label>{label}</label>
          <input
            data-testid="input"
            value={value || ''}
            onChange={(e: any) => onValueChange?.(e.target.value)}
          />
        </div>
      )) as any,
    );
  });

  const contactsField: FieldDescription = {
    name: 'contacts',
    type: 'group' as any,
    label: 'Contacts',
    fields: [{ name: 'email', type: 'text', label: 'Email' }],
    defaultItem: { email: '' },
  };

  it('should render one nested form per item', () => {
    render(
      <MultiFieldInput
        fieldDescriptions={[contactsField]}
        properties={{ contacts: [{ email: 'a@x.com' }, { email: 'b@x.com' }] }}
      />,
    );

    const inputs = screen.getAllByTestId('input');
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveValue('a@x.com');
    expect(inputs[1]).toHaveValue('b@x.com');
  });

  it('should add a new item seeded from defaultItem', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const onChange = vi.fn();

    render(
      <MultiFieldInput
        fieldDescriptions={[contactsField]}
        properties={{ contacts: [] }}
        onChange={onChange}
      />,
    );

    expect(screen.queryAllByTestId('input')).toHaveLength(0);

    await userEvent.click(screen.getByRole('button', { name: /Add/ }));

    expect(screen.getAllByTestId('input')).toHaveLength(1);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ contacts: [{ email: '' }] }),
    );
  });

  it('should remove an item', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const onChange = vi.fn();

    render(
      <MultiFieldInput
        fieldDescriptions={[contactsField]}
        properties={{ contacts: [{ email: 'a@x.com' }, { email: 'b@x.com' }] }}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getAllByRole('button', { name: /Remove/ })[0]);

    expect(screen.getAllByTestId('input')).toHaveLength(1);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ contacts: [{ email: 'b@x.com' }] }),
    );
  });

  it('should update the item at the edited index when typing in a nested field', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const onChange = vi.fn();

    render(
      <MultiFieldInput
        fieldDescriptions={[contactsField]}
        properties={{ contacts: [{ email: '' }, { email: '' }] }}
        onChange={onChange}
      />,
    );

    await userEvent.type(screen.getAllByTestId('input')[1], 'x');

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        contacts: [{ email: '' }, { email: 'x' }],
      }),
    );
  });

  it('should respect maxItems and minItems', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const field: FieldDescription = {
      ...contactsField,
      minItems: 1,
      maxItems: 2,
    };

    render(
      <MultiFieldInput
        fieldDescriptions={[field]}
        properties={{ contacts: [{ email: 'a@x.com' }, { email: 'b@x.com' }] }}
      />,
    );

    expect(screen.getByRole('button', { name: /Add/ })).toBeDisabled();

    await userEvent.click(screen.getAllByRole('button', { name: /Remove/ })[0]);
    expect(screen.getByRole('button', { name: /Remove/ })).toBeDisabled();
  });
});
