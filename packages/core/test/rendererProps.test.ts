import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetReservedPropWarnings,
  buildFieldRendererProps,
  FIELD_RENDERER_PROP_KEYS,
  makeErrorId,
  makeFieldId,
} from '../src/rendererProps';
import type { FieldDescription } from '../src/types';

describe('makeFieldId', () => {
  const title: FieldDescription = { name: 'title', type: 'text' };

  it('namespaces a field name under a prefix', () => {
    expect(makeFieldId(title, 'dfk-r1')).toBe('dfk-r1-title');
  });

  it('lets a field pin its own id, ignoring the prefix', () => {
    const pinned: FieldDescription = { ...title, id: 'my-title' };
    expect(makeFieldId(pinned, 'dfk-r1')).toBe('my-title');
  });

  it('produces different ids for two instances sharing a field name', () => {
    const field: FieldDescription = { name: 'title', type: 'text' };
    expect(makeFieldId(field, 'dfk-r1')).not.toBe(makeFieldId(field, 'dfk-r2'));
  });
});

describe('buildFieldRendererProps', () => {
  const field: FieldDescription = {
    name: 'username',
    type: 'text',
    label: 'Username',
    placeholder: 'Type your name',
    required: true,
    min: 1,
    max: 10,
    step: 1,
    accept: '.png',
    multiple: true,
    className: 'c',
    description: 'd',
    props: { maxLength: 5 },
  };

  it('forwards every declared FieldDescription prop the renderer contract names', () => {
    const p = buildFieldRendererProps({
      fieldDescription: field,
      data: { username: 'bob' },
      id: 'dfk-r1-username',
    });

    expect(p.placeholder).toBe('Type your name');
    expect(p.required).toBe(true);
    expect(p.min).toBe(1);
    expect(p.max).toBe(10);
    expect(p.step).toBe(1);
    expect(p.accept).toBe('.png');
    expect(p.multiple).toBe(true);
    expect(p.label).toBe('Username');
    expect(p.value).toBe('bob');
    expect(p.id).toBe('dfk-r1-username');
    expect(p.extraProps).toEqual({ maxLength: 5 });
  });

  it('passes touched and dirty straight through', () => {
    const p = buildFieldRendererProps({
      fieldDescription: field,
      data: {},
      id: 'x',
      touched: true,
      dirty: true,
    });
    expect(p.touched).toBe(true);
    expect(p.dirty).toBe(true);
  });

  it('uses controlled validation errors without running the field validator', () => {
    const validate = vi.fn(() => 'live error');
    const result = buildFieldRendererProps({
      fieldDescription: { name: 'name', type: 'text', validate },
      data: { name: '' },
      id: 'field-name',
      validationErrors: [],
    });

    expect(validate).not.toHaveBeenCalled();
    expect(result.error).toBeUndefined();
  });

  it('validates and sets aria flags', () => {
    const required: FieldDescription = {
      name: 'a',
      type: 'text',
      required: true,
      validate: (v) => (v ? undefined : 'Required'),
    };
    const p = buildFieldRendererProps({
      fieldDescription: required,
      data: { a: '' },
      id: 'x',
    });
    expect(p.error).toEqual(['Required']);
    expect(p.ariaInvalid).toBe(true);
    expect(p.ariaRequired).toBe(true);
  });

  it('skips validation for a disabled field', () => {
    const disabled: FieldDescription = {
      name: 'a',
      type: 'text',
      disabled: true,
      validate: () => 'Required',
    };
    const p = buildFieldRendererProps({
      fieldDescription: disabled,
      data: { a: '' },
      id: 'x',
    });
    expect(p.error).toBeUndefined();
    expect(p.ariaInvalid).toBe(false);
    expect(p.disabled).toBe(true);
  });

  it('resolves dynamic options against data and rootData', () => {
    const dyn: FieldDescription = {
      name: 'city',
      type: 'select',
      options: (data, rootData) => [
        { value: data['c'] },
        { value: rootData?.['r'] },
      ],
    };
    const p = buildFieldRendererProps({
      fieldDescription: dyn,
      data: { c: 1 },
      rootData: { r: 2 },
      id: 'x',
    });
    expect(p.options).toEqual([{ value: 1 }, { value: 2 }]);
  });

  it('returns a key for every prop the contract declares', () => {
    const p = buildFieldRendererProps({
      fieldDescription: field,
      data: {},
      id: 'x',
    });
    for (const key of FIELD_RENDERER_PROP_KEYS) {
      expect(Object.prototype.hasOwnProperty.call(p, key)).toBe(true);
    }
  });
});

