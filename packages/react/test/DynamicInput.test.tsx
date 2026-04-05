import { render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DynamicInput from '../src/components/DynamicInput';
import { fieldRegistry } from '../src/fieldRegistry';

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

describe('DynamicInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    fieldRegistry.registry = {};
  });

  it('should render unknown field type message when renderer not found', () => {
    render(<DynamicInput type="unknown" />);
    expect(screen.getByText(/Unknown field type: unknown/)).toBeInTheDocument();
  });

  it('should render registered renderer with props', () => {
    fieldRegistry.register('text', mockRenderer);

    render(<DynamicInput type="text" value="hello" label="Test Label" />);

    expect(screen.getByTestId('label')).toHaveTextContent('Test Label');
    expect(screen.getByTestId('value')).toHaveTextContent('hello');
    expect(mockRenderer).toHaveBeenCalled();
  });

  it('should call onChange when renderer triggers change', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    fieldRegistry.register('text', mockRenderer);

    const onChange = vi.fn();
    render(<DynamicInput type="text" onChange={onChange} />);

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
    fieldRegistry.register('select', optionsRenderer);

    const options = [{ label: 'Option 1' }, { label: 'Option 2' }];
    render(<DynamicInput type="select" options={options} />);

    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('should pass className to renderer', () => {
    const classRenderer = vi.fn(({ className }: { className?: string }) => (
      <div data-testid="class-test" className={className}>
        Test
      </div>
    ));
    fieldRegistry.register('text', classRenderer);

    render(<DynamicInput type="text" className="custom-class" />);

    expect(screen.getByTestId('class-test')).toHaveClass('custom-class');
  });

  it('should pass description to renderer', () => {
    const descRenderer = vi.fn(
      ({ description }: { description?: React.ReactNode }) => (
        <div data-testid="desc-test">{description}</div>
      )
    );
    fieldRegistry.register('text', descRenderer);

    render(<DynamicInput type="text" description="Test description" />);

    expect(screen.getByTestId('desc-test')).toHaveTextContent(
      'Test description'
    );
  });
});
