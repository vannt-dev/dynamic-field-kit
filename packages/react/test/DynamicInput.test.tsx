import { FieldRegistry } from '@dynamic-field-kit/core';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DynamicInput from '../src/components/DynamicInput';
import { FieldRegistryProvider } from '../src/FieldRegistryContext';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
    number: number;
    select: string;
  }
}

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
      <span data-testid="value">{value}</span>
      <button
        data-testid="change-btn"
        onClick={() => onValueChange?.('new-value')}
      >
        Change
      </button>
    </div>
  )
);

// Render inside a scoped registry so each test gets an isolated set of
// renderers — no shared global state to reset between tests.
function renderWithRegistry(ui: React.ReactElement, registry: FieldRegistry) {
  return render(
    <FieldRegistryProvider registry={registry as never}>
      {ui}
    </FieldRegistryProvider>
  );
}

describe('DynamicInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render unknown field type message when renderer not found', () => {
    renderWithRegistry(<DynamicInput type="unknown" />, new FieldRegistry());
    expect(screen.getByText(/Unknown field type: unknown/)).toBeInTheDocument();
  });

  it('should render registered renderer with props', () => {
    const registry = new FieldRegistry();
    registry.register('text', mockRenderer as never);

    renderWithRegistry(
      <DynamicInput type="text" value="hello" label="Test Label" />,
      registry
    );

    expect(screen.getByTestId('label')).toHaveTextContent('Test Label');
    expect(screen.getByTestId('value')).toHaveTextContent('hello');
    expect(mockRenderer).toHaveBeenCalled();
  });

  it('should call onChange when renderer triggers change', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const registry = new FieldRegistry();
    registry.register('text', mockRenderer as never);

    const onChange = vi.fn();
    renderWithRegistry(
      <DynamicInput type="text" onChange={onChange} />,
      registry
    );

    await userEvent.click(screen.getByTestId('change-btn'));

    expect(onChange).toHaveBeenCalledWith('new-value');
  });

  it('should pass options to renderer', () => {
    const optionsRenderer = vi.fn(
      ({ options }: { options?: Array<{ label: string }> }) => (
        <div data-testid="options">
          {options?.map((opt, i) => (
            <span key={i}>{opt.label}</span>
          ))}
        </div>
      )
    );
    const registry = new FieldRegistry();
    registry.register('select', optionsRenderer as never);

    const options = [{ label: 'Option 1' }, { label: 'Option 2' }];
    renderWithRegistry(
      <DynamicInput type="select" options={options} />,
      registry
    );

    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('should pass className to renderer', () => {
    const classRenderer = vi.fn(({ className }: { className?: string }) => (
      <div data-testid="class-test" className={className}>
        Test
      </div>
    ));
    const registry = new FieldRegistry();
    registry.register('text', classRenderer as never);

    renderWithRegistry(
      <DynamicInput type="text" className="custom-class" />,
      registry
    );

    expect(screen.getByTestId('class-test')).toHaveClass('custom-class');
  });

  it('should pass description to renderer', () => {
    const descRenderer = vi.fn(
      ({ description }: { description?: React.ReactNode }) => (
        <div data-testid="desc-test">{description}</div>
      )
    );
    const registry = new FieldRegistry();
    registry.register('text', descRenderer as never);

    renderWithRegistry(
      <DynamicInput type="text" description="Test description" />,
      registry
    );

    expect(screen.getByTestId('desc-test')).toHaveTextContent(
      'Test description'
    );
  });
});
