/**
 * Regression tests for the issues reported against 1.5.1:
 *  1. two forms rendering the same field name emitted duplicate DOM ids
 *  2. submitting a never-touched form showed no errors
 *  3. `form.reset()` could not clear MultiFieldInput's touched state
 *  4. `FieldDescription.placeholder` never reached the renderer
 *  5. renderer props differed between adapters
 */
import type { FieldDescription } from '@dynamic-field-kit/core';
import { fireEvent, render, screen } from '@testing-library/react';
import React, { useRef } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import MultiFieldInput, {
  type MultiFieldInputHandle,
} from '../src/components/MultiFieldInput';
import { fieldRegistry } from '../src/fieldRegistry';
import { useDynamicForm } from '../src/useDynamicForm';
import '../src/layout/defaultLayouts';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
  }
}

/** Mirrors what an app renderer does: show the error only once touched. */
const TextRenderer = ({
  id,
  value,
  onValueChange,
  onBlur,
  label,
  placeholder,
  touched,
  error,
}: {
  id?: string;
  value?: unknown;
  onValueChange?: (v: unknown) => void;
  onBlur?: () => void;
  label?: string;
  placeholder?: string;
  touched?: boolean;
  error?: string | string[];
}) => (
  <label>
    {label}
    <input
      id={id}
      aria-label={label}
      placeholder={placeholder}
      value={(value as string) ?? ''}
      onChange={(e) => onValueChange?.(e.target.value)}
      onBlur={onBlur}
    />
    {touched && error ? <span role="alert">{[error].flat()[0]}</span> : null}
  </label>
);

beforeEach(() => {
  fieldRegistry.register('text', TextRenderer as never);
});

describe('issue 1: duplicate field ids across form instances', () => {
  const fields: FieldDescription[] = [
    { name: 'title', type: 'text', label: 'Title' },
  ];

  function ids(container: HTMLElement) {
    return Array.from(container.querySelectorAll('input')).map((i) => i.id);
  }

  it('gives two forms sharing a field name different ids', () => {
    const { container } = render(
      <>
        <MultiFieldInput fieldDescriptions={fields} />
        <MultiFieldInput fieldDescriptions={fields} />
      </>,
    );

    const [first, second] = ids(container);
    expect(first).toBeTruthy();
    expect(first).not.toBe(second);
  });

  it('produces ids that are usable as CSS selectors', () => {
    const { container } = render(
      <MultiFieldInput fieldDescriptions={fields} />,
    );

    const [id] = ids(container);
    expect(id).toMatch(/^[A-Za-z][\w-]*$/);
    expect(container.querySelector(`#${id}`)).not.toBeNull();
  });

  it('honours an explicit idPrefix, restoring the old stable ids', () => {
    const { container } = render(
      <MultiFieldInput fieldDescriptions={fields} idPrefix="dfk-field" />,
    );

    expect(ids(container)).toEqual(['dfk-field-title']);
  });

  it('lets a field pin its own id', () => {
    const { container } = render(
      <MultiFieldInput
        fieldDescriptions={[{ ...fields[0], id: 'login-title' }]}
      />,
    );

    expect(ids(container)).toEqual(['login-title']);
  });
});

