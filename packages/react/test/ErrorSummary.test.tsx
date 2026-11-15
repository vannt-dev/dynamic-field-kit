import {
  focusFirstInvalidField,
  type FieldDescription,
  type FieldRendererProps,
  FieldRegistry,
  validators,
} from '@dynamic-field-kit/core';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import React, { useEffect, useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  ErrorSummary,
  FieldRegistryProvider,
  listInvalidFields,
  MultiFieldInput,
  useDynamicForm,
} from '../src';
import type { UseDynamicFormResult } from '../src';

// Built-in renderers throughout, unless a test registers its own: the ids
// the summary links to are the ones the package itself renders.
const fields = [
  {
    name: 'email',
    type: 'email',
    label: 'Email',
    validate: validators.required('Enter an email'),
  },
  {
    name: 'plan',
    type: 'radio',
    label: 'Plan',
    options: [
      { label: 'Free', value: 'free' },
      { label: 'Pro', value: 'pro' },
    ],
    validate: validators.required('Choose a plan'),
  },
  {
    name: 'address',
    type: 'section',
    label: 'Address',
    section: [
      {
        name: 'city',
        type: 'text',
        label: 'City',
        validate: validators.required('Enter a city'),
      },
    ],
  },
  {
    name: 'contacts',
    type: 'group',
    label: 'Contacts',
    fields: [
      {
        name: 'phone',
        type: 'text',
        label: 'Phone',
        validate: validators.required('Enter a phone number'),
      },
    ],
  },
  {
    name: 'code',
    type: 'text',
    id: 'promo-code',
    validate: validators.required('Enter a code'),
  },
] as unknown as FieldDescription[];

const initialValues = { contacts: [{ phone: '555' }, {}] };

describe('listInvalidFields', () => {
  const errors = {
    // Deliberately not in form order.
    code: ['Enter a code'],
    'contacts[1].phone': ['Enter a phone number'],
    'billing.vat': ['Rejected by the tax office'],
    'address.city': ['Enter a city', 'Second message'],
    email: ['Enter an email'],
    plan: [],
  };

  it('lists the invalid fields in the order of the form', () => {
    const list = listInvalidFields({
      fields,
      data: initialValues,
      errors,
      idPrefix: 'signup',
    });
    expect(list).toEqual([
      {
        path: 'email',
        label: 'Email',
        messages: ['Enter an email'],
        id: 'signup-email',
      },
      {
        path: 'address.city',
        label: 'Address: City',
        messages: ['Enter a city', 'Second message'],
        id: 'signup-address-city',
      },
      {
        path: 'contacts[1].phone',
        label: 'Contacts 2: Phone',
        messages: ['Enter a phone number'],
        id: 'signup-contacts-1-phone',
      },
      // A pinned id wins over the prefix; no label, so the name stands in.
      {
        path: 'code',
        label: 'code',
        messages: ['Enter a code'],
        id: 'promo-code',
      },
      // Not a field of the list: kept, last, under its path.
      {
        path: 'billing.vat',
        label: 'billing.vat',
        messages: ['Rejected by the tax office'],
        id: undefined,
      },
    ]);
  });

  it('gives no ids without a prefix, and nothing for an empty map', () => {
    const list = listInvalidFields({ fields, data: initialValues, errors });
    expect(list.map((entry) => entry.id)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
    expect(list[2].label).toBe('Contacts 2: Phone');
    expect(
      listInvalidFields({ fields, data: {}, errors: {}, idPrefix: 'x' }),
    ).toEqual([]);
  });
});

interface FormProps {
  focusOnSubmit?: 'summary' | 'first-invalid';
  validateOnChange?: boolean;
  onForm?: (form: UseDynamicFormResult) => void;
  fieldList?: FieldDescription[];
}

function Form({
  focusOnSubmit,
  validateOnChange,
  onForm,
  fieldList = fields,
}: FormProps) {
  const form = useDynamicForm({
    fields: fieldList,
    initialValues,
    validateOnChange,
  });
  onForm?.(form);
  return (
    <form onSubmit={form.handleSubmit(() => undefined)} noValidate>
      <ErrorSummary
        fieldDescriptions={fieldList}
        form={form}
        idPrefix="signup"
        focusOnSubmit={focusOnSubmit}
      />
      <MultiFieldInput
        fieldDescriptions={fieldList}
        form={form}
        idPrefix="signup"
      />
      <button type="submit">Save</button>
    </form>
  );
}

const submit = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  });
};

const summary = () => screen.getByRole('group', { name: 'There is a problem' });