describe('ariaDescribedBy', () => {
  it('points at the error node id when the field has an error', () => {
    const props = buildFieldRendererProps({
      fieldDescription: {
        name: 'title',
        type: 'text',
        required: true,
        validate: () => 'Required',
      },
      data: { title: '' },
      id: 'form-title',
    });

    expect(props.ariaInvalid).toBe(true);
    expect(props.ariaDescribedBy).toBe('form-title-error');
    expect(props.ariaDescribedBy).toBe(makeErrorId('form-title'));
  });

  it('is undefined when the field is valid', () => {
    const props = buildFieldRendererProps({
      fieldDescription: { name: 'title', type: 'text' },
      data: { title: 'ok' },
      id: 'form-title',
    });

    expect(props.ariaInvalid).toBe(false);
    expect(props.ariaDescribedBy).toBeUndefined();
  });

  it('is undefined for a disabled field, which is never validated', () => {
    const props = buildFieldRendererProps({
      fieldDescription: {
        name: 'title',
        type: 'text',
        disabled: true,
        validate: () => 'Required',
      },
      data: { title: '' },
      id: 'form-title',
    });

    expect(props.ariaDescribedBy).toBeUndefined();
  });
});

describe('reserved props warning', () => {
  beforeEach(() => {
    __resetReservedPropWarnings();
  });

  it('warns when props carries a key the contract owns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    buildFieldRendererProps({
      fieldDescription: {
        name: 'title',
        type: 'text',
        props: { placeholder: 'from props' },
      },
      data: {},
      id: 'form-title',
    });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('placeholder');
    expect(warn.mock.calls[0][0]).toContain('title');
    warn.mockRestore();
  });

  it('warns only once for the same field and key', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fieldDescription: FieldDescription = {
      name: 'title',
      type: 'text',
      props: { placeholder: 'from props' },
    };

    buildFieldRendererProps({ fieldDescription, data: {}, id: 'a' });
    buildFieldRendererProps({ fieldDescription, data: {}, id: 'a' });

    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('stays silent for props keys the contract does not own', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    buildFieldRendererProps({
      fieldDescription: {
        name: 'title',
        type: 'text',
        props: { maxLength: 10, acceptFile: 'x' },
      },
      data: {},
      id: 'form-title',
    });

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('stays silent in production', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    buildFieldRendererProps({
      fieldDescription: {
        name: 'title',
        type: 'text',
        props: { placeholder: 'from props' },
      },
      data: {},
      id: 'form-title',
    });

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
    process.env.NODE_ENV = previous;
  });
});

describe('options loading state', () => {
  const asyncField: FieldDescription = {
    name: 'city',
    type: 'text',
    options: async () => [{ value: 'hn' }],
  };

  it('takes options and status from the supplied loader state', () => {
    const props = buildFieldRendererProps({
      fieldDescription: asyncField,
      data: {},
      id: 'f-city',
      optionsState: { status: 'ready', options: [{ value: 'hn' }] },
    });

    expect(props.options).toEqual([{ value: 'hn' }]);
    expect(props.optionsStatus).toBe('ready');
    expect(props.optionsError).toBeUndefined();
  });

  it('surfaces a load failure', () => {
    const boom = new Error('down');
    const props = buildFieldRendererProps({
      fieldDescription: asyncField,
      data: {},
      id: 'f-city',
      optionsState: { status: 'error', error: boom },
    });

    expect(props.optionsStatus).toBe('error');
    expect(props.optionsError).toBe(boom);
  });

  it('leaves a synchronous field untouched', () => {
    const props = buildFieldRendererProps({
      fieldDescription: {
        name: 'city',
        type: 'text',
        options: [{ value: 'hn' }],
      },
      data: {},
      id: 'f-city',
    });

    expect(props.options).toEqual([{ value: 'hn' }]);
    expect(props.optionsStatus).toBeUndefined();
  });

  it('declares both new keys in the contract', () => {
    expect(FIELD_RENDERER_PROP_KEYS).toContain('optionsStatus');
    expect(FIELD_RENDERER_PROP_KEYS).toContain('optionsError');
  });
});