describe('issue 2: submitting an untouched form surfaces errors', () => {
  const fields: FieldDescription[] = [
    {
      name: 'username',
      type: 'text',
      label: 'Username',
      required: true,
      validate: (v) => (v ? undefined : 'Required'),
    },
  ];

  function Form() {
    const form = useDynamicForm({ fields, initialValues: { username: '' } });
    return (
      <form onSubmit={form.handleSubmit(() => {})}>
        <MultiFieldInput fieldDescriptions={fields} form={form} />
        <button type="submit">Submit</button>
      </form>
    );
  }

  it('shows the error without the user ever focusing the field', async () => {
    render(<Form />);

    expect(screen.queryByRole('alert')).toBeNull();

    fireEvent.click(screen.getByText('Submit'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Required');
  });

  it('touchAll marks every field touched', () => {
    let seen: Record<string, boolean> = {};
    function Probe() {
      const form = useDynamicForm({ fields });
      seen = form.touched;
      return <button onClick={form.touchAll}>touch</button>;
    }
    render(<Probe />);

    expect(seen).toEqual({});
    fireEvent.click(screen.getByText('touch'));
    expect(seen).toEqual({ username: true });
  });
});

describe('issue 3: resetting clears touched', () => {
  const fields: FieldDescription[] = [
    {
      name: 'username',
      type: 'text',
      label: 'Username',
      validate: (v) => (v ? undefined : 'Required'),
    },
  ];

  it('clears the error after reset when touched is controlled', () => {
    function Form() {
      const form = useDynamicForm({ fields, initialValues: { username: '' } });
      return (
        <>
          <MultiFieldInput fieldDescriptions={fields} form={form} />
          <button onClick={() => form.reset()}>reset</button>
        </>
      );
    }
    render(<Form />);

    fireEvent.blur(screen.getByLabelText('Username'));
    expect(screen.getByRole('alert')).toHaveTextContent('Required');

    fireEvent.click(screen.getByText('reset'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('exposes resetTouched on a ref for the uncontrolled mode', () => {
    function Form() {
      const ref = useRef<MultiFieldInputHandle>(null);
      return (
        <>
          <MultiFieldInput ref={ref} fieldDescriptions={fields} />
          <button onClick={() => ref.current?.resetTouched()}>reset</button>
        </>
      );
    }
    render(<Form />);

    fireEvent.blur(screen.getByLabelText('Username'));
    expect(screen.getByRole('alert')).toHaveTextContent('Required');

    fireEvent.click(screen.getByText('reset'));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('issue 5: form errors are the renderer source of truth', () => {
  const fields: FieldDescription[] = [
    {
      name: 'username',
      type: 'text',
      label: 'Username',
      validate: () => 'Required',
    },
  ];

  it('does not show a live error before the form store records it', () => {
    function Form() {
      const form = useDynamicForm({ fields });
      return (
        <>
          <MultiFieldInput fieldDescriptions={fields} form={form} />
          <button onClick={() => form.setFieldTouched('username')}>
            touch
          </button>
          <button onClick={form.validate}>validate</button>
        </>
      );
    }
    render(<Form />);

    fireEvent.click(screen.getByText('touch'));
    expect(screen.queryByRole('alert')).toBeNull();

    fireEvent.click(screen.getByText('validate'));
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });
});

describe('issue 4: FieldDescription props reach the renderer', () => {
  it('forwards placeholder declared at the top level', () => {
    render(
      <MultiFieldInput
        fieldDescriptions={[
          {
            name: 'username',
            type: 'text',
            label: 'Username',
            placeholder: 'Type your name',
          },
        ]}
      />,
    );

    expect(screen.getByLabelText('Username')).toHaveAttribute(
      'placeholder',
      'Type your name',
    );
  });

  it('forwards the numeric/file props the contract declares', () => {
    const received: Record<string, unknown>[] = [];
    fieldRegistry.register('text', ((p: Record<string, unknown>) => {
      received.push(p);
      return <input aria-label="probe" />;
    }) as never);

    render(
      <MultiFieldInput
        fieldDescriptions={[
          {
            name: 'n',
            type: 'text',
            min: 1,
            max: 9,
            step: 2,
            accept: '.png',
            multiple: true,
            required: true,
          },
        ]}
      />,
    );

    expect(received[0]).toMatchObject({
      min: 1,
      max: 9,
      step: 2,
      accept: '.png',
      multiple: true,
      required: true,
    });
  });
});

describe('issue 1, worst case: repeatable groups', () => {
  const fields: FieldDescription[] = [
    {
      name: 'contacts',
      type: 'text',
      label: 'Contacts',
      fields: [{ name: 'email', type: 'text', label: 'Email' }],
    },
  ];

  it('gives every group item its own id for the same field name', () => {
    const { container } = render(
      <MultiFieldInput
        fieldDescriptions={fields}
        properties={{ contacts: [{ email: 'a' }, { email: 'b' }, {}] }}
      />,
    );

    const ids = Array.from(container.querySelectorAll('input')).map(
      (i) => i.id,
    );
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
  });
});