describe('ErrorSummary', () => {
  it('stays out of the way until a submit finds errors', async () => {
    render(<Form />);
    // The form is invalid from the start, and blurring a field shows its
    // error, but nobody has submitted yet.
    fireEvent.blur(document.getElementById('signup-email')!);
    expect(screen.queryByRole('group', { name: 'There is a problem' })).toBe(
      null,
    );

    await submit();
    const links = within(summary()).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'Email: Enter an email',
      'Plan: Choose a plan',
      'Address: City: Enter a city',
      'Contacts 2: Phone: Enter a phone number',
      'code: Enter a code',
    ]);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '#signup-email',
      '#signup-plan',
      '#signup-address-city',
      '#signup-contacts-1-phone',
      '#promo-code',
    ]);
  });

  it('links to ids that are in the form', async () => {
    render(<Form />);
    await submit();
    for (const link of within(summary()).getAllByRole('link')) {
      const id = link.getAttribute('href')!.slice(1);
      expect([id, document.getElementById(id) !== null]).toEqual([id, true]);
    }
  });

  it('moves focus to the field when a link is activated', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    try {
      render(<Form />);
      await submit();
      const link = (text: string) =>
        within(summary()).getByRole('link', { name: new RegExp(text) });

      fireEvent.click(link('Enter an email'));
      expect(document.activeElement).toBe(
        document.getElementById('signup-email'),
      );
      expect(scrollIntoView).toHaveBeenCalledTimes(1);

      // A field inside a section, and one inside the second group item.
      fireEvent.click(link('Enter a city'));
      expect(document.activeElement).toBe(
        document.getElementById('signup-address-city'),
      );
      fireEvent.click(link('Enter a phone number'));
      expect(document.activeElement).toBe(
        document.getElementById('signup-contacts-1-phone'),
      );
      expect((document.activeElement as HTMLInputElement).value).toBe('');

      // A pinned id.
      fireEvent.click(link('Enter a code'));
      expect(document.activeElement?.id).toBe('promo-code');

      // The radio group's id is on its wrapper, which cannot take focus.
      fireEvent.click(link('Choose a plan'));
      expect(document.activeElement).toBe(
        document.getElementById('signup-plan-0'),
      );
    } finally {
      delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    }
  });

  it('announces on submit, not while the errors are being fixed', async () => {
    render(<Form validateOnChange />);
    await submit();
    const alert = within(summary()).getByRole('alert');
    expect(alert.textContent).toBe('There is a problem');
    // The list is not part of the live region.
    expect(alert.querySelector('a')).toBe(null);
    expect(summary().getAttribute('aria-live')).toBe(null);

    fireEvent.change(document.getElementById('signup-email')!, {
      target: { value: 'ada@example.com' },
    });
    fireEvent.change(document.getElementById('signup-address-city')!, {
      target: { value: 'Hanoi' },
    });
    // Two errors fewer in the list, and the live region is the same node
    // with the same words: nothing for a screen reader to say.
    expect(within(summary()).getAllByRole('link')).toHaveLength(3);
    expect(within(summary()).getByRole('alert')).toBe(alert);
    expect(alert.textContent).toBe('There is a problem');

    // A new submit puts a new node in its place, which is announced.
    await submit();
    const next = within(summary()).getByRole('alert');
    expect(next).not.toBe(alert);
    expect(next.textContent).toBe('There is a problem');
  });

  it('goes away when the last error is fixed, and on reset', async () => {
    let form!: UseDynamicFormResult;
    const only = [fields[0]];
    render(<Form fieldList={only} onForm={(f) => (form = f)} />);
    await submit();
    expect(form.submitCount).toBe(1);
    expect(within(summary()).getAllByRole('link')).toHaveLength(1);

    act(() => form.handleChange({ email: 'ada@example.com' }));
    act(() => form.handleBlur('email'));
    expect(screen.queryByRole('group', { name: 'There is a problem' })).toBe(
      null,
    );

    act(() => form.handleChange({ email: '' }));
    await submit();
    expect(form.submitCount).toBe(2);
    expect(summary()).toBeInTheDocument();
    act(() => form.reset());
    expect(form.submitCount).toBe(0);
    expect(screen.queryByRole('group', { name: 'There is a problem' })).toBe(
      null,
    );
  });

  it('lists an error that belongs to no field as text, after the others', async () => {
    let form!: UseDynamicFormResult;
    render(<Form onForm={(f) => (form = f)} />);
    await submit();
    act(() => form.setServerErrors({ 'billing.vat': 'Rejected' }));
    const items = within(summary()).getAllByRole('listitem');
    const last = items[items.length - 1];
    expect(last.textContent).toBe('billing.vat: Rejected');
    expect(last.querySelector('a')).toBe(null);
  });

  it('focuses the first invalid field after a submit when asked to', async () => {
    render(<Form focusOnSubmit="first-invalid" />);
    // Never blurred, so nothing marked it invalid before the submit.
    expect(document.activeElement).toBe(document.body);
    await submit();
    expect(document.activeElement).toBe(
      document.getElementById('signup-email'),
    );
    expect(document.activeElement?.getAttribute('aria-invalid')).toBe('true');

    // Fixed: the next submit goes to what is now the first one.
    fireEvent.change(document.getElementById('signup-email')!, {
      target: { value: 'ada@example.com' },
    });
    await submit();
    expect(document.activeElement).toBe(
      document.getElementById('signup-plan-0'),
    );
  });

  it('focuses the summary after a submit when asked to', async () => {
    render(<Form focusOnSubmit="summary" />);
    await submit();
    expect(document.activeElement).toBe(summary());
    expect(summary().getAttribute('tabindex')).toBe('-1');
  });

  it('leaves focus alone by default', async () => {
    render(<Form />);
    const button = screen.getByRole('button', { name: 'Save' });
    button.focus();
    await submit();
    expect(document.activeElement).toBe(button);
  });

  it('falls back to the first control marked invalid when ids are not forwarded', async () => {
    // A renderer that drops `id`: the summary's links have nothing to find.
    const registry = new FieldRegistry();
    registry.register('text', (({
      value,
      onValueChange,
      ariaInvalid,
    }: FieldRendererProps) => (
      <input
        data-testid="bare"
        value={(value as string) ?? ''}
        aria-invalid={ariaInvalid}
        onChange={(e) => onValueChange?.(e.target.value)}
      />
    )) as never);
    const only = [
      { name: 'nick', type: 'text', validate: validators.required('Nick?') },
    ] as unknown as FieldDescription[];
    render(
      <FieldRegistryProvider registry={registry}>
        <Form fieldList={only} focusOnSubmit="first-invalid" />
      </FieldRegistryProvider>,
    );
    await submit();
    expect(document.activeElement).toBe(screen.getByTestId('bare'));
  });

  it('works from plain props, shown as soon as there are errors', () => {
    const { rerender } = render(
      <ErrorSummary
        fieldDescriptions={fields}
        data={initialValues}
        errors={{ email: ['Enter an email'] }}
        idPrefix="signup"
        title="Fix these"
        headingLevel={3}
        className="mine"
      />,
    );
    const root = screen.getByRole('group', { name: 'Fix these' });
    expect(root.className).toBe('dfk-error-summary mine');
    expect(within(root).getByRole('heading', { level: 3 })).toHaveTextContent(
      'Fix these',
    );
    const alert = within(root).getByRole('alert');
    rerender(
      <ErrorSummary
        fieldDescriptions={fields}
        data={initialValues}
        errors={{ email: ['Enter an email'], code: ['Enter a code'] }}
        idPrefix="signup"
        title="Fix these"
        headingLevel={3}
        className="mine"
      />,
    );
    expect(within(root).getAllByRole('link')).toHaveLength(2);
    expect(within(root).getByRole('alert')).toBe(alert);
  });
});

describe('submitCount', () => {
  // The recipe for a form without a summary: `onInvalid` runs before the
  // errors of the submit are in the DOM, an effect on `submitCount` after.
  it('lets an effect focus the first invalid field once the errors are rendered', async () => {
    const foundInOnInvalid: boolean[] = [];
    function Bare() {
      const form = useDynamicForm({ fields: [fields[0]] });
      const ref = useRef<HTMLFormElement>(null);
      useEffect(() => {
        if (form.submitCount > 0) {
          focusFirstInvalidField(ref.current);
        }
      }, [form.submitCount]);
      return (
        <form
          ref={ref}
          noValidate
          onSubmit={form.handleSubmit(
            () => undefined,
            () => {
              foundInOnInvalid.push(
                ref.current!.querySelector('[aria-invalid="true"]') !== null,
              );
            },
          )}
        >
          <MultiFieldInput fieldDescriptions={[fields[0]]} form={form} />
          <button type="submit">Save</button>
        </form>
      );
    }
    render(<Bare />);
    await submit();
    expect(foundInOnInvalid).toEqual([false]);
    expect(document.activeElement?.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement?.tagName).toBe('INPUT');
  });
});
