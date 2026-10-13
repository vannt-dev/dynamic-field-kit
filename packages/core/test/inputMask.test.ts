import { describe, expect, it } from 'vitest';
import { createInputMask, resolveInputMask } from '../src/inputMask';
import type { InputMask } from '../src/inputMask';
import { fieldsToJsonSchema } from '../src/jsonSchemaExport';
import { buildFieldRendererProps } from '../src/rendererProps';
import type { FieldDescription } from '../src/types';

const phone = createInputMask('(999) 999-9999');

describe('createInputMask: format', () => {
  it('lays a stored value out in the pattern', () => {
    expect(phone.format('5551234567')).toBe('(555) 123-4567');
  });

  it('shows nothing for a value that is not there', () => {
    expect(phone.format(undefined)).toBe('');
    expect(phone.format(null)).toBe('');
    expect(phone.format('')).toBe('');
  });

  it('shows a separator only once the character after it exists', () => {
    expect(phone.format('5')).toBe('(5');
    expect(phone.format('555')).toBe('(555');
    expect(phone.format('5551')).toBe('(555) 1');
    expect(phone.format('555123')).toBe('(555) 123');
    expect(phone.format('5551234')).toBe('(555) 123-4');
  });

  it('closes the pattern once every place is filled', () => {
    const code = createInputMask('(999)');
    expect(code.format('55')).toBe('(55');
    expect(code.format('555')).toBe('(555)');
  });

  it('leaves out what does not fit a place, and what is past the last one', () => {
    expect(phone.format('555-123-4567')).toBe('(555) 123-4567');
    expect(phone.format('55512345678')).toBe('(555) 123-4567');
    expect(phone.format('5x5y5')).toBe('(555');
  });

  it('reads a number as its digits', () => {
    expect(phone.format(5551234567)).toBe('(555) 123-4567');
  });
});

describe('createInputMask: parse', () => {
  it('keeps only what was typed into the places', () => {
    expect(phone.parse('(555) 123-4567')).toBe('5551234567');
    expect(phone.parse('5551234567')).toBe('5551234567');
    expect(phone.parse('')).toBe('');
  });

  it('drops a character that does not fit its place', () => {
    expect(phone.parse('(5a5) x1')).toBe('551');
  });

  it('reads text written with other separators', () => {
    expect(createInputMask('999.999.9999').parse('(555) 123-4567')).toBe(
      '5551234567',
    );
  });

  it('does not take a fixed digit of the pattern for a typed one', () => {
    const us = createInputMask('+1 (999) 999-9999');
    expect(us.format('5551234567')).toBe('+1 (555) 123-4567');
    expect(us.parse('+1 (555) 123-4567')).toBe('5551234567');
    expect(us.parse('5')).toBe('5');
  });
});

describe('createInputMask: places', () => {
  it('9 takes a digit, a takes a letter, * takes either', () => {
    const plate = createInputMask('aa-999');
    expect(plate.parse('ab-123')).toBe('ab123');
    // The digits come where the second letter belongs, so they are dropped.
    expect(plate.parse('1b-123')).toBe('b');
    expect(plate.format('ab123')).toBe('ab-123');

    const any = createInputMask('**-**');
    expect(any.parse('a1-b2')).toBe('a1b2');
    expect(any.parse('a_-b2')).toBe('ab2');
  });

  it('a letter is any letter, not only an unaccented one', () => {
    expect(createInputMask('aaa').parse('Hà1')).toBe('Hà');
  });

  it('a backslash makes the next character a fixed one', () => {
    const mask = createInputMask('\\9-99');
    expect(mask.format('12')).toBe('9-12');
    expect(mask.parse('9-12')).toBe('12');
  });
});

describe('createInputMask: deleting', () => {
  // The text an input holds after Backspace at its end.
  const backspace = (mask: InputMask, raw: unknown) => {
    const shown = mask.format(raw);
    return mask.parse(shown.slice(0, -1), raw);
  };

  it('typing one character at a time fills the pattern', () => {
    let raw: unknown = '';
    for (const key of '5551234567') {
      raw = phone.parse(phone.format(raw) + key, raw);
    }
    expect(raw).toBe('5551234567');
    expect(phone.format(raw)).toBe('(555) 123-4567');
  });

  it('Backspace at the end removes one typed character every time, down to nothing', () => {
    let raw: unknown = '5551234567';
    const seen: unknown[] = [];
    while (raw !== '') {
      raw = backspace(phone, raw);
      seen.push(raw);
      expect(seen.length).toBeLessThanOrEqual(10);
    }
    expect(seen).toEqual([
      '555123456',
      '55512345',
      '5551234',
      '555123',
      '55512',
      '5551',
      '555',
      '55',
      '5',
      '',
    ]);
  });

  it('Backspace on the closing character removes the character before it', () => {
    const code = createInputMask('(999)');
    // '(555)' with its last character deleted.
    expect(code.parse('(555', '555')).toBe('55');
  });

  it('Backspace on a separator in the middle removes the character before it', () => {
    // '(555) 123-4567' with the ')' deleted.
    expect(phone.parse('(555 123-4567', '5551234567')).toBe('551234567');
    // ...and with the '-' deleted.
    expect(phone.parse('(555) 1234567', '5551234567')).toBe('555124567');
  });

  it('deleting the opening character changes nothing', () => {
    expect(phone.parse('555) 123-4567', '5551234567')).toBe('5551234567');
  });

  it('without the stored value, the text is read as it stands', () => {
    expect(createInputMask('(999)').parse('(555')).toBe('555');
  });

  it('text that grew is never taken for a deletion', () => {
    expect(phone.parse('(555) 123-45678', '5551234567')).toBe('5551234567');
  });

  it('the same value pasted in another layout is not taken for a deletion', () => {
    expect(phone.parse('(555)1234567', '5551234567')).toBe('5551234567');
    expect(phone.parse('555.123.4567', '5551234567')).toBe('5551234567');
  });
});

