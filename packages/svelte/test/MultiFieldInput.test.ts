import {
  validators,
  type FieldDescription,
  type Properties,
  type ValidationResult,
} from '@dynamic-field-kit/core';
import { describe, expect, it, vi } from 'vitest';
import MultiFieldInput from '../src/components/MultiFieldInput.svelte';
import { layoutRegistry } from '../src/layout/layoutRegistry';
import '../src/layout/defaultLayouts';
import BoxLayout from './fixtures/BoxLayout.svelte';
import FormHarness from './fixtures/FormHarness.svelte';
import {
  act,
  click,
  fire,
  probeRegistry,
  render,
  settle,
  type,
} from './helpers';

const person: FieldDescription[] = [
  { name: 'first', type: 'probe', validate: validators.required() },
  { name: 'last', type: 'probe' },
  {
    name: 'full',
    type: 'probe',
    computeValue: (data) =>
      [data.first, data.last].filter(Boolean).join(' ') || undefined,
  },
  {
    name: 'nickname',
    type: 'probe',
    appearCondition: (data) => data.first === 'Ada',
  },
];

const input = (target: Element, id: string) =>
  target.querySelector<HTMLInputElement>(`[id="${id}"]`)!;
const ids = (target: Element) =>
  [...target.querySelectorAll('input')].map((element) => element.id);

