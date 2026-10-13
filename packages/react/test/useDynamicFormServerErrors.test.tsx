import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { FieldDescription } from '../src';
import { useDynamicForm } from '../src';

const fields: FieldDescription[] = [
  {
    name: 'email',
    type: 'text',
    validate: (v) => (v ? undefined : 'Email is required'),
  },
  { name: 'name', type: 'text' },
  {
    name: 'contacts',
    type: 'text',
    fields: [{ name: 'phone', type: 'text' }],
  },
];

const initialValues = {
  email: 'a@example.com',
  name: 'Al',
  contacts: [{ phone: '1' }, { phone: '2' }],
};

describe('useDynamicForm server errors', () => {
  it('shows what the server refused, and marks those fields touched', () => {
    const { result } = renderHook(() =>
      useDynamicForm({ fields, initialValues }),
    );

    act(() => {
      result.current.setServerErrors({
        email: 'Already registered',
        name: ['Too short', '  '],
        nickname: null,
      });
    });

    expect(result.current.errors).toEqual({
      email: ['Already registered'],
      name: ['Too short'],
    });
    expect(result.current.serverErrors).toEqual({
      email: ['Already registered'],
      name: ['Too short'],
    });
    expect(result.current.touched).toMatchObject({ email: true, name: true });
    // The form's own rules still pass: the server's verdict is not one of them.
    expect(result.current.isValid).toBe(true);
  });

  it('keeps a server error until the value it was about changes', () => {
    const { result } = renderHook(() =>
      useDynamicForm({ fields, initialValues }),
    );
    act(() => {
      result.current.setServerErrors({
        email: 'Already registered',
        name: 'Too short',
        'contacts[1].phone': 'Not a phone number',
        _form: 'The order is closed',
      });
    });

    act(() => {
      result.current.setFieldValue('name', 'Alice');
    });
    expect(Object.keys(result.current.errors).sort()).toEqual([
      '_form',
      'contacts[1].phone',
      'email',
    ]);

    // Another row of the group changes: the error of row 1 stays.
    act(() => {
      result.current.setFieldValue('contacts', [
        { phone: '9' },
        { phone: '2' },
      ]);
    });
    expect(result.current.errors['contacts[1].phone']).toEqual([
      'Not a phone number',
    ]);

    act(() => {
      result.current.setFieldValue('contacts', [
        { phone: '9' },
        { phone: '22' },
      ]);
    });
    expect(result.current.errors['contacts[1].phone']).toBeUndefined();
    expect(result.current.errors._form).toEqual(['The order is closed']);
  });

  it('lists a field own errors before the server ones', () => {
    const { result } = renderHook(() =>
      useDynamicForm({
        fields,
        initialValues: { ...initialValues, email: '' },
      }),
    );
    act(() => {
      result.current.validate();
      result.current.setServerErrors({ email: 'Rejected' });
    });

    expect(result.current.errors.email).toEqual([
      'Email is required',
      'Rejected',
    ]);
  });

  it('clears one field, everything, on reset and on the next submit', async () => {
    const { result } = renderHook(() =>
      useDynamicForm({ fields, initialValues }),
    );
    const refuse = () =>
      act(() => {
        result.current.setServerErrors({ email: 'Taken', name: 'Too short' });
      });

    refuse();
    act(() => result.current.clearServerErrors('email'));
    expect(result.current.errors).toEqual({ name: ['Too short'] });

    act(() => result.current.clearServerErrors());
    expect(result.current.errors).toEqual({});

    refuse();
    act(() => result.current.reset());
    expect(result.current.errors).toEqual({});
    expect(result.current.serverErrors).toEqual({});

    refuse();
    let seen: unknown;
    await act(async () => {
      await result.current.handleSubmit(() => {
        seen = 'submitted';
      })();
    });
    expect(seen).toBe('submitted');
    expect(result.current.errors).toEqual({});
  });
});
