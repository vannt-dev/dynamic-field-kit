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
    const form = useDynamicForm({ fields, initialValues });

    form.setServerErrors({
      email: 'Already registered',
      name: ['Too short', '  '],
      nickname: null,
    });

    expect(form.errors.value).toEqual({
      email: ['Already registered'],
      name: ['Too short'],
    });
    expect(form.serverErrors.value).toEqual({
      email: ['Already registered'],
      name: ['Too short'],
    });
    expect(form.touched.value).toMatchObject({ email: true, name: true });
    // The form's own rules still pass: the server's verdict is not one of them.
    expect(form.isValid.value).toBe(true);
  });

  it('keeps a server error until the value it was about changes', () => {
    const form = useDynamicForm({ fields, initialValues });
    form.setServerErrors({
      email: 'Already registered',
      name: 'Too short',
      'contacts[1].phone': 'Not a phone number',
      _form: 'The order is closed',
    });

    form.setFieldValue('name', 'Alice');
    expect(Object.keys(form.errors.value).sort()).toEqual([
      '_form',
      'contacts[1].phone',
      'email',
    ]);

    // Another row of the group changes: the error of row 1 stays.
    form.setFieldValue('contacts', [{ phone: '9' }, { phone: '2' }]);
    expect(form.errors.value['contacts[1].phone']).toEqual([
      'Not a phone number',
    ]);

    form.setFieldValue('contacts', [{ phone: '9' }, { phone: '22' }]);
    expect(form.errors.value['contacts[1].phone']).toBeUndefined();
    expect(form.errors.value._form).toEqual(['The order is closed']);
  });

  it('lists a field own errors before the server ones, and stays writable', () => {
    const form = useDynamicForm({
      fields,
      initialValues: { ...initialValues, email: '' },
    });
    form.validate();
    form.setServerErrors({ email: 'Rejected' });

    expect(form.errors.value.email).toEqual(['Email is required', 'Rejected']);

    // `errors` was a plain ref before server errors existed; a write still
    // sets the form's own errors.
    form.errors.value = { name: ['Set by the app'] };
    expect(form.errors.value).toEqual({
      name: ['Set by the app'],
      email: ['Rejected'],
    });
  });

  it('clears one field, everything, on reset and on the next submit', async () => {
    const form = useDynamicForm({ fields, initialValues });
    const refuse = () =>
      form.setServerErrors({ email: 'Taken', name: 'Too short' });

    refuse();
    form.clearServerErrors('email');
    expect(form.errors.value).toEqual({ name: ['Too short'] });

    form.clearServerErrors();
    expect(form.errors.value).toEqual({});

    refuse();
    form.reset();
    expect(form.errors.value).toEqual({});
    expect(form.serverErrors.value).toEqual({});

    refuse();
    let seen: unknown;
    await form.handleSubmit(() => {
      seen = 'submitted';
    })();
    expect(seen).toBe('submitted');
    expect(form.errors.value).toEqual({});
  });
});
