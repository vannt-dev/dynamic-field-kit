import type {
  FieldDescription,
  FieldRendererProps,
  Properties,
} from '@dynamic-field-kit/core';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MultiFieldInput from '../src/components/MultiFieldInput';
import { fieldRegistry } from '../src/fieldRegistry';
import { layoutRegistry } from '../src/layout/layoutRegistry';
import {
  useDynamicForm,
  type UseDynamicFormResult,
} from '../src/useDynamicForm';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
    email: string;
    dirtyProbe: string;
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
    ),
  );

  const mockColumnLayout = vi.fn(
    ({ children }: { children: React.ReactNode }) => (
      <div data-testid="column-layout">{children}</div>
    ),
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
      />,
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
      expect.objectContaining({ name: 'Jane' }),
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
      />,
    );

    expect(screen.getAllByTestId('text-input')).toHaveLength(2);

    rerender(
      <MultiFieldInput
        fieldDescriptions={fields}
        properties={{ firstName: 'Jane' }}
      />,
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
        />,
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
      />,
    );

    expect(screen.getByTestId('input')).toHaveValue('Initial');

    rerender(
      <MultiFieldInput
        fieldDescriptions={fields}
        properties={{ name: 'Updated' }}
      />,
    );

    expect(screen.getByTestId('input')).toHaveValue('Updated');
  });

  it('should derive a computed field value from other fields on mount', () => {
    const fields: FieldDescription[] = [
      { name: 'firstName', type: 'text' },
      { name: 'lastName', type: 'text' },
      {
        name: 'fullName',
        type: 'text',
        computeValue: (data) =>
          `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
      },
    ];

    render(
      <MultiFieldInput
        fieldDescriptions={fields}
        properties={{ firstName: 'Ada', lastName: 'Lovelace' }}
      />,
    );

    const inputs = screen.getAllByTestId('input');
    expect(inputs[2]).toHaveValue('Ada Lovelace');
  });

  it('should recompute a derived field as its dependencies change', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const onChange = vi.fn();

    const fields: FieldDescription[] = [
      { name: 'firstName', type: 'text' },
      {
        name: 'greeting',
        type: 'text',
        computeValue: (data) => `Hello ${data.firstName ?? ''}`,
      },
    ];

    render(<MultiFieldInput fieldDescriptions={fields} onChange={onChange} />);

    await userEvent.type(screen.getAllByTestId('input')[0], 'Ada');

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ firstName: 'Ada', greeting: 'Hello Ada' }),
    );
    expect(screen.getAllByTestId('input')[1]).toHaveValue('Hello Ada');
  });
});

describe('dirty baseline', () => {
  const dirtyFields: FieldDescription[] = [
    { name: 'title', type: 'dirtyProbe', label: 'Title' },
  ];

  const DirtyProbe = ({
    id,
    value,
    dirty,
    onValueChange,
  }: FieldRendererProps) => (
    <input
      data-testid={id}
      data-dirty={String(dirty)}
      value={(value as string) ?? ''}
      onChange={(e) => onValueChange?.(e.target.value)}
    />
  );

  beforeEach(() => {
    fieldRegistry.register('dirtyProbe', DirtyProbe);
    layoutRegistry.register(
      'column',
      ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    );
  });

  it('is not dirty when properties arrive after mount', async () => {
    const Late = () => {
      const [props, setProps] = React.useState<Properties | undefined>(
        undefined,
      );
      React.useEffect(() => setProps({ title: 'loaded' }), []);
      return (
        <MultiFieldInput
          fieldDescriptions={dirtyFields}
          properties={props}
          idPrefix="late"
        />
      );
    };
    render(<Late />);
    await waitFor(() =>
      expect(screen.getByTestId('late-title')).toHaveValue('loaded'),
    );
    expect(screen.getByTestId('late-title')).toHaveAttribute(
      'data-dirty',
      'false',
    );
  });

  it('honours an explicit initialProperties baseline', () => {
    render(
      <MultiFieldInput
        fieldDescriptions={dirtyFields}
        properties={{ title: 'edited' }}
        initialProperties={{ title: 'original' }}
        idPrefix="explicit"
      />,
    );
    expect(screen.getByTestId('explicit-title')).toHaveAttribute(
      'data-dirty',
      'true',
    );
  });

  it('re-bases when the bound form is reset to new values', async () => {
    let api: UseDynamicFormResult | undefined;
    const Bound = () => {
      const form = useDynamicForm({
        fields: dirtyFields,
        initialValues: { title: 'a' },
      });
      api = form;
      return (
        <MultiFieldInput
          fieldDescriptions={dirtyFields}
          form={form}
          idPrefix="bound"
        />
      );
    };
    render(<Bound />);

    await act(async () => api!.reset({ title: 'b' }));

    expect(screen.getByTestId('bound-title')).toHaveValue('b');
    expect(screen.getByTestId('bound-title')).toHaveAttribute(
      'data-dirty',
      'false',
    );
  });

  it('still reports dirty while the user types in controlled mode', async () => {
    const Bound = () => {
      const form = useDynamicForm({
        fields: dirtyFields,
        initialValues: { title: 'a' },
      });
      return (
        <MultiFieldInput
          fieldDescriptions={dirtyFields}
          form={form}
          idPrefix="typing"
        />
      );
    };
    render(<Bound />);

    fireEvent.change(screen.getByTestId('typing-title'), {
      target: { value: 'ab' },
    });

    await waitFor(() =>
      expect(screen.getByTestId('typing-title')).toHaveAttribute(
        'data-dirty',
        'true',
      ),
    );
  });
});

describe('dirty baseline when properties start as an empty object', () => {
  const dirtyFields2: FieldDescription[] = [
    { name: 'title', type: 'dirtyProbe', label: 'Title' },
  ];

  beforeEach(() => {
    fieldRegistry.register('dirtyProbe', (({
      id,
      value,
      dirty,
    }: FieldRendererProps) => (
      <input
        data-testid={id}
        data-dirty={String(dirty)}
        value={(value as string) ?? ''}
        readOnly
      />
    )) as never);
    layoutRegistry.register(
      'column',
      ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    );
  });

  it('documents the {} case: an empty object is a real baseline, not "unset"', async () => {
    const Late = () => {
      const [props, setProps] = React.useState<Properties>({});
      React.useEffect(() => setProps({ title: 'loaded' }), []);
      return (
        <MultiFieldInput
          fieldDescriptions={dirtyFields2}
          properties={props}
          idPrefix="empty"
        />
      );
    };
    render(<Late />);
    await waitFor(() =>
      expect(screen.getByTestId('empty-title')).toHaveValue('loaded'),
    );

    // `{}` cannot be told apart from a form that genuinely opens blank, so it
    // is taken at face value and the field reads dirty. Pass initialProperties
    // (or drive the form through a store) when values arrive after mount.
    expect(screen.getByTestId('empty-title')).toHaveAttribute(
      'data-dirty',
      'true',
    );
  });

  it('initialProperties is the escape hatch for that case', async () => {
    const Late = () => {
      const [props, setProps] = React.useState<Properties>({});
      React.useEffect(() => setProps({ title: 'loaded' }), []);
      return (
        <MultiFieldInput
          fieldDescriptions={dirtyFields2}
          properties={props}
          initialProperties={{ title: 'loaded' }}
          idPrefix="hatch"
        />
      );
    };
    render(<Late />);
    await waitFor(() =>
      expect(screen.getByTestId('hatch-title')).toHaveValue('loaded'),
    );

    expect(screen.getByTestId('hatch-title')).toHaveAttribute(
      'data-dirty',
      'false',
    );
  });
});
