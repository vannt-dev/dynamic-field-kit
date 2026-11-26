import { Component, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { required, validate } from '@angular/forms/signals';
import {
  FieldDescription,
  type Properties,
  validators,
} from '@dynamic-field-kit/core';
import { describe, expect, it, vi } from 'vitest';
import {
  createSignalFormStore,
  DFK_VALIDATION_KIND,
  fieldTreeAt,
  type SignalFormStoreOptions,
} from '../signal-forms/src/public-api';
import { MultiFieldInput } from '../src/components/MultiFieldInput';
import { FIELD_REGISTRY } from '../src/fieldRegistryToken';
import { makeRegistry, TextRendererComponent } from './helpers/renderers';

const fields: FieldDescription[] = [
  {
    name: 'email',
    type: 'text',
    required: true,
    validate: validators.compose(
      validators.required('Email is required'),
      validators.email('Enter a valid email'),
    ),
  },
  { name: 'nickname', type: 'text' },
];

type Signup = { email: string; nickname: string };

function makeStore<T extends Properties = Signup>(
  options: Partial<SignalFormStoreOptions<T>> = {},
) {
  return createSignalFormStore<T>({
    fields,
    initialValues: { email: '', nickname: '' } as unknown as Partial<T>,
    injector: TestBed.inject(Injector),
    ...options,
  });
}

describe('createSignalFormStore', () => {
  it('needs an injection context or an injector', () => {
    expect(() => createSignalFormStore({ fields })).toThrow();
    const store = TestBed.runInInjectionContext(() =>
      createSignalFormStore({ fields }),
    );
    expect(store.isValid()).toBe(false);
  });

  it('puts the field rules on the Signal Forms fields', () => {
    const store = makeStore();

    expect(store.isValid()).toBe(false);
    const errors = store.form.email().errors();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      kind: DFK_VALIDATION_KIND,
      path: 'email',
    });
    expect(store.form.nickname().valid()).toBe(true);

    store.setFieldValue('email', 'nope');
    expect(store.form.email().errors()[0].message).toBe('Enter a valid email');

    store.setFieldValue('email', 'ada@example.com');
    expect(store.form.email().valid()).toBe(true);
    expect(store.isValid()).toBe(true);
  });

  it('shows an error only once its field is touched', () => {
    const store = makeStore();

    expect(Object.keys(store.allErrors())).toEqual(['email']);
    expect(store.errors()).toEqual({});

    store.handleBlur('email');
    expect(store.touched()).toEqual({ email: true });
    expect(store.form.email().touched()).toBe(true);
    expect(store.errors().email).toHaveLength(1);
  });

  it('keeps errors and touched for a field the model has no value for', () => {
    const store = makeStore({ initialValues: {} });

    expect(fieldTreeAt(store.form, 'email')).toBeUndefined();
    expect(store.isValid()).toBe(false);
    expect(store.allErrors().email).toHaveLength(1);

    store.handleBlur('email');
    expect(store.errors().email).toHaveLength(1);
  });

  it('keys group and section errors by their dfk path', () => {
    const store = makeStore({
      fields: [
        {
          name: 'contacts',
          type: 'text',
          fields: [
            { name: 'email', type: 'text', validate: validators.required() },
          ],
        },
        {
          name: 'address',
          type: 'text',
          section: [
            { name: 'city', type: 'text', validate: validators.required() },
          ],
        },
      ],
      initialValues: {
        contacts: [{ email: 'a@b.c' }, { email: '' }],
        address: { city: '' },
      },
    });

    const all = store.allErrors();
    expect(Object.keys(all).sort()).toEqual([
      'address.city',
      'contacts[1].email',
    ]);
    const item = fieldTreeAt(store.form, 'contacts[1].email');
    expect(item?.().errors()).toHaveLength(1);
    expect(fieldTreeAt(store.form, 'address.city')?.().invalid()).toBe(true);
  });

  it('turns appearWhen, disabledWhen and readOnlyWhen into field state', () => {
    const store = makeStore<{ kind: string; company: string; locked: string }>({
      fields: [
        { name: 'kind', type: 'text' },
        {
          name: 'company',
          type: 'text',
          validate: validators.required(),
          appearWhen: { field: 'kind', equals: 'business' },
        },
        {
          name: 'locked',
          type: 'text',
          disabledWhen: { field: 'kind', equals: 'locked' },
          readOnlyWhen: { field: 'kind', equals: 'ro' },
        },
      ] as FieldDescription[],
      initialValues: { kind: 'person', company: '', locked: '' },
    });

    expect(store.form.company().hidden()).toBe(true);
    expect(store.isValid()).toBe(true);

    store.setFieldValue('kind', 'business');
    expect(store.form.company().hidden()).toBe(false);
    expect(store.isValid()).toBe(false);

    store.setFieldValue('kind', 'locked');
    expect(store.form.locked().disabled()).toBe(true);
    store.setFieldValue('kind', 'ro');
    expect(store.form.locked().disabled()).toBe(false);
    expect(store.form.locked().readonly()).toBe(true);
  });

  it('reports errors from an extra Signal Forms schema under the dfk path', () => {
    const store = makeStore<Signup>({
      schema: (p) => {
        required(p.nickname, { message: 'Pick a nickname' });
        validate(p.nickname, ({ value }) =>
          value() === 'admin'
            ? { kind: 'reserved', message: 'Reserved' }
            : undefined,
        );
      },
    });

    expect(store.allErrors().nickname).toEqual(['Pick a nickname']);
    store.setFieldValue('nickname', 'admin');
    expect(store.allErrors().nickname).toEqual(['Reserved']);
  });

  it('runs computed values and tracks dirty', () => {
    const store = makeStore<{ a: number; b: number; sum: number }>({
      fields: [
        { name: 'a', type: 'number' },
        { name: 'b', type: 'number' },
        {
          name: 'sum',
          type: 'number',
          computeValue: (data) => Number(data.a ?? 0) + Number(data.b ?? 0),
        },
      ] as FieldDescription[],
      initialValues: { a: 1, b: 2 },
    });

    expect(store.data().sum).toBe(3);
    expect(store.isDirty()).toBe(false);
    store.handleChange({ ...store.data(), a: 5 });
    expect(store.data().sum).toBe(7);
    expect(store.isDirty()).toBe(true);
    expect(store.form.a().dirty()).toBe(true);
  });

  it('resets values, touched and dirty', () => {
    const store = makeStore();
    store.setFieldValue('email', 'x');
    store.handleBlur('email');

    store.reset({ email: 'ada@example.com', nickname: '' });

    expect(store.data().email).toBe('ada@example.com');
    expect(store.touched()).toEqual({});
    expect(store.isDirty()).toBe(false);
    expect(store.isValid()).toBe(true);
  });

  it('validate() touches every field and answers validity', () => {
    const store = makeStore();
    expect(store.validate()).toBe(false);
    expect(store.touched()).toEqual({ email: true, nickname: true });
    expect(store.errors().email).toHaveLength(1);
  });

  describe('handleSubmit', () => {
    it('calls onInvalid and not onValid on an invalid form', async () => {
      const store = makeStore();
      const onValid = vi.fn();
      const onInvalid = vi.fn();
      const preventDefault = vi.fn();

      await store.handleSubmit(
        onValid,
        onInvalid,
      )({
        preventDefault,
      } as unknown as Event);

      expect(preventDefault).toHaveBeenCalled();
      expect(onValid).not.toHaveBeenCalled();
      expect(onInvalid).toHaveBeenCalledWith({
        email: [expect.any(String)],
      });
      expect(store.errors().email).toHaveLength(1);
      expect(store.submitCount()).toBe(1);
    });

    it('calls onValid with the data on a valid form', async () => {
      const store = makeStore({
        initialValues: { email: 'ada@example.com', nickname: 'ada' },
      });
      const onValid = vi.fn();

      await store.handleSubmit(onValid)();

      expect(onValid).toHaveBeenCalledWith({
        email: 'ada@example.com',
        nickname: 'ada',
      });
      expect(store.isSubmitting()).toBe(false);
    });

    it('runs async validators on submit and shows their errors', async () => {
      const store = makeStore<{ username: string }>({
        fields: [
          {
            name: 'username',
            type: 'text',
            validationMode: 'async',
            validate: async (value: unknown) =>
              value === 'taken' ? 'Already taken' : undefined,
          },
        ] as FieldDescription[],
        initialValues: { username: 'taken' },
      });
      const onValid = vi.fn();
      const onInvalid = vi.fn();

      // The sync pass cannot see an async rule.
      expect(store.isValid()).toBe(true);
      await store.handleSubmit(onValid, onInvalid)();

      expect(onValid).not.toHaveBeenCalled();
      expect(onInvalid).toHaveBeenCalledWith({ username: ['Already taken'] });
      expect(store.form.username().errors()[0].message).toBe('Already taken');

      store.setFieldValue('username', 'free');
      expect(store.allErrors()).toEqual({});
      await store.handleSubmit(onValid, onInvalid)();
      expect(onValid).toHaveBeenCalledWith({ username: 'free' });
    });

    it('puts server errors on their field until it changes', async () => {
      const store = makeStore({
        initialValues: { email: 'ada@example.com', nickname: '' },
      });

      await store.handleSubmit(() => ({ email: 'Already registered' }))();

      expect(store.errors()).toEqual({ email: ['Already registered'] });
      expect(store.isValid()).toBe(false);

      store.setFieldValue('email', 'grace@example.com');
      expect(store.errors()).toEqual({});
      expect(store.isValid()).toBe(true);
    });
  });
});

