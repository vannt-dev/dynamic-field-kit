import type { FieldDescription } from '@dynamic-field-kit/core';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DynamicInput,
  MultiFieldInput,
  fieldRegistry,
  layoutRegistry,
} from '../src';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
    email: string;
    checkbox: boolean;
    select: string;
    country: string;
    city: string;
  }
}

describe('Integration: Form with multiple fields', () => {
  const TextInput = vi.fn(
    ({
      value,
      label,
      onValueChange,
      placeholder,
    }: {
      value?: string;
      label?: string;
      onValueChange?: (v: string) => void;
      placeholder?: string;
    }) => (
      <div data-testid="text-input">
        <label data-testid="label">{label}</label>
        <input
          data-testid="input"
          type="text"
          value={value || ''}
          placeholder={placeholder}
          onChange={(e) => onValueChange?.(e.target.value)}
        />
      </div>
    )
  );

  const CheckboxInput = vi.fn(
    ({
      value,
      label,
      onValueChange,
    }: {
      value?: boolean;
      label?: string;
      onValueChange?: (v: boolean) => void;
    }) => (
      <div data-testid="checkbox-input">
        <input
          data-testid="input"
          type="checkbox"
          checked={value || false}
          onChange={(e) => onValueChange?.(e.target.checked)}
        />
        <span>{label}</span>
      </div>
    )
  );

  const SelectInput = vi.fn(
    ({
      value,
      label,
      onValueChange,
      options,
    }: {
      value?: string;
      label?: string;
      onValueChange?: (v: string) => void;
      options?: Array<{ label: string; value: string }>;
    }) => (
      <div data-testid="select-input">
        <label>{label}</label>
        <select
          data-testid="input"
          value={value || ''}
          onChange={(e) => onValueChange?.(e.target.value)}
        >
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    )
  );

  beforeEach(() => {
    vi.clearAllMocks();
    fieldRegistry.register('text', TextInput);
    fieldRegistry.register('checkbox', CheckboxInput);
    fieldRegistry.register('select', SelectInput as any);
  });

  it('should render a complete form with multiple field types', () => {
    const fields: FieldDescription[] = [
      {
        name: 'name',
        type: 'text',
        label: 'Full Name',
        placeholder: 'Enter name',
      },
      {
        name: 'email',
        type: 'text',
        label: 'Email',
        placeholder: 'Enter email',
      },
      { name: 'agreed', type: 'checkbox', label: 'I agree to terms' },
    ];

    render(<MultiFieldInput fieldDescriptions={fields} />);

    expect(screen.getAllByTestId('text-input')).toHaveLength(2);
    expect(screen.getByText('Full Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('I agree to terms')).toBeInTheDocument();
  });

  it('should handle form submission with all field values', async () => {
    const onSubmit = vi.fn();
    const fields: FieldDescription[] = [
      { name: 'name', type: 'text' },
      { name: 'email', type: 'text' },
    ];

    const FormComponent = () => {
      const [formData, setFormData] = React.useState({});

      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(formData);
          }}
        >
          <MultiFieldInput fieldDescriptions={fields} onChange={setFormData} />
          <button type="submit">Submit</button>
        </form>
      );
    };

    render(<FormComponent />);

    await userEvent.type(screen.getAllByTestId('input')[0], 'John');
    await userEvent.type(screen.getAllByTestId('input')[1], 'john@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'John',
      email: 'john@example.com',
    });
  });

  it('should conditionally show fields based on other field values', () => {
    const fields: FieldDescription[] = [
      { name: 'accountType', type: 'select', label: 'Account Type' },
      {
        name: 'companyName',
        type: 'text',
        label: 'Company Name',
        appearCondition: (data) => data.accountType === 'business',
      },
    ];

    const { rerender } = render(
      <MultiFieldInput
        fieldDescriptions={fields}
        properties={{ accountType: 'personal' }}
      />
    );

    expect(screen.queryByText('Company Name')).not.toBeInTheDocument();

    rerender(
      <MultiFieldInput
        fieldDescriptions={fields}
        properties={{ accountType: 'business' }}
      />
    );

    expect(screen.getByText('Company Name')).toBeInTheDocument();
  });

  it('should update multiple fields and maintain state', async () => {
    const onChange = vi.fn();
    const fields: FieldDescription[] = [
      { name: 'firstName', type: 'text' },
      { name: 'lastName', type: 'text' },
    ];

    render(<MultiFieldInput fieldDescriptions={fields} onChange={onChange} />);

    const inputs = screen.getAllByTestId('input');

    await userEvent.type(inputs[0], 'John');
    await userEvent.type(inputs[1], 'Doe');

    expect(onChange).toHaveBeenLastCalledWith({
      firstName: 'John',
      lastName: 'Doe',
    });
  });
});

