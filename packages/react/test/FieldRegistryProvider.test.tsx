import type { FieldDescription } from '@dynamic-field-kit/core';
import { FieldRegistry, fieldRegistry } from '@dynamic-field-kit/core';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DynamicInput from '../src/components/DynamicInput';
import MultiFieldInput from '../src/components/MultiFieldInput';
import { FieldRegistryProvider } from '../src/FieldRegistryContext';
import '../src/layout/defaultLayouts';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
  }
}

// These tests intentionally exercise the no-provider fallback to the global
// singleton, so they register on it directly. Only 'text' is ever registered
// here — unregister it (public API) instead of poking private state.
afterEach(() => {
  fieldRegistry.unregister('text');
});

describe('FieldRegistryProvider (scoped registry)', () => {
  it('uses the provided registry instead of the global singleton', () => {
    const scoped = new FieldRegistry();
    scoped.register('text', (({ value }: any) => (
      <div data-testid="scoped">scoped:{value}</div>
    )) as any);

    render(
      <FieldRegistryProvider registry={scoped as any}>
        <DynamicInput type="text" value="hi" />
      </FieldRegistryProvider>
    );

    expect(screen.getByTestId('scoped')).toHaveTextContent('scoped:hi');
  });

  it('falls back to the global registry with no provider', () => {
    fieldRegistry.register('text', (({ value }: any) => (
      <div data-testid="global">global:{value}</div>
    )) as any);

    render(<DynamicInput type="text" value="yo" />);

    expect(screen.getByTestId('global')).toHaveTextContent('global:yo');
  });
});

describe('keyField', () => {
  it('keeps input state tied to the item identity when an item is removed', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    fieldRegistry.register('text', (({ value, onValueChange }: any) => (
      <input
        data-testid="input"
        value={value || ''}
        onChange={(e: any) => onValueChange?.(e.target.value)}
      />
    )) as any);

    const field: FieldDescription = {
      name: 'rows',
      type: 'group' as any,
      keyField: 'id',
      fields: [{ name: 'label', type: 'text' }],
    };

    render(
      <MultiFieldInput
        fieldDescriptions={[field]}
        properties={{
          rows: [
            { id: 'a', label: 'first' },
            { id: 'b', label: 'second' },
          ],
        }}
      />
    );

    expect(screen.getAllByTestId('input')[0]).toHaveValue('first');
    await userEvent.click(screen.getAllByRole('button', { name: /Remove/ })[0]);
    expect(screen.getAllByTestId('input')[0]).toHaveValue('second');
  });
});