@Component({
  standalone: true,
  imports: [MultiFieldInput],
  template: `
    <dfk-multi-field-input
      [fieldDescriptions]="fields"
      [properties]="store.data()"
      [errors]="store.errors()"
      [touched]="store.touched()"
      (onChange)="store.handleChange($event)"
      (onBlurField)="store.handleBlur($event)"
    ></dfk-multi-field-input>
  `,
})
class SignalFormHostComponent {
  fields = fields;
  store = createSignalFormStore<Signup>({
    fields,
    initialValues: { email: '', nickname: '' },
  });
}

describe('createSignalFormStore with <dfk-multi-field-input>', () => {
  it('drives the rendered form from the Signal Form', async () => {
    const registry = makeRegistry();
    registry.register('text', TextRendererComponent as never);
    TestBed.configureTestingModule({
      imports: [SignalFormHostComponent],
      providers: [{ provide: FIELD_REGISTRY, useValue: registry }],
    });
    const fixture = TestBed.createComponent(SignalFormHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const input = root.querySelectorAll('input')[0];

    expect(root.querySelector('.err')).toBeNull();

    input.value = 'nope';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    const store = fixture.componentInstance.store;
    expect(store.form.email().value()).toBe('nope');
    expect(store.form.email().touched()).toBe(true);
    expect(root.querySelector('.err')?.textContent).toContain(
      'Enter a valid email',
    );

    input.value = 'ada@example.com';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelector('.err')).toBeNull();
    expect(store.isValid()).toBe(true);
  });
});
