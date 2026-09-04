import {
  FieldRegistry,
  makeErrorId,
  type FieldRendererProps,
} from '@dynamic-field-kit/core';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import DynamicInput from '../src/components/DynamicInput';
import {
  DefaultPasswordRenderer,
  DefaultEmailRenderer,
  DefaultTextareaRenderer,
} from '../src/defaultRenderers';
import { FieldRegistryProvider } from '../src/FieldRegistryContext';

describe('React Default Built-in Renderers', () => {
  it('renders default text input when type is "text" without custom registration', () => {
    const handleChange = vi.fn();
    render(
      <DynamicInput
        type="text"
        value="Hello Default"
        onChange={handleChange}
        id="test-text"
      />,
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('Hello Default');

    fireEvent.change(input, { target: { value: 'New Value' } });
    expect(handleChange).toHaveBeenCalledWith('New Value');
  });

  it('renders default number input when type is "number"', () => {
    const handleChange = vi.fn();
    render(
      <DynamicInput
        type="number"
        value={42}
        onChange={handleChange}
        id="test-number"
      />,
    );

    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(input.value).toBe('42');

    fireEvent.change(input, { target: { value: '99' } });
    expect(handleChange).toHaveBeenCalledWith(99);
  });

  it('renders default select input when type is "select"', () => {
    const handleChange = vi.fn();
    const options = [
      { value: 'vn', label: 'Vietnam' },
      { value: 'us', label: 'USA' },
    ];
    render(
      <DynamicInput
        type="select"
        value="vn"
        options={options}
        onChange={handleChange}
      />,
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('vn');

    fireEvent.change(select, { target: { value: 'us' } });
    expect(handleChange).toHaveBeenCalledWith('us');
  });

  it('renders default checkbox input when type is "checkbox"', () => {
    const handleChange = vi.fn();
    render(
      <DynamicInput type="checkbox" value={true} onChange={handleChange} />,
    );

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('renders default password input when type is "password"', () => {
    const handleChange = vi.fn();
    render(
      <DynamicInput
        type="password"
        value="secret123"
        onChange={handleChange}
      />,
    );

    const input = screen.getByDisplayValue('secret123') as HTMLInputElement;
    expect(input.type).toBe('password');

    fireEvent.change(input, { target: { value: 'newpassword' } });
    expect(handleChange).toHaveBeenCalledWith('newpassword');
  });

  it('renders default email input when type is "email"', () => {
    const handleChange = vi.fn();
    render(
      <DynamicInput
        type="email"
        value="user@example.com"
        onChange={handleChange}
      />,
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.type).toBe('email');

    fireEvent.change(input, { target: { value: 'updated@example.com' } });
    expect(handleChange).toHaveBeenCalledWith('updated@example.com');
  });

  it('renders default textarea input when type is "textarea"', () => {
    const handleChange = vi.fn();
    render(
      <DynamicInput
        type="textarea"
        value="Multi line text"
        onChange={handleChange}
      />,
    );

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Multi line text');

    fireEvent.change(textarea, { target: { value: 'Line 1\nLine 2' } });
    expect(handleChange).toHaveBeenCalledWith('Line 1\nLine 2');
  });

  it('directly renders standalone password, email, and textarea components', () => {
    const fn = vi.fn();
    render(<DefaultPasswordRenderer value="pass" onValueChange={fn} />);
    render(<DefaultEmailRenderer value="mail@test.com" onValueChange={fn} />);
    render(<DefaultTextareaRenderer value="area" onValueChange={fn} />);
    expect(screen.getByDisplayValue('pass')).toBeInTheDocument();
  });
});

describe('default renderer error node', () => {
  it('renders the message with the id ariaDescribedBy points at', () => {
    render(
      <DynamicInput
        type="text"
        id="f-title"
        value=""
        error={['Title is required']}
        ariaInvalid
        ariaDescribedBy={makeErrorId('f-title')}
        onChange={() => {}}
      />,
    );

    const input = screen.getByRole('textbox');
    const described = input.getAttribute('aria-describedby');
    expect(described).toBe('f-title-error');
    expect(document.getElementById(described!)).toHaveTextContent(
      'Title is required',
    );
  });

  it('renders nothing extra when the field is valid', () => {
    render(
      <DynamicInput type="text" id="f-ok" value="x" onChange={() => {}} />,
    );

    expect(document.getElementById('f-ok-error')).toBeNull();
  });

  it('leaves a custom renderer to render its own message', () => {
    const registry = new FieldRegistry();
    registry.register('text', (({ error }: FieldRendererProps) => (
      <span data-testid="custom">{error?.[0]}</span>
    )) as unknown as never);

    render(
      <FieldRegistryProvider registry={registry}>
        <DynamicInput
          type="text"
          id="f-custom"
          value=""
          error={['Boom']}
          onChange={() => {}}
        />
      </FieldRegistryProvider>,
    );

    expect(screen.getByTestId('custom')).toHaveTextContent('Boom');
    expect(document.getElementById('f-custom-error')).toBeNull();
  });
});

describe('default renderer error node accepts a bare string', () => {
  it('renders the whole string, not its first character', () => {
    render(
      <DynamicInput
        type="text"
        id="f-str"
        value=""
        error="Title is required"
        onChange={() => {}}
      />,
    );

    expect(document.getElementById('f-str-error')).toHaveTextContent(
      'Title is required',
    );
  });
});
