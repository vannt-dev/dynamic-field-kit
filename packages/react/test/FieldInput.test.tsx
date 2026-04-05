import type { FieldDescription } from '@dynamic-field-kit/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FieldInput from '../src/components/FieldInput';
import { fieldRegistry } from '../src/fieldRegistry';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
    email: string;
  }
}

describe('FieldInput', () => {
  const mockRenderer = vi.fn(
    ({
      value,
      label,
      onValueChange,
    }: {
      value?: string;
      label?: string;
      onValueChange?: (v: string) => void;
    }) => (
      <div data-testid="mock-input">
        <span data-testid="label">{label}</span>
        <input
          data-testid="input"
          value={value}
          onChange={(e) => onValueChange?.(e.target.value)}
        />
      </div>
    )
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render DynamicInput with correct props from fieldDescription', () => {
    fieldRegistry.register('text', mockRenderer);

    const fieldDesc: FieldDescription = {
      name: 'username',
      type: 'text',
      label: 'Username',
      placeholder: 'Enter name',
    };

    render(
      <FieldInput
        fieldDescription={fieldDesc}
        renderInfos={{ username: 'John' }}
        onValueChangeField={vi.fn()}
      />
    );

    expect(screen.getByTestId('label')).toHaveTextContent('Username');
    expect(screen.getByTestId('input')).toHaveValue('John');
  });

  it('should pass options from fieldDescription', () => {
    const optionsRenderer = vi.fn(({ options }: { options?: any[] }) => (
      <div data-testid="options">{options?.length} options</div>
    ));
    fieldRegistry.register('select', optionsRenderer);

    const fieldDesc: FieldDescription = {
      name: 'country',
      type: 'select',
      options: [{ label: 'USA' }, { label: 'VN' }],
    };

    render(
      <FieldInput
        fieldDescription={fieldDesc}
        renderInfos={{}}
        onValueChangeField={vi.fn()}
      />
    );

    expect(screen.getByTestId('options')).toHaveTextContent('2 options');
  });

  it('should call onValueChangeField with correct key and value', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    fieldRegistry.register('text', mockRenderer);

    const onValueChangeField = vi.fn();

    const fieldDesc: FieldDescription = {
      name: 'email',
      type: 'text',
    };

    render(
      <FieldInput
        fieldDescription={fieldDesc}
        renderInfos={{ email: '' }}
        onValueChangeField={onValueChangeField}
      />
    );

    const input = screen.getByTestId('input');
    await userEvent.clear(input);
    await userEvent.type(input, 't');

    expect(onValueChangeField).toHaveBeenCalledWith('t', 'email');
  });

  it('should pass className from fieldDescription', () => {
    const classRenderer = vi.fn(({ className }: { className?: string }) => (
      <div data-testid="class-test" className={className}>
        Test
      </div>
    ));
    fieldRegistry.register('text', classRenderer);

    const fieldDesc: FieldDescription = {
      name: 'test',
      type: 'text',
      className: 'my-custom-class',
    };

    render(
      <FieldInput
        fieldDescription={fieldDesc}
        renderInfos={{}}
        onValueChangeField={vi.fn()}
      />
    );

    expect(screen.getByTestId('class-test')).toHaveClass('my-custom-class');
  });

  it('should pass description from fieldDescription', () => {
    const descRenderer = vi.fn(({ description }: { description?: any }) => (
      <div data-testid="desc">{description}</div>
    ));
    fieldRegistry.register('text', descRenderer);

    const fieldDesc: FieldDescription = {
      name: 'test',
      type: 'text',
      description: 'This is a help text',
    };

    render(
      <FieldInput
        fieldDescription={fieldDesc}
        renderInfos={{}}
        onValueChangeField={vi.fn()}
      />
    );

    expect(screen.getByTestId('desc')).toHaveTextContent('This is a help text');
  });
});
