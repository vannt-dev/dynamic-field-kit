import { describe, expect, it } from 'vitest';
import { FORM_ERROR_KEY, serverErrorsFrom } from '../src/serverErrors';

describe('serverErrorsFrom', () => {
  it('reads a map of field to message or messages', () => {
    expect(
      serverErrorsFrom({
        email: 'Already registered',
        name: ['Too short', 'No digits'],
      }),
    ).toEqual({
      email: ['Already registered'],
      name: ['Too short', 'No digits'],
    });
  });

  it('reads the errors member of a response body (ASP.NET, Laravel)', () => {
    expect(
      serverErrorsFrom({
        type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
        title: 'One or more validation errors occurred.',
        status: 400,
        errors: { email: ['The email field is required.'] },
      }),
    ).toEqual({ email: ['The email field is required.'] });
  });

  it('reads a list of errors that name their field in the usual ways', () => {
    expect(
      serverErrorsFrom({
        errors: [
          { field: 'email', message: 'Already registered' },
          { path: 'name', message: 'Too short' },
          { name: 'age', detail: 'Must be 18 or more' },
          { pointer: '/contacts/1/phone', detail: 'Not a phone number' },
          { source: { pointer: '/data/attributes/title' }, detail: 'Taken' },
          {
            property: 'email',
            constraints: { isEmail: 'email must be an email' },
          },
        ],
      }),
    ).toEqual({
      email: ['Already registered', 'email must be an email'],
      name: ['Too short'],
      age: ['Must be 18 or more'],
      'contacts[1].phone': ['Not a phone number'],
      title: ['Taken'],
    });
  });

  it('writes a path the way the kit writes it', () => {
    expect(
      serverErrorsFrom({
        'contacts.0.email': 'a',
        'contacts[1].email': 'b',
        '/contacts/2/email': 'c',
        '$.contacts[3].email': 'd',
        '#/a~1b/0': 'e',
      }),
    ).toEqual({
      'contacts[0].email': ['a'],
      'contacts[1].email': ['b'],
      'contacts[2].email': ['c'],
      'contacts[3].email': ['d'],
      'a/b[0]': ['e'],
    });
  });

  it('gives a key the spelling of the form field it names, whatever its case', () => {
    expect(
      serverErrorsFrom(
        {
          Email: 'Already registered',
          'Contacts[0].Phone': 'Not a phone number',
          Unknown: 'x',
        },
        { paths: ['email', 'contacts[0].phone'] },
      ),
    ).toEqual({
      email: ['Already registered'],
      'contacts[0].phone': ['Not a phone number'],
      Unknown: ['x'],
    });
  });

  it('keeps what names no field under the form key', () => {
    expect(
      serverErrorsFrom({
        errors: [
          { message: 'The order is closed' },
          { field: '', message: 'Try again later' },
        ],
      }),
    ).toEqual({ [FORM_ERROR_KEY]: ['The order is closed', 'Try again later'] });
    expect(serverErrorsFrom({ '': 'Rejected' })).toEqual({
      [FORM_ERROR_KEY]: ['Rejected'],
    });
  });

  it('drops empty messages, and answers nothing for what is not a set of errors', () => {
    expect(
      serverErrorsFrom({
        email: ['', '  '],
        name: null,
        age: undefined,
        title: [],
      }),
    ).toEqual({});
    expect(serverErrorsFrom(undefined)).toEqual({});
    expect(serverErrorsFrom(null)).toEqual({});
    expect(serverErrorsFrom('Bad Request')).toEqual({});
    expect(serverErrorsFrom({ errors: 'Bad Request' })).toEqual({});
    expect(
      serverErrorsFrom({ errors: [{ field: 'email' }, 'oops', null] }),
    ).toEqual({});
  });

  it('does not take the members of a problem body for fields', () => {
    // A problem body without an errors member names no field: its title is not a field's error.
    expect(
      serverErrorsFrom({
        title: 'Conflict',
        status: 409,
        detail: 'Already shipped',
      }),
    ).toEqual({});
  });
});

describe('serverErrorsFrom, shapes of validation libraries', () => {
  it('reads the issues of a Zod error, whose paths are lists of segments', () => {
    expect(
      serverErrorsFrom({
        issues: [
          { path: ['contacts', 0, 'email'], message: 'Invalid email' },
          { path: [], message: 'Passwords do not match' },
        ],
      }),
    ).toEqual({
      'contacts[0].email': ['Invalid email'],
      [FORM_ERROR_KEY]: ['Passwords do not match'],
    });
  });

  it('reads a flattened Zod error', () => {
    expect(
      serverErrorsFrom({
        formErrors: ['Rejected'],
        fieldErrors: { email: ['Invalid email'] },
      }),
    ).toEqual({ email: ['Invalid email'], [FORM_ERROR_KEY]: ['Rejected'] });
  });

  it('reads a bare list', () => {
    expect(
      serverErrorsFrom([{ param: 'email', msg: 'Invalid value' }]),
    ).toEqual({
      email: ['Invalid value'],
    });
  });
});
