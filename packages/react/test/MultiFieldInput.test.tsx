import type { FieldDescription } from '@dynamic-field-kit/core';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MultiFieldInput from '../src/components/MultiFieldInput';
import { fieldRegistry } from '../src/fieldRegistry';
import { layoutRegistry } from '../src/layout/layoutRegistry';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
    email: string;
  }
}

describe('MultiFieldInput', () => {
  const mockTextRenderer = vi.fn(
    ({
      value,
      label,
      onValueChange,
    }: {
      value?: string;
      label?: string;
      onValueChange?: (v: string) => void;
    }) => (
      <div data-testid="text-input">
        <label>{label}</label>
        <input
          data-testid="input"
          value={value || ''}
          onChange={(e) => onValueChange?.(e.target.value)}
        />
      </div>
    )
  );

  const mockColumnLayout = vi.fn(
    ({ children }: { children: React.ReactNode }) => (
      <div data-testid="column-layout">{children}</div>
    )
  );

  beforeEach(() => {
    vi.clearAllMocks();
    fieldRegistry.register('text', mockTextRenderer);
    layoutRegistry.register('column', mockColumnLayout);
  });

  it('should render all fields from fieldDescriptions', () => {
    const fields: FieldDescription[] = [
      { name: 'firstName', type: 'text', label: 'First Name' },
      { name: 'lastName', type: 'text', label: 'Last Name' },
    ];

    render(<MultiFieldInput fieldDescriptions={fields} />);

    expect(screen.getAllByTestId('text-input')).toHaveLength(2);
    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('Last Name')).toBeInTheDocument();
  });

  it('should initialize with provided properties', () => {
    const fields: FieldDescription[] = [
      { name: 'name', type: 'text', label: 'Name' },
    ];

    render(
      <MultiFieldInput
        fieldDescriptions={fields}
        properties={{ name: 'John Doe' }}
      />
    );

    expect(screen.getByTestId('input')).toHaveValue('John Doe');
  });

  it('should call onChange when field value changes', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const onChange = vi.fn();

    const fields: FieldDescription[] = [{ name: 'name', type: 'text' }];

    render(<MultiFieldInput fieldDescriptions={fields} onChange={onChange} />);

    await userEvent.type(screen.getByTestId('input'), 'Jane');

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'Jane' })
    );
  });

  it('should filter fields based on appearCondition', () => {
    const fields: FieldDescription[] = [
      { name: 'firstName', type: 'text', label: 'First Name' },
      {
        name: 'lastName',
        type: 'text',
        label: 'Last Name',
        appearCondition: (data) => data.firstName === 'John',
      },
    ];

    const { rerender } = render(
      <MultiFieldInput
        fieldDescriptions={fields}
        properties={{ firstName: 'John' }}
      />
    );

    expect(screen.getAllByTestId('text-input')).toHaveLength(2);

    rerender(
      <MultiFieldInput
        fieldDescriptions={fields}
        properties={{ firstName: 'Jane' }}
      />
    );

    expect(screen.queryByText('Last Name')).not.toBeInTheDocument();
  });

  it('should render with default column layout', () => {
    const fields: FieldDescription[] = [
      { name: 'field1', type: 'text' },
      { name: 'field2', type: 'text' },
    ];

    render(<MultiFieldInput fieldDescriptions={fields} />);

    expect(screen.getByTestId('column-layout')).toBeInTheDocument();
  });

  it('should throw error for unknown layout', () => {
    layoutRegistry.register('unknown-layout', vi.fn() as any);
    vi.stubGlobal('console', { ...console, error: vi.fn() });

    const fields: FieldDescription[] = [{ name: 'field1', type: 'text' }];

    expect(() => {
      render(
        <MultiFieldInput
          fieldDescriptions={fields}
          layout={{ type: 'unknown' } as any}
        />
      );
    }).toThrow('Unknown layout');

    vi.restoreAllMocks();
  });

  it('should update data state when properties prop changes', () => {
    const fields: FieldDescription[] = [{ name: 'name', type: 'text' }];

    const { rerender } = render(
      <MultiFieldInput
        fieldDescriptions={fields}
        properties={{ name: 'Initial' }}
      />
    );

    expect(screen.getByTestId('input')).toHaveValue('Initial');

    rerender(
      <MultiFieldInput
        fieldDescriptions={fields}
        properties={{ name: 'Updated' }}
      />
    );

    expect(screen.getByTestId('input')).toHaveValue('Updated');
  });
});
