import type { FieldDescription } from '@dynamic-field-kit/core';
import { FieldRegistry } from '@dynamic-field-kit/core';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import MultiFieldInput from '../src/components/MultiFieldInput';
import { FieldRegistryProvider } from '../src/FieldRegistryContext';
import '../src/layout/defaultLayouts';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
  }
}

// A scoped registry with a text renderer, so each test is isolated from the
// global singleton and from every other test.
function registryWithText() {
  const registry = new FieldRegistry();
  registry.register('text', (({
    value,
    onValueChange,
    error,
    disabled,
    readOnly,
  }: any) => (
    <div>
      <input
        data-testid="input"
        disabled={!!disabled}
        readOnly={!!readOnly}
        value={value || ''}
        onChange={(e: any) => onValueChange?.(e.target.value)}
      />
      {error ? (
        <span data-testid="error">{[].concat(error).join(',')}</span>
      ) : null}
    </div>
  )) as never);
  return registry;
}

function renderForm(ui: React.ReactElement, registry: FieldRegistry) {
  return render(
    <FieldRegistryProvider registry={registry as never}>
      {ui}
    </FieldRegistryProvider>,
  );
}

describe('React validation wiring', () => {
  it('surfaces validate() errors to the renderer', () => {
    const fields: FieldDescription[] = [
      {
        name: 'email',
        type: 'text',
        validate: (v) => (String(v).includes('@') ? undefined : 'Invalid'),
      },
    ];
    renderForm(
      <MultiFieldInput
        fieldDescriptions={fields}
        properties={{ email: 'x' }}
      />,
      registryWithText(),
    );
    expect(screen.getByTestId('error')).toHaveTextContent('Invalid');
  });

  it('does not surface an error for a disabled field', () => {
    const fields: FieldDescription[] = [
      {
        name: 'email',
        type: 'text',
        disabled: true,
        validate: () => 'Invalid',
      },
    ];
    renderForm(
      <MultiFieldInput fieldDescriptions={fields} properties={{ email: '' }} />,
      registryWithText(),
    );
    expect(screen.queryByTestId('error')).toBeNull();
    expect(screen.getByTestId('input')).toBeDisabled();
  });

  it('applies disabledCondition dynamically and emits onValidityChange', () => {
    const onValidity = vi.fn();
    const fields: FieldDescription[] = [
      { name: 'type', type: 'text' },
      {
        name: 'company',
        type: 'text',
        disabledCondition: (d) => d.type !== 'business',
        validate: (v) => (v ? undefined : 'Required'),
      },
    ];
    renderForm(
      <MultiFieldInput
        fieldDescriptions={fields}
        properties={{ type: 'personal', company: '' }}
        onValidityChange={onValidity}
      />,
      registryWithText(),
    );
    expect(onValidity).toHaveBeenLastCalledWith({
      valid: true,
      errors: {},
      complete: true,
      status: 'valid',
    });
  });
});