describe('resolveInputMask', () => {
  it('compiles a pattern and hands a pair of functions back as it is', () => {
    expect(resolveInputMask('99-99')?.format('1234')).toBe('12-34');
    const own: InputMask = { format: String, parse: (text) => text };
    expect(resolveInputMask(own)).toBe(own);
    expect(resolveInputMask(undefined)).toBeUndefined();
  });
});

describe('buildFieldRendererProps with a mask', () => {
  const field: FieldDescription = {
    name: 'phone',
    type: 'text',
    mask: '(999) 999-9999',
  };
  const build = (
    fieldDescription: FieldDescription,
    data: Record<string, unknown>,
    applyMask: boolean | undefined = true,
  ) =>
    buildFieldRendererProps({
      fieldDescription,
      data,
      id: 'dfk-r1-phone',
      applyMask,
    });

  it('shows the formatted text and leaves the stored value alone', () => {
    const data = { phone: '5551234567' };
    const props = build(field, data);
    expect(props.value).toBe('(555) 123-4567');
    expect(data).toEqual({ phone: '5551234567' });
  });

  it('gives the adapter the way back from typed text to the stored value', () => {
    const props = build(field, { phone: '555' });
    expect(props.parseInput?.('(555) 1')).toBe('5551');
  });

  it('reads a deleted separator against the value the form holds', () => {
    const props = build(field, { phone: '5551234567' });
    expect(props.parseInput?.('(555 123-4567')).toBe('551234567');
  });

  it('passes on what a renderer reports that is not text', () => {
    const props = build(field, { phone: '555' });
    expect(props.parseInput?.(42)).toBe(42);
    expect(props.parseInput?.(undefined)).toBeUndefined();
  });

  it('validates the stored value, not the text on screen', () => {
    const seen: unknown[] = [];
    const checked: FieldDescription = {
      ...field,
      validate: (value) => {
        seen.push(value);
        return String(value).length < 10 ? 'Not a whole number' : undefined;
      },
    };
    const props = build(checked, { phone: '555' });
    expect(seen).toEqual(['555']);
    expect(props.error).toEqual(['Not a whole number']);
    expect(props.value).toBe('(555');
  });

  it('takes a pair of functions for what a pattern cannot say', () => {
    const thousands: FieldDescription = {
      name: 'amount',
      type: 'text',
      mask: {
        format: (value) =>
          value === undefined || value === null || value === ''
            ? ''
            : Number(value).toLocaleString('en-US'),
        parse: (text) => {
          const digits = text.replace(/\D/g, '');
          return digits ? Number(digits) : undefined;
        },
      },
    };
    const props = build(thousands, { amount: 1234567 });
    expect(props.value).toBe('1,234,567');
    expect(props.parseInput?.('1,234,5678')).toBe(12345678);
    expect(props.parseInput?.('')).toBeUndefined();
  });

  it('hands a pair of functions the stored value as the second argument', () => {
    const calls: unknown[][] = [];
    const own: FieldDescription = {
      name: 'code',
      type: 'text',
      mask: {
        format: (value) => String(value ?? ''),
        parse: (text, previous) => {
          calls.push([text, previous]);
          return text;
        },
      },
    };
    build(own, { code: 'ab' }).parseInput?.('abc');
    expect(calls).toEqual([['abc', 'ab']]);
  });

  it('is left alone unless the adapter says it sends input back through parseInput', () => {
    // An adapter from before masks would show the formatted text and then store
    // that text as the value.
    for (const applyMask of [undefined, false]) {
      const props = buildFieldRendererProps({
        fieldDescription: field,
        data: { phone: '5551234567' },
        id: 'dfk-r1-phone',
        applyMask,
      });
      expect(props.value).toBe('5551234567');
      expect('parseInput' in props).toBe(false);
    }
  });

  it('a field without a mask is built exactly as before', () => {
    const plain: FieldDescription = { name: 'phone', type: 'text' };
    const before = buildFieldRendererProps({
      fieldDescription: plain,
      data: { phone: '5551234567' },
      id: 'dfk-r1-phone',
    });
    const after = build(plain, { phone: '5551234567' });
    expect(after).toEqual(before);
    expect(Object.keys(after)).toEqual(Object.keys(before));
    expect('parseInput' in after).toBe(false);
  });
});

describe('fieldsToJsonSchema with a mask', () => {
  it('writes the field as the string it stores', () => {
    const { schema, warnings } = fieldsToJsonSchema([
      { name: 'phone', type: 'text', mask: '(999) 999-9999' },
    ]);
    expect(warnings).toEqual([]);
    expect(schema).toMatchObject({
      properties: { phone: { type: 'string' } },
    });
    expect(JSON.stringify(schema)).not.toContain('999');
  });
});
