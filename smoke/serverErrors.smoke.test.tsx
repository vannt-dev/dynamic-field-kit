import { collectFieldPaths, serverErrorsFrom } from '@dynamic-field-kit/core';
import type { FieldDescription } from '@dynamic-field-kit/core';
import {
  FieldRegistry,
  FieldRegistryProvider,
  MultiFieldInput,
  useDynamicForm,
} from '@dynamic-field-kit/react';
import { useDynamicForm as useVueForm } from '@dynamic-field-kit/vue';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

const fields: FieldDescription[] = [
  { name: 'email', type: 'text', label: 'email' },
  { name: 'name', type: 'text', label: 'name' },
];

// What a backend answers when it refuses a registration (ASP.NET's shape,
// property names in PascalCase).
const refusal = {
  title: 'One or more validation errors occurred.',
  status: 400,
  errors: { Email: ['This address is already registered.'] },
};

const TextRenderer = ({
  value,
  onValueChange,
  error,
  label,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  error?: string | string[];
  label?: string;
}) => (
  <label>
    {label}
    <input
      aria-label={label}
      value={value ?? ''}
      onChange={(event) => onValueChange?.(event.target.value)}
    />
    <span data-testid={`error-${label}`}>
      {[error ?? []].flat().join('; ')}
    </span>
  </label>
);

describe('server errors, from the built packages', () => {
  it('core reads a backend answer into the form paths', () => {
    const paths = collectFieldPaths(fields, { email: 'a@example.com' });
    expect(serverErrorsFrom(refusal, { paths })).toEqual({
      email: ['This address is already registered.'],
    });
  });

  it('react shows a refused field in the rendered form until it is edited', () => {
    const registry = new FieldRegistry();
    registry.register('text', TextRenderer as never);
    let refuse!: () => void;
    const Form = () => {
      const form = useDynamicForm({
        fields,
        initialValues: { email: 'a@example.com', name: 'Al' },
      });
      refuse = () =>
        form.setServerErrors(
          serverErrorsFrom(refusal, {
            paths: collectFieldPaths(fields, form.data),
          }),
        );
      return (
        <FieldRegistryProvider registry={registry as never}>
          <MultiFieldInput fieldDescriptions={fields} form={form} />
        </FieldRegistryProvider>
      );
    };
    render(<Form />);
    expect(screen.getByTestId('error-email').textContent).toBe('');

    act(() => refuse());
    expect(screen.getByTestId('error-email').textContent).toBe(
      'This address is already registered.',
    );
    expect(screen.getByTestId('error-name').textContent).toBe('');

    // Another field changes: the refusal stands. The refused one changes: it goes.
    fireEvent.change(screen.getByLabelText('name'), {
      target: { value: 'Alice' },
    });
    expect(screen.getByTestId('error-email').textContent).toBe(
      'This address is already registered.',
    );
    fireEvent.change(screen.getByLabelText('email'), {
      target: { value: 'b@example.com' },
    });
    expect(screen.getByTestId('error-email').textContent).toBe('');
  });

  it('vue keeps the same behaviour', () => {
    const form = useVueForm({
      fields,
      initialValues: { email: 'a@example.com', name: 'Al' },
    });
    form.setServerErrors(
      serverErrorsFrom(refusal, {
        paths: collectFieldPaths(fields, form.data.value),
      }),
    );
    expect(form.errors.value).toEqual({
      email: ['This address is already registered.'],
    });
    expect(form.touched.value.email).toBe(true);

    form.setFieldValue('email', 'b@example.com');
    expect(form.errors.value).toEqual({});
  });
});
