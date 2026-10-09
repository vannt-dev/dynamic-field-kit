import { FieldRegistry, fieldRegistry } from '@dynamic-field-kit/core';
import { describe, expect, it, vi } from 'vitest';
import DynamicInput from '../src/components/DynamicInput.svelte';
import {
  defaultRenderersMap,
  getDefaultRenderer,
} from '../src/defaultRenderers';
import ProbeRenderer, { seen } from './fixtures/ProbeRenderer.svelte';
import RegistryReader from './fixtures/RegistryReader.svelte';
import RegistryScope from './fixtures/RegistryScope.svelte';
import { fire, probeRegistry, render, type } from './helpers';

describe('DynamicInput with the default renderers', () => {
  it('has a renderer for every built-in type', () => {
    expect(Object.keys(defaultRenderersMap).sort()).toEqual(
      [
        'checkbox',
        'date',
        'datetime-local',
        'email',
        'file',
        'number',
        'password',
        'radio',
        'range',
        'select',
        'switch',
        'text',
        'textarea',
        'time',
      ].sort(),
    );
    expect(getDefaultRenderer('text')).toBe(defaultRenderersMap.text);
    expect(getDefaultRenderer('nope')).toBeUndefined();
  });

  it('text: shows the value, reports typing and blur, carries the attributes', () => {
    const onChange = vi.fn();
    const onBlur = vi.fn();
    const { target } = render(DynamicInput, {
      type: 'text',
      id: 'name',
      value: 'Ada',
      className: 'wide',
      placeholder: 'Your name',
      required: true,
      readOnly: true,
      ariaInvalid: true,
      ariaDescribedBy: 'name-error',
      ariaRequired: true,
      onChange,
      onBlur,
    });
    const input = target.querySelector('input')!;

    expect(input.type).toBe('text');
    expect(input.id).toBe('name');
    expect(input.value).toBe('Ada');
    expect(input.className).toBe('wide');
    expect(input.placeholder).toBe('Your name');
    expect(input.required).toBe(true);
    expect(input.readOnly).toBe(true);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('name-error');
    expect(input.getAttribute('aria-required')).toBe('true');

    type(input, 'Grace');
    expect(onChange).toHaveBeenCalledWith('Grace');
    fire(input, 'blur');
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('an empty value renders as an empty control, not as "undefined"', () => {
    for (const kind of ['text', 'number', 'textarea'] as const) {
      const { target } = render(DynamicInput, { type: kind, id: kind });
      expect(
        (target.querySelector('input, textarea') as HTMLInputElement).value,
      ).toBe('');
    }
  });

  it.each([
    ['password', 'password'],
    ['email', 'email'],
    ['date', 'date'],
    ['time', 'time'],
    ['datetime-local', 'datetime-local'],
  ] as const)('%s is a text control of that input type', (kind, inputType) => {
    const onChange = vi.fn();
    const { target } = render(DynamicInput, { type: kind, id: 'x', onChange });
    const input = target.querySelector('input')!;

    expect(input.type).toBe(inputType);
    type(input, kind === 'date' ? '2026-10-08' : '10:30');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('number: reports a number, and no value when emptied', () => {
    const onChange = vi.fn();
    const onBlur = vi.fn();
    const { target } = render(DynamicInput, {
      type: 'number',
      id: 'age',
      value: 36,
      onChange,
      onBlur,
    });
    const input = target.querySelector('input')!;

    expect(input.type).toBe('number');
    expect(input.value).toBe('36');
    type(input, '37');
    expect(onChange).toHaveBeenLastCalledWith(37);
    type(input, '');
    expect(onChange).toHaveBeenLastCalledWith(undefined);
    fire(input, 'blur');
    expect(onBlur).toHaveBeenCalled();
  });

  it('textarea: reports typing and blur', () => {
    const onChange = vi.fn();
    const onBlur = vi.fn();
    const { target } = render(DynamicInput, {
      type: 'textarea',
      id: 'bio',
      value: 'Hello',
      onChange,
      onBlur,
    });
    const area = target.querySelector('textarea')!;

    expect(area.value).toBe('Hello');
    type(area, 'Hello there');
    expect(onChange).toHaveBeenCalledWith('Hello there');
    fire(area, 'blur');
    expect(onBlur).toHaveBeenCalled();
  });

  it.each(['checkbox', 'switch'] as const)(
    '%s: reports checked, and read-only disables it',
    (kind) => {
      const onChange = vi.fn();
      const onBlur = vi.fn();
      const { target } = render(DynamicInput, {
        type: kind,
        id: 'agree',
        value: true,
        onChange,
        onBlur,
      });
      const box = target.querySelector('input')!;

      expect(box.type).toBe('checkbox');
      expect(box.checked).toBe(true);
      box.checked = false;
      fire(box, 'change');
      expect(onChange).toHaveBeenCalledWith(false);
      fire(box, 'blur');
      expect(onBlur).toHaveBeenCalled();

      const locked = render(DynamicInput, {
        type: kind,
        id: 'locked',
        readOnly: true,
      });
      expect(locked.target.querySelector('input')!.disabled).toBe(true);
    },
  );

  it('select: lists the options however they are written, and reports the choice', () => {
    const onChange = vi.fn();
    const onBlur = vi.fn();
    const { target } = render(DynamicInput, {
      type: 'select',
      id: 'colour',
      value: 2,
      options: [
        { value: 'r', label: 'Red' },
        { id: 2, name: 'Green' },
        { value: 'b' },
      ],
      onChange,
      onBlur,
    });
    const select = target.querySelector('select')!;
    const options = [...select.querySelectorAll('option')];

    expect(options.map((option) => [option.value, option.textContent])).toEqual(
      [
        ['', '-- Select --'],
        ['r', 'Red'],
        ['2', 'Green'],
        ['b', 'b'],
      ],
    );
    expect(options[0]!.disabled).toBe(true);
    expect(select.value).toBe('2');

    select.value = 'b';
    fire(select, 'change');
    expect(onChange).toHaveBeenCalledWith('b');
    fire(select, 'blur');
    expect(onBlur).toHaveBeenCalled();

    // No value yet: the placeholder option is the one shown.
    const empty = render(DynamicInput, { type: 'select', id: 'none' });
    expect(empty.target.querySelector('select')!.value).toBe('');
  });

  it('radio: one button per option, the value keeps its own type', () => {
    const onChange = vi.fn();
    const onBlur = vi.fn();
    const { target } = render(DynamicInput, {
      type: 'radio',
      id: 'size',
      value: 2,
      className: 'sizes',
      ariaInvalid: true,
      options: [
        { value: 1, label: 'Small' },
        { value: 2, label: 'Large' },
      ],
      onChange,
      onBlur,
    });
    const group = target.querySelector('[role="radiogroup"]')!;
    const radios = [...target.querySelectorAll<HTMLInputElement>('input')];

    expect(group.className).toBe('dfk-radio-group sizes');
    expect(group.getAttribute('aria-invalid')).toBe('true');
    expect(
      radios.map((radio) => [radio.id, radio.name, radio.checked]),
    ).toEqual([
      ['size-0', 'size', false],
      ['size-1', 'size', true],
    ]);
    expect(target.textContent).toContain('Small');

    radios[0]!.checked = true;
    fire(radios[0]!, 'change');
    // The number 1, not the string the DOM holds.
    expect(onChange).toHaveBeenCalledWith(1);
    fire(radios[0]!, 'focusout');
    expect(onBlur).toHaveBeenCalled();

    const bare = render(DynamicInput, {
      type: 'radio',
      options: [{ value: 'a' }],
      disabled: true,
    });
    const only = bare.target.querySelector('input')!;
    expect(only.id).toBe('radio-0');
    expect(only.disabled).toBe(true);
  });

  it('range: starts at the minimum and reports a number', () => {
    const onChange = vi.fn();
    const onBlur = vi.fn();
    const { target } = render(DynamicInput, {
      type: 'range',
      id: 'volume',
      min: 10,
      max: 50,
      step: 5,
      onChange,
      onBlur,
    });
    const input = target.querySelector('input')!;

    expect(input.type).toBe('range');
    expect([input.min, input.max, input.step, input.value]).toEqual([
      '10',
      '50',
      '5',
      '10',
    ]);
    type(input, '25');
    expect(onChange).toHaveBeenCalledWith(25);
    fire(input, 'blur');
    expect(onBlur).toHaveBeenCalled();
  });

  it('file: reports the file, or the list for multiple', () => {
    const one = new File(['a'], 'a.txt');
    const two = new File(['b'], 'b.txt');
    const choose = (input: HTMLInputElement, files: File[] | null) => {
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: files,
      });
      fire(input, 'change');
    };

    const onChange = vi.fn();
    const onBlur = vi.fn();
    const single = render(DynamicInput, {
      type: 'file',
      id: 'doc',
      accept: '.txt',
      onChange,
      onBlur,
    });
    const input = single.target.querySelector('input')!;
    expect(input.type).toBe('file');
    expect(input.accept).toBe('.txt');
    choose(input, [one]);
    expect(onChange).toHaveBeenLastCalledWith(one);
    choose(input, []);
    expect(onChange).toHaveBeenLastCalledWith(null);
    onChange.mockClear();
    choose(input, null);
    expect(onChange).not.toHaveBeenCalled();
    fire(input, 'blur');
    expect(onBlur).toHaveBeenCalled();

    const many = render(DynamicInput, {
      type: 'file',
      id: 'docs',
      multiple: true,
      onChange,
    });
    const multiple = many.target.querySelector('input')!;
    expect(multiple.multiple).toBe(true);
    choose(multiple, [one, two]);
    expect(onChange).toHaveBeenLastCalledWith([one, two]);
  });

  it('shows the first error under a default control, with the id aria points at', () => {
    const list = render(DynamicInput, {
      type: 'text',
      id: 'name',
      error: ['Too short', 'Not a name'],
    });
    const message = list.target.querySelector('.dfk-field-error')!;
    expect(message.id).toBe('name-error');
    expect(message.getAttribute('role')).toBe('alert');
    expect(message.textContent?.trim()).toBe('Too short');

    // A plain string is the message, not its first character.
    const text = render(DynamicInput, {
      type: 'text',
      id: 'city',
      error: 'Required',
    });
    expect(
      text.target.querySelector('.dfk-field-error')!.textContent?.trim(),
    ).toBe('Required');

    for (const props of [
      { type: 'text', id: 'ok' },
      { type: 'text', id: 'empty', error: [] },
      { type: 'text', error: 'No id to point at' },
    ] as const) {
      const { target } = render(DynamicInput, props);
      expect(target.querySelector('.dfk-field-error')).toBeNull();
    }
  });

  it('says so when no renderer exists for the type', () => {
    const { target } = render(DynamicInput, { type: 'mystery', id: 'm' });
    expect(target.textContent).toContain('Unknown field type: mystery');
  });
});

describe('DynamicInput with a registered renderer', () => {
  it('hands it the whole renderer contract, and extra props besides', () => {
    const onChange = vi.fn();
    const onBlur = vi.fn();
    const onOptionsQuery = vi.fn();
    const options = [{ value: 'a' }];
    const { target } = render(
      DynamicInput,
      {
        type: 'probe',
        id: 'p',
        value: 'v',
        label: 'Label',
        placeholder: 'Hint',
        required: true,
        touched: true,
        dirty: true,
        options,
        optionsStatus: 'ready',
        optionsError: undefined,
        className: 'c',
        description: 'About',
        disabled: false,
        readOnly: false,
        error: ['Bad'],
        ariaInvalid: true,
        ariaDescribedBy: 'p-error',
        ariaRequired: true,
        min: 1,
        max: 9,
        step: 2,
        accept: 'image/*',
        multiple: false,
        extraProps: { rows: 4, value: 'ignored' },
        onChange,
        onBlur,
        onOptionsQuery,
      },
      probeRegistry(),
    );

    expect(seen.get('p')).toMatchObject({
      value: 'v',
      label: 'Label',
      placeholder: 'Hint',
      required: true,
      touched: true,
      dirty: true,
      options,
      optionsStatus: 'ready',
      className: 'c',
      description: 'About',
      disabled: false,
      readOnly: false,
      error: ['Bad'],
      id: 'p',
      ariaInvalid: true,
      ariaDescribedBy: 'p-error',
      ariaRequired: true,
      min: 1,
      max: 9,
      step: 2,
      accept: 'image/*',
      multiple: false,
      // An extra prop arrives as given; one that collides with the contract
      // loses to the contract.
      rows: 4,
      onOptionsQuery,
    });

    const input = target.querySelector('input')!;
    type(input, 'next');
    expect(onChange).toHaveBeenCalledWith('next');
    fire(input, 'blur');
    expect(onBlur).toHaveBeenCalled();
    // A custom renderer shows its own errors.
    expect(target.querySelector('.dfk-field-error')).toBeNull();
  });

  it('wins over the default renderer of the same type', () => {
    const registry = new FieldRegistry();
    registry.register('text', ProbeRenderer as never);
    const { target } = render(
      DynamicInput,
      { type: 'text', id: 'own', value: 'x' },
      registry,
    );
    expect(target.querySelector('[data-probe]')).not.toBeNull();
  });

  it('a registry provided by a component reaches the inputs below it', () => {
    const { target } = render(RegistryScope, {
      registry: probeRegistry(),
      type: 'probe',
    });
    expect(target.querySelector('[data-probe]')).not.toBeNull();

    // The same type without that provider is unknown: nothing leaked into
    // the global registry.
    const outside = render(DynamicInput, { type: 'probe', id: 'out' });
    expect(outside.target.textContent).toContain('Unknown field type: probe');
  });

  it('falls back to the global registry when nothing is provided', () => {
    let found: FieldRegistry | undefined;
    render(RegistryReader, {
      onRegistry: (registry: FieldRegistry) => {
        found = registry;
      },
    });
    expect(found).toBe(fieldRegistry);
  });
});
