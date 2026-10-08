import type { FieldDescription, Properties } from '@dynamic-field-kit/core';
import { unmount } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import FieldInput from '../src/components/FieldInput.svelte';
import { seen } from './fixtures/ProbeRenderer.svelte';
import { fire, probeRegistry, render, settle, type } from './helpers';

describe('FieldInput', () => {
  it('resolves a field description into renderer props', () => {
    const onValueChangeField = vi.fn();
    const onBlurField = vi.fn();
    const field: FieldDescription = {
      name: 'city',
      type: 'probe',
      label: 'City',
      placeholder: 'Where',
      required: true,
      className: 'half',
      props: { rows: 2 },
      disabledCondition: (data) => data.locked === true,
    };
    const { target } = render(
      FieldInput,
      {
        fieldDescription: field,
        renderInfos: { city: 'Hue', locked: false },
        idPrefix: 'form1',
        touched: true,
        dirty: true,
        errors: { city: ['Unknown city'] },
        onValueChangeField,
        onBlurField,
      },
      probeRegistry(),
    );

    expect(seen.get('form1-city')).toMatchObject({
      value: 'Hue',
      label: 'City',
      placeholder: 'Where',
      required: true,
      className: 'half',
      disabled: false,
      touched: true,
      dirty: true,
      error: ['Unknown city'],
      rows: 2,
    });

    const input = target.querySelector('input')!;
    type(input, 'Hanoi');
    expect(onValueChangeField).toHaveBeenCalledWith('Hanoi', 'city');
    fire(input, 'blur');
    expect(onBlurField).toHaveBeenCalledWith('city');
  });

  it('a disabled field is shown no error: the user could not act on it', () => {
    render(
      FieldInput,
      {
        fieldDescription: {
          name: 'city',
          type: 'probe',
          disabledCondition: (data) => data.locked === true,
        },
        renderInfos: { city: 'Hue', locked: true },
        idPrefix: 'off',
        errors: { city: ['Unknown city'] },
        onValueChangeField: () => {},
      },
      probeRegistry(),
    );
    expect(seen.get('off-city')).toMatchObject({ disabled: true });
    expect(seen.get('off-city')!.error).toBeUndefined();
  });

  it('ids default to the shared prefix, and a field can name its own', () => {
    const base = {
      renderInfos: {},
      onValueChangeField: () => {},
    };
    const plain = render(FieldInput, {
      ...base,
      fieldDescription: { name: 'a', type: 'text' },
    });
    expect(plain.target.querySelector('input')!.id).toBe('dfk-field-a');

    const named = render(FieldInput, {
      ...base,
      fieldDescription: { name: 'b', type: 'text', id: 'my-own' },
    });
    expect(named.target.querySelector('input')!.id).toBe('my-own');
  });

  it('validates the field itself when no error map is handed in', () => {
    const field: FieldDescription = {
      name: 'age',
      type: 'probe',
      validate: (value) => (Number(value) < 18 ? 'Too young' : undefined),
    };
    render(
      FieldInput,
      {
        fieldDescription: field,
        renderInfos: { age: 12 },
        touched: true,
        onValueChangeField: () => {},
      },
      probeRegistry(),
    );
    expect(seen.get('dfk-field-age')!.error).toEqual(['Too young']);

    // With a map, the map is the truth - also when it has nothing to say.
    render(
      FieldInput,
      {
        fieldDescription: field,
        renderInfos: { age: 12 },
        idPrefix: 'quiet',
        touched: true,
        errors: {},
        onValueChangeField: () => {},
      },
      probeRegistry(),
    );
    expect(seen.get('quiet-age')!.error ?? []).toEqual([]);
  });

  it('a blur without a blur handler is harmless', () => {
    const { target } = render(FieldInput, {
      fieldDescription: { name: 'a', type: 'text' },
      renderInfos: {},
      onValueChangeField: () => {},
    });
    expect(() => fire(target.querySelector('input')!, 'blur')).not.toThrow();
  });

  describe('with options that are fetched', () => {
    function countries(calls: Properties[]) {
      const field: FieldDescription = {
        name: 'country',
        type: 'probe',
        optionsMode: 'async',
        optionsDeps: (data) => [data.region],
        options: async (data, _root, context) => {
          calls.push({ region: data.region, query: context?.query });
          return [{ value: `${data.region}-1`, label: `${data.region} one` }];
        },
      };
      return field;
    }

    it('loads them once the field is shown', async () => {
      const calls: Properties[] = [];
      const { target } = render(
        FieldInput,
        {
          fieldDescription: countries(calls),
          renderInfos: { region: 'asia', other: 1 },
          idPrefix: 'o',
          onValueChangeField: () => {},
        },
        probeRegistry(),
      );
      expect(target.querySelector('input')).not.toBeNull();
      expect(seen.get('o-country')!.optionsStatus).toBe('loading');

      await settle();
      expect(seen.get('o-country')).toMatchObject({
        optionsStatus: 'ready',
        options: [{ value: 'asia-1', label: 'asia one' }],
      });
      expect(calls).toHaveLength(1);
    });

    it('a renderer can ask again with what the user typed', async () => {
      const calls: Properties[] = [];
      render(
        FieldInput,
        {
          fieldDescription: countries(calls),
          renderInfos: { region: 'eu' },
          idPrefix: 'q',
          onValueChangeField: () => {},
        },
        probeRegistry(),
      );
      await settle();

      const ask = seen.get('q-country')!.onOptionsQuery as (q: string) => void;
      ask('fr');
      await settle();

      expect(calls.map((call) => call.query)).toEqual([undefined, 'fr']);
    });

    it('stops listening when the field goes away', async () => {
      let finish: ((options: Properties[]) => void) | undefined;
      const field: FieldDescription = {
        name: 'slow',
        type: 'probe',
        optionsMode: 'async',
        options: () =>
          new Promise<Properties[]>((resolve) => {
            finish = resolve;
          }),
      };
      const { instance } = render(
        FieldInput,
        {
          fieldDescription: field,
          renderInfos: {},
          idPrefix: 'gone',
          onValueChangeField: () => {},
        },
        probeRegistry(),
      );
      await settle();
      expect(seen.get('gone-slow')!.optionsStatus).toBe('loading');

      unmount(instance);
      finish?.([{ value: 'late' }]);
      await settle();
      // The answer arrived after the field was gone and changed nothing.
      expect(seen.get('gone-slow')!.optionsStatus).toBe('loading');
    });

    it('a static list has no status and no way to ask again', () => {
      render(
        FieldInput,
        {
          fieldDescription: {
            name: 'fixed',
            type: 'probe',
            options: [{ value: 'a' }],
          },
          renderInfos: {},
          idPrefix: 's',
          onValueChangeField: () => {},
        },
        probeRegistry(),
      );
      expect(seen.get('s-fixed')).toMatchObject({ options: [{ value: 'a' }] });
      expect(seen.get('s-fixed')!.optionsStatus).toBeUndefined();
      expect(seen.get('s-fixed')!.onOptionsQuery).toBeUndefined();
    });
  });
});