describe('MultiFieldInput', () => {
  it('renders the fields in order and hides the ones whose condition fails', () => {
    const { target } = render(
      MultiFieldInput,
      {
        fieldDescriptions: person,
        properties: { first: 'Bob' },
        idPrefix: 'p',
      },
      probeRegistry(),
    );
    expect(ids(target)).toEqual(['p-first', 'p-last', 'p-full']);

    const shown = render(
      MultiFieldInput,
      {
        fieldDescriptions: person,
        properties: { first: 'Ada' },
        idPrefix: 'q',
      },
      probeRegistry(),
    );
    expect(ids(shown.target)).toEqual([
      'q-first',
      'q-last',
      'q-full',
      'q-nickname',
    ]);
    // Computed from the values handed in, before anyone types.
    expect(input(shown.target, 'q-full').value).toBe('Ada');
  });

  it('on its own it keeps what the user typed and reports every change', () => {
    const onChange = vi.fn();
    const { target } = render(
      MultiFieldInput,
      { fieldDescriptions: person, idPrefix: 'u', onChange },
      probeRegistry(),
    );

    type(input(target, 'u-first'), 'Ada');
    expect(onChange).toHaveBeenLastCalledWith({ first: 'Ada', full: 'Ada' });
    type(input(target, 'u-last'), 'Lovelace');
    expect(onChange).toHaveBeenLastCalledWith({
      first: 'Ada',
      last: 'Lovelace',
      full: 'Ada Lovelace',
    });

    // The first change is still there after the second, the computed field
    // follows, and the conditional field has appeared.
    expect(input(target, 'u-first').value).toBe('Ada');
    expect(input(target, 'u-full').value).toBe('Ada Lovelace');
    expect(ids(target)).toContain('u-nickname');
  });

  it('gives two forms on one page different ids for the same field', () => {
    const one = render(
      MultiFieldInput,
      { fieldDescriptions: person },
      probeRegistry(),
    );
    const two = render(
      MultiFieldInput,
      { fieldDescriptions: person },
      probeRegistry(),
    );
    const first = ids(one.target)[0]!;
    const second = ids(two.target)[0]!;

    expect(first).toMatch(/^dfk-\d+-first$/);
    expect(second).toMatch(/^dfk-\d+-first$/);
    expect(first).not.toBe(second);
  });

  it('tracks touched fields itself, and lets the owner read, set and clear them', () => {
    const onTouchedChange = vi.fn();
    const onBlurField = vi.fn();
    const { target, instance } = render(
      MultiFieldInput,
      {
        fieldDescriptions: person,
        idPrefix: 't',
        onTouchedChange,
        onBlurField,
      },
      probeRegistry(),
    );
    const api = instance as unknown as {
      getTouched: () => Record<string, boolean>;
      setFieldTouched: (name: string, touched?: boolean) => void;
      resetTouched: () => void;
    };

    expect(input(target, 't-first').dataset.touched).toBe('false');
    fire(input(target, 't-first'), 'blur');
    expect(input(target, 't-first').dataset.touched).toBe('true');
    expect(onTouchedChange).toHaveBeenLastCalledWith({ first: true });
    expect(onBlurField).toHaveBeenCalledWith('first');
    expect(api.getTouched()).toEqual({ first: true });

    act(() => api.setFieldTouched('last'));
    expect(input(target, 't-last').dataset.touched).toBe('true');
    expect(onTouchedChange).toHaveBeenLastCalledWith({
      first: true,
      last: true,
    });
    act(() => api.setFieldTouched('last', false));
    expect(api.getTouched()).toEqual({ first: true, last: false });

    act(() => api.resetTouched());
    expect(api.getTouched()).toEqual({});
    expect(input(target, 't-first').dataset.touched).toBe('false');
  });

  it('a touched map handed in is the truth: blurs are reported, not kept', () => {
    const onTouchedChange = vi.fn();
    const { target, instance } = render(
      MultiFieldInput,
      {
        fieldDescriptions: person,
        idPrefix: 'c',
        touched: { last: true },
        onTouchedChange,
      },
      probeRegistry(),
    );
    const api = instance as unknown as {
      getTouched: () => Record<string, boolean>;
      setFieldTouched: (name: string) => void;
    };

    expect(input(target, 'c-last').dataset.touched).toBe('true');
    fire(input(target, 'c-first'), 'blur');
    expect(onTouchedChange).toHaveBeenLastCalledWith({
      last: true,
      first: true,
    });
    // Nobody passed a new map in, so nothing changed on screen.
    expect(input(target, 'c-first').dataset.touched).toBe('false');

    api.setFieldTouched('full');
    expect(onTouchedChange).toHaveBeenLastCalledWith({
      last: true,
      full: true,
    });
    expect(api.getTouched()).toEqual({ last: true });
  });

  it('marks a field dirty against the first values it was given', () => {
    const { target } = render(
      MultiFieldInput,
      {
        fieldDescriptions: person,
        properties: { first: 'Ada', last: 'L' },
        idPrefix: 'd',
      },
      probeRegistry(),
    );
    expect(input(target, 'd-last').dataset.dirty).toBe('false');

    type(input(target, 'd-last'), 'Lovelace');
    expect(input(target, 'd-last').dataset.dirty).toBe('true');
    expect(input(target, 'd-first').dataset.dirty).toBe('false');

    // Or against a baseline named outright.
    const based = render(
      MultiFieldInput,
      {
        fieldDescriptions: person,
        properties: { first: 'Ada' },
        initialProperties: { first: 'Grace' },
        idPrefix: 'e',
      },
      probeRegistry(),
    );
    expect(input(based.target, 'e-first').dataset.dirty).toBe('true');
  });

  it('shows the errors handed in instead of validating each field itself', () => {
    const { target } = render(
      MultiFieldInput,
      {
        fieldDescriptions: person,
        idPrefix: 'x',
        errors: { last: ['From the server'] },
      },
      probeRegistry(),
    );
    expect(input(target, 'x-last').dataset.error).toBe('From the server');
    // `first` is empty and required, but the map does not say so.
    expect(input(target, 'x-first').dataset.error).toBe('');

    const own = render(
      MultiFieldInput,
      { fieldDescriptions: person, idPrefix: 'y' },
      probeRegistry(),
    );
    expect(input(own.target, 'y-first').dataset.error).toBe(
      'Field is required',
    );
  });

  it('reports whether the whole form is valid, now and after each change', () => {
    const results: ValidationResult[] = [];
    const { target } = render(
      MultiFieldInput,
      {
        fieldDescriptions: person,
        idPrefix: 'v',
        onValidityChange: (result: ValidationResult) => results.push(result),
      },
      probeRegistry(),
    );
    expect(results.at(-1)!.valid).toBe(false);

    type(input(target, 'v-first'), 'Ada');
    expect(results.at(-1)!.valid).toBe(true);
  });

  describe('driven by a form', () => {
    it('reads its values, errors and touched state from the form, and writes back', async () => {
      const onSubmitted = vi.fn();
      const { target, instance } = render(
        FormHarness,
        { fields: person, initialValues: { last: 'Lovelace' }, onSubmitted },
        probeRegistry(),
      );
      const form = (
        instance as unknown as {
          getForm: () => {
            reset: () => void;
            setFieldValue: (name: string, value: unknown) => void;
          };
        }
      ).getForm();
      const shown = (name: string) =>
        target.querySelector(`[data-testid="${name}"]`)!.textContent;

      expect(input(target, 'f-last').value).toBe('Lovelace');
      expect(shown('valid')).toBe('false');
      expect(shown('dirty')).toBe('false');
      // The form shows no error until the field is touched or submitted.
      expect(input(target, 'f-first').dataset.error).toBe('');

      fire(input(target, 'f-first'), 'blur');
      expect(input(target, 'f-first').dataset.touched).toBe('true');
      expect(input(target, 'f-first').dataset.error).toBe('Field is required');

      type(input(target, 'f-first'), 'Ada');
      expect(JSON.parse(shown('data')!)).toEqual({
        last: 'Lovelace',
        full: 'Ada Lovelace',
        first: 'Ada',
      });
      expect(shown('dirty')).toBe('true');
      expect(shown('valid')).toBe('true');
      expect(input(target, 'f-first').dataset.dirty).toBe('true');
      expect(input(target, 'f-last').dataset.dirty).toBe('false');

      // A change made on the form, not by typing, reaches the fields.
      act(() => form.setFieldValue('last', 'Byron'));
      expect(input(target, 'f-last').value).toBe('Byron');
      expect(input(target, 'f-full').value).toBe('Ada Byron');

      fire(target.querySelector('form')!, 'submit');
      await settle();
      expect(onSubmitted).toHaveBeenCalledWith({
        last: 'Byron',
        full: 'Ada Byron',
        first: 'Ada',
      });
      expect(shown('submitted')).toBe('true');

      act(() => form.reset());
      expect(input(target, 'f-first').value).toBe('');
      expect(input(target, 'f-first').dataset.touched).toBe('false');
      expect(shown('dirty')).toBe('false');
    });

    it('an undo that hands back the very object an edit was made on shows that object', () => {
      // No computed field, so the form keeps the object it is given - which is
      // what an undo history hands back.
      const plain: FieldDescription[] = [
        { name: 'a', type: 'probe' },
        { name: 'b', type: 'probe' },
      ];
      const { target, instance } = render(
        FormHarness,
        { fields: plain, initialValues: { a: 'one' } },
        probeRegistry(),
      );
      const form = (
        instance as unknown as {
          getForm: () => {
            data: Properties;
            handleChange: (data: Properties) => void;
          };
        }
      ).getForm();

      type(input(target, 'f-b'), 'first edit');
      const afterFirst = form.data;
      type(input(target, 'f-b'), 'second edit');
      expect(input(target, 'f-b').value).toBe('second edit');

      act(() => form.handleChange(afterFirst));
      expect(form.data).toBe(afterFirst);
      expect(input(target, 'f-b').value).toBe('first edit');

      // And typing after the undo starts from what is shown.
      type(input(target, 'f-a'), 'two');
      expect(form.data).toEqual({ a: 'two', b: 'first edit' });
    });

    it('a submit of an untouched, invalid form shows the errors', async () => {
      const onSubmitted = vi.fn();
      const { target } = render(
        FormHarness,
        { fields: person, onSubmitted },
        probeRegistry(),
      );

      fire(target.querySelector('form')!, 'submit');
      await settle();

      expect(onSubmitted).not.toHaveBeenCalled();
      expect(input(target, 'f-first').dataset.touched).toBe('true');
      expect(input(target, 'f-first').dataset.error).toBe('Field is required');
    });

    it('props passed next to the form win over the form', () => {
      const handleChange = vi.fn();
      const handleBlur = vi.fn();
      const onChange = vi.fn();
      const onBlurField = vi.fn();
      const form = {
        data: { first: 'From form' },
        errors: {},
        touched: {},
        handleChange,
        handleBlur,
      };
      const { target } = render(
        MultiFieldInput,
        {
          fieldDescriptions: person,
          form,
          properties: { first: 'From props' },
          idPrefix: 'w',
          onChange,
          onBlurField,
        },
        probeRegistry(),
      );

      expect(input(target, 'w-first').value).toBe('From props');
      type(input(target, 'w-first'), 'Typed');
      fire(input(target, 'w-first'), 'blur');
      expect(onChange).toHaveBeenCalled();
      expect(onBlurField).toHaveBeenCalledWith('first');
      expect(handleChange).not.toHaveBeenCalled();
      expect(handleBlur).not.toHaveBeenCalled();
    });
  });

  describe('repeatable groups', () => {
    const order: FieldDescription[] = [
      { name: 'customer', type: 'probe' },
      {
        name: 'lines',
        type: 'probe',
        label: 'Lines',
        className: 'lines',
        minItems: 1,
        maxItems: 3,
        defaultItem: { qty: '1' },
        fields: [
          { name: 'item', type: 'probe', validate: validators.required() },
          { name: 'qty', type: 'probe' },
          {
            name: 'note',
            type: 'probe',
            // A field of an item can read the form the item belongs to.
            appearCondition: (_item, root) => root?.customer === 'VIP',
          },
        ],
      },
    ];
    const buttons = (target: Element) =>
      [...target.querySelectorAll('button')].map((button) => [
        button.getAttribute('aria-label'),
        button.disabled,
      ]);

    it('renders one form per item, with add and remove inside the limits', () => {
      const onChange = vi.fn();
      const { target } = render(
        MultiFieldInput,
        {
          fieldDescriptions: order,
          properties: { lines: [{ item: 'Tea', qty: '2' }] },
          onChange,
        },
        probeRegistry(),
      );

      expect(target.querySelector('.lines')!.textContent).toContain('Lines');
      expect(target.querySelectorAll('.lines input')).toHaveLength(2);
      // One item and a minimum of one: it cannot be removed.
      expect(buttons(target)).toEqual([
        ['Remove Lines 1', true],
        ['Add Lines', false],
      ]);

      click(target.querySelector('button[aria-label="Add Lines"]')!);
      expect(onChange).toHaveBeenLastCalledWith({
        lines: [{ item: 'Tea', qty: '2' }, { qty: '1' }],
      });
      expect(target.querySelectorAll('.lines input')).toHaveLength(4);

      const second =
        target.querySelectorAll<HTMLInputElement>('.lines input')[2]!;
      type(second, 'Milk');
      expect(onChange).toHaveBeenLastCalledWith({
        lines: [
          { item: 'Tea', qty: '2' },
          { item: 'Milk', qty: '1' },
        ],
      });

      click(target.querySelector('button[aria-label="Remove Lines 1"]')!);
      expect(onChange).toHaveBeenLastCalledWith({
        lines: [{ item: 'Milk', qty: '1' }],
      });
      expect(target.querySelectorAll('.lines input')).toHaveLength(2);
    });

    it('stops adding at the maximum, and a missing list is an empty one', () => {
      const onChange = vi.fn();
      const full = render(
        MultiFieldInput,
        {
          fieldDescriptions: order,
          properties: { lines: [{}, {}, {}] },
          onChange,
        },
        probeRegistry(),
      );
      const add = full.target.querySelector<HTMLButtonElement>(
        'button[aria-label="Add Lines"]',
      )!;
      expect(add.disabled).toBe(true);

      const empty = render(
        MultiFieldInput,
        { fieldDescriptions: order, properties: {}, onChange },
        probeRegistry(),
      );
      expect(empty.target.querySelectorAll('.lines input')).toHaveLength(0);
      expect(buttons(empty.target)).toEqual([['Add Lines', false]]);
    });

    it('labels fall back to the field name and can be replaced', () => {
      const { target } = render(
        MultiFieldInput,
        {
          fieldDescriptions: [
            {
              name: 'tags',
              type: 'probe',
              addLabel: 'New tag',
              removeLabel: 'Drop',
              keyField: 'id',
              fields: [{ name: 'text', type: 'probe' }],
            },
          ],
          properties: { tags: [{ id: 'a', text: 'x' }, { text: 'no key' }] },
        },
        probeRegistry(),
      );
      expect(buttons(target)).toEqual([
        ['Drop tags 1', false],
        ['Drop tags 2', false],
        ['New tag tags', false],
      ]);
      expect(
        target
          .querySelector('button[aria-label="New tag tags"]')!
          .textContent?.trim(),
      ).toBe('New tag');
    });

    it('an item sees the whole form, and its blur is reported by its path', () => {
      const onBlurField = vi.fn();
      const onTouchedChange = vi.fn();
      const { target } = render(
        MultiFieldInput,
        {
          fieldDescriptions: order,
          properties: { customer: 'VIP', lines: [{ item: 'Tea' }] },
          onBlurField,
          onTouchedChange,
        },
        probeRegistry(),
      );
      // item, qty and - for a VIP - note.
      const inside = target.querySelectorAll<HTMLInputElement>('.lines input');
      expect(inside).toHaveLength(3);

      fire(inside[0]!, 'blur');
      expect(onBlurField).toHaveBeenCalledWith('lines[0].item');
      expect(onTouchedChange).toHaveBeenLastCalledWith({
        'lines[0].item': true,
      });
    });

    it('errors and touched state reach the item they belong to', () => {
      const { target } = render(
        MultiFieldInput,
        {
          fieldDescriptions: order,
          properties: { lines: [{ item: 'Tea' }, { item: '' }] },
          errors: { 'lines[1].item': ['Pick an item'] },
          touched: { 'lines[1].item': true },
        },
        probeRegistry(),
      );
      const items = [
        ...target.querySelectorAll<HTMLInputElement>('.lines input'),
      ].filter((element) => element.id.endsWith('-item'));

      expect(items.map((element) => element.dataset.error)).toEqual([
        '',
        'Pick an item',
      ]);
      expect(items.map((element) => element.dataset.touched)).toEqual([
        'false',
        'true',
      ]);
    });

    it('a form validates and touches the fields of every item', async () => {
      const onSubmitted = vi.fn();
      const { target } = render(
        FormHarness,
        {
          fields: order,
          initialValues: { lines: [{ item: '' }] },
          onSubmitted,
        },
        probeRegistry(),
      );

      fire(target.querySelector('form')!, 'submit');
      await settle();

      const item = [
        ...target.querySelectorAll<HTMLInputElement>('.lines input'),
      ].find((element) => element.id.endsWith('-item'))!;
      expect(onSubmitted).not.toHaveBeenCalled();
      expect(item.dataset.touched).toBe('true');
      expect(item.dataset.error).toBe('Field is required');
    });
  });

  describe('layouts', () => {
    const two: FieldDescription[] = [
      { name: 'a', type: 'probe' },
      { name: 'b', type: 'probe' },
    ];
    const wrapper = (target: Element) =>
      target.firstElementChild as HTMLElement;
    const layoutOf = (layout: unknown, properties: Properties = {}) =>
      render(
        MultiFieldInput,
        { fieldDescriptions: two, properties, layout } as never,
        probeRegistry(),
      ).target;

    it('stacks the fields in a column unless told otherwise', () => {
      const style = wrapper(layoutOf(undefined)).style;
      expect([style.display, style.flexDirection, style.gap]).toEqual([
        'flex',
        'column',
        '16px',
      ]);
    });

    it('row and grid, by name or with settings', () => {
      const row = wrapper(layoutOf({ type: 'row', gap: 4 })).style;
      expect([row.display, row.flexDirection, row.gap]).toEqual([
        'flex',
        'row',
        '4px',
      ]);

      const grid = wrapper(layoutOf('grid')).style;
      expect([grid.display, grid.gridTemplateColumns]).toEqual([
        'grid',
        'repeat(2, 1fr)',
      ]);

      const wide = wrapper(
        layoutOf({ type: 'grid', columns: 3, gap: 0 }),
      ).style;
      expect([wide.gridTemplateColumns, wide.gap]).toEqual([
        'repeat(3, 1fr)',
        '0px',
      ]);
      expect(wrapper(layoutOf('grid-2')).style.display).toBe('grid');
    });

    it('responsive picks a layout by the width of the window, and follows it', async () => {
      const resize = async (width: number) => {
        Object.defineProperty(window, 'innerWidth', {
          configurable: true,
          value: width,
        });
        window.dispatchEvent(new Event('resize'));
        await settle();
      };
      await resize(1200);
      const target = layoutOf({
        type: 'responsive',
        breakpoint: 600,
        mobile: 'column',
        desktop: { type: 'grid', columns: 2 },
      });
      expect(wrapper(target).style.display).toBe('grid');

      await resize(400);
      expect(wrapper(target).style.flexDirection).toBe('column');
      expect(target.querySelectorAll('input')).toHaveLength(2);

      // Nothing named for this width, or a layout nobody registered: the
      // fields are still shown, in a plain block.
      const bare = layoutOf({ type: 'responsive', desktop: 'grid' });
      expect(wrapper(bare).getAttribute('style')).toBeNull();
      expect(bare.querySelectorAll('input')).toHaveLength(2);
      const lost = layoutOf({ type: 'responsive', mobile: 'nowhere' });
      expect(lost.querySelectorAll('input')).toHaveLength(2);
      await resize(1024);
    });

    it('an application can register a layout of its own', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      layoutRegistry.register('box', BoxLayout as never);
      const target = layoutOf({ type: 'box', title: 'Details' });
      const section = target.querySelector('section')!;

      expect(section.dataset.layout).toBe('box');
      expect(section.dataset.title).toBe('Details');
      expect(section.querySelectorAll('input')).toHaveLength(2);

      // Registering the name again replaces it, and says so.
      layoutRegistry.register('box', BoxLayout as never);
      expect(warn).toHaveBeenCalledWith(
        '[dynamic-field-kit] Layout "box" already exists',
      );
      warn.mockRestore();
    });

    it('says so when the layout is not registered', () => {
      expect(layoutOf('nowhere').textContent).toContain(
        'Unknown layout: nowhere',
      );
    });
  });
});