describe('Integration: Layout variations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    layoutRegistry.register('test-row', ({ children }) => (
      <div data-testid="row-layout" style={{ display: 'flex', gap: '8px' }}>
        {children}
      </div>
    ));
    layoutRegistry.register('test-grid', ({ children }) => (
      <div
        data-testid="grid-layout"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}
      >
        {children}
      </div>
    ));
    fieldRegistry.register(
      'text',
      vi.fn(() => <div data-testid="field">Field</div>) as any
    );
  });

  it('should render fields in row layout', () => {
    const fields: FieldDescription[] = [
      { name: 'field1', type: 'text' },
      { name: 'field2', type: 'text' },
    ];

    render(
      <MultiFieldInput fieldDescriptions={fields} layout={'test-row' as any} />
    );

    expect(screen.getByTestId('row-layout')).toBeInTheDocument();
  });

  it('should render fields in grid layout', () => {
    const fields: FieldDescription[] = [
      { name: 'field1', type: 'text' },
      { name: 'field2', type: 'text' },
    ];

    render(
      <MultiFieldInput fieldDescriptions={fields} layout={'test-grid' as any} />
    );

    expect(screen.getByTestId('grid-layout')).toBeInTheDocument();
  });

  it('should render fields in default column layout when no layout specified', () => {
    const fields: FieldDescription[] = [{ name: 'field1', type: 'text' }];

    render(<MultiFieldInput fieldDescriptions={fields} />);

    expect(screen.getByTestId('field')).toBeInTheDocument();
  });
});

describe('Integration: DynamicInput with real-world scenarios', () => {
  it('should handle email validation flow', async () => {
    const EmailInput = ({
      value,
      onValueChange,
    }: {
      value?: string;
      onValueChange?: (v: string) => void;
    }) => {
      const [error, setError] = React.useState('');

      const validate = (email: string) => {
        if (!email.includes('@')) {
          setError('Invalid email');
          return;
        }
        setError('');
        onValueChange?.(email);
      };

      return (
        <div>
          <input
            data-testid="email-input"
            type="email"
            value={value || ''}
            onChange={(e) => validate(e.target.value)}
          />
          {error && <span data-testid="error">{error}</span>}
        </div>
      );
    };

    fieldRegistry.register('email', EmailInput);

    render(<DynamicInput type="email" />);

    await userEvent.type(screen.getByTestId('email-input'), 'invalid-email');
    expect(screen.getByTestId('error')).toHaveTextContent('Invalid email');
  });

  it('should handle dependent dropdowns', async () => {
    const CountrySelect = ({
      onValueChange,
    }: {
      onValueChange?: (v: string) => void;
    }) => (
      <select
        data-testid="country"
        onChange={(e) => onValueChange?.(e.target.value)}
      >
        <option value="">Select country</option>
        <option value="us">United States</option>
        <option value="vn">Vietnam</option>
      </select>
    );

    const CitySelect = ({
      value,
      onValueChange,
    }: {
      value?: string;
      onValueChange?: (v: string) => void;
    }) => {
      const cities =
        value === 'us'
          ? ['New York', 'Los Angeles']
          : value === 'vn'
          ? ['Hanoi', 'Ho Chi Minh']
          : [];

      return (
        <select
          data-testid="city"
          value={value || ''}
          onChange={(e) => onValueChange?.(e.target.value)}
        >
          <option value="">Select city</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      );
    };

    fieldRegistry.register('country', CountrySelect);
    fieldRegistry.register('city', CitySelect);

    const fields: FieldDescription[] = [
      { name: 'country', type: 'country' },
      {
        name: 'city',
        type: 'city',
        appearCondition: (data) => !!data.country,
      },
    ];

    render(<MultiFieldInput fieldDescriptions={fields} />);

    expect(screen.queryByTestId('city')).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByTestId('country'), 'vn');

    await vi.waitFor(() => {
      expect(screen.getByTestId('city')).toBeInTheDocument();
    });
  });
});
