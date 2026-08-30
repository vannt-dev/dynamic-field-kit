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
    fieldRegistry.register('text', ({ value, onValueChange, onBlur, id }) => (
      <input
        data-testid={id}
        value={(value as string) ?? ''}
        onChange={(e) => onValueChange?.(e.target.value)}
        onBlur={onBlur}
      />
    ));
  });

  it('reports which field was blurred', () => {
    const onBlurField = vi.fn();
    render(
      <MultiFieldInput fieldDescriptions={fields} onBlurField={onBlurField} />,
    );

    fireEvent.blur(screen.getByTestId('dfk-field-second'));

    expect(onBlurField).toHaveBeenCalledWith('second');
  });

  it('reports each field separately', () => {
    const onBlurField = vi.fn();
    render(
      <MultiFieldInput fieldDescriptions={fields} onBlurField={onBlurField} />,
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
      render(<MultiFieldInput fieldDescriptions={fields} />);
      fireEvent.blur(screen.getByTestId('dfk-field-first'));
    }).not.toThrow();
  });
});
