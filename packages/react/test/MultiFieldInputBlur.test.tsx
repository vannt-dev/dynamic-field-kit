import type { FieldDescription } from '@dynamic-field-kit/core';
import { fireEvent, render, screen } from '@testing-library/react';
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

const fields: FieldDescription[] = [
  { name: 'first', type: 'text', label: 'First' },
  { name: 'second', type: 'text', label: 'Second' },
];

describe('MultiFieldInput blur reporting', () => {
  beforeEach(() => {
    fieldRegistry.register(
      'text',
      ({ value, onValueChange, onBlur, id, touched }) => (
        <input
          data-testid={id}
          data-touched={String(Boolean(touched))}
          value={(value as string) ?? ''}
          onChange={(e) => onValueChange?.(e.target.value)}
          onBlur={onBlur}
        />
      ),
    );
  });

  it('reports which field was blurred', () => {
    const onBlurField = vi.fn();
    render(
      <MultiFieldInput
        fieldDescriptions={fields}
        idPrefix="dfk-field"
        onBlurField={onBlurField}
      />,
    );

    fireEvent.blur(screen.getByTestId('dfk-field-second'));

    expect(onBlurField).toHaveBeenCalledWith('second');
  });

  it('reports each field separately', () => {
    const onBlurField = vi.fn();
    render(
      <MultiFieldInput
        fieldDescriptions={fields}
        idPrefix="dfk-field"
        onBlurField={onBlurField}
      />,
    );

    fireEvent.blur(screen.getByTestId('dfk-field-first'));
    fireEvent.blur(screen.getByTestId('dfk-field-second'));

    expect(onBlurField.mock.calls.map(([name]) => name)).toEqual([
      'first',
      'second',
    ]);
  });

  it('still tracks touched internally when no handler is passed', () => {
    expect(() => {
      render(
        <MultiFieldInput fieldDescriptions={fields} idPrefix="dfk-field" />,
      );
      fireEvent.blur(screen.getByTestId('dfk-field-first'));
    }).not.toThrow();
  });

  it('reports the full path for a field inside a repeatable group', () => {
    const onBlurField = vi.fn();
    render(
      <MultiFieldInput
        fieldDescriptions={[
          {
            name: 'contacts',
            type: 'text',
            fields: [{ name: 'email', type: 'text' }],
          },
        ]}
        properties={{ contacts: [{ email: '' }] }}
        onBlurField={onBlurField}
      />,
    );

    fireEvent.blur(screen.getByRole('textbox'));
    expect(onBlurField).toHaveBeenCalledWith('contacts[0].email');
  });

  it('lets the owner clear touched inside a repeatable group', () => {
    // An item with no touched keys must still count as controlled, or the
    // nested MultiFieldInput falls back to its own internal tracker and keeps
    // showing touched after the owner resets the map.
    const Harness = () => {
      const [touched, setTouched] = React.useState<Record<string, boolean>>({});
      return (
        <>
          <button onClick={() => setTouched({})}>reset</button>
          <MultiFieldInput
            fieldDescriptions={[
              {
                name: 'contacts',
                type: 'text',
                fields: [{ name: 'email', type: 'text' }],
              },
            ]}
            properties={{ contacts: [{ email: '' }] }}
            touched={touched}
            onBlurField={(key) =>
              setTouched((prev) => ({ ...prev, [key]: true }))
            }
          />
        </>
      );
    };

    render(<Harness />);
    const input = screen.getByRole('textbox');

    fireEvent.blur(input);
    expect(input.dataset.touched).toBe('true');

    fireEvent.click(screen.getByText('reset'));
    expect(input.dataset.touched).toBe('false');
  });
});
