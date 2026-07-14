import type { FieldDescription } from '@dynamic-field-kit/core';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MultiFieldInput from '../src/components/MultiFieldInput';
import { fieldRegistry } from '../src/fieldRegistry';
import '../src/layout/defaultLayouts';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
  }
}

afterEach(() => {
  (fieldRegistry as any).registry = {};
});

function registerTextRenderer() {
  fieldRegistry.register(
    'text',
    (({ value, onValueChange, error, disabled, readOnly }: any) => (
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
    )) as any
  );
}

describe('React validation wiring', () => {
  it('surfaces validate() errors to the renderer', () => {
    registerTextRenderer();
    const fields: FieldDescription[] = [
      {
        name: 'email',
        type: 'text',
        validate: (v) => (String(v).includes('@') ? undefined : 'Invalid'),
      },
    ];
    render(
      <MultiFieldInput fieldDescriptions={fields} properties={{ email: 'x' }} />
    );
    expect(screen.getByTestId('error')).toHaveTextContent('Invalid');
  });

  it('does not surface an error for a disabled field', () => {
    registerTextRenderer();
    const fields: FieldDescription[] = [
      {
        name: 'email',
        type: 'text',
        disabled: true,
        validate: () => 'Invalid',
      },
    ];
    render(
      <MultiFieldInput fieldDescriptions={fields} properties={{ email: '' }} />
    );
    expect(screen.queryByTestId('error')).toBeNull();
    expect(screen.getByTestId('input')).toBeDisabled();
  });

  it('applies disabledCondition dynamically and emits onValidityChange', () => {
    registerTextRenderer();
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
    render(
      <MultiFieldInput
        fieldDescriptions={fields}
        properties={{ type: 'personal', company: '' }}
        onValidityChange={onValidity}
      />
    );
    expect(onValidity).toHaveBeenLastCalledWith({ valid: true, errors: {} });
  });
});
