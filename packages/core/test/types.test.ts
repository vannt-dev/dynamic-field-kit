import { describe, expect, test, vi } from 'vitest';
import type {
  FieldDescription,
  FieldRendererProps,
  FieldTypeKey,
  FieldTypeMap,
  Properties,
} from '../src';

declare module '../src' {
  interface FieldTypeMap {
    customType: { id: string };
  }
}

describe('Types', () => {
  describe('Properties', () => {
    test('should be a Record of string to unknown', () => {
      const props: Properties = {
        name: 'John',
        age: 30,
        active: true,
        data: { nested: true },
      };

      expect(props.name).toBe('John');
      expect(props.age).toBe(30);
      expect(props.active).toBe(true);
      expect(props.data).toEqual({ nested: true });
    });

    test('should accept empty object', () => {
      const props: Properties = {};
      expect(props).toEqual({});
    });
  });

  describe('FieldRendererProps', () => {
    test('should accept all optional properties', () => {
      const props: FieldRendererProps<string> = {
        value: 'test',
        label: 'Label',
        placeholder: 'Enter value',
        required: true,
        className: 'custom-class',
        description: 'Help text',
        options: [{ label: 'Option 1' }],
        onValueChange: vi.fn(),
      };

      expect(props.value).toBe('test');
      expect(props.label).toBe('Label');
      expect(props.required).toBe(true);
    });

    test('should accept empty props', () => {
      const props: FieldRendererProps = {};
      expect(props.value).toBeUndefined();
      expect(props.onValueChange).toBeUndefined();
    });

    test('should accept different value types', () => {
      const stringProps: FieldRendererProps<string> = { value: 'text' };
      const numberProps: FieldRendererProps<number> = { value: 42 };
      const booleanProps: FieldRendererProps<boolean> = { value: true };
      const objectProps: FieldRendererProps<object> = {
        value: { key: 'value' },
      };

      expect(stringProps.value).toBe('text');
      expect(numberProps.value).toBe(42);
      expect(booleanProps.value).toBe(true);
      expect(objectProps.value).toEqual({ key: 'value' });
    });

    test('should accept options array', () => {
      const props: FieldRendererProps = {
        options: [
          { label: 'Option 1', value: '1' },
          { label: 'Option 2', value: '2' },
        ],
      };

      expect(props.options).toHaveLength(2);
      expect(props.options?.[0].label).toBe('Option 1');
    });
  });

  describe('FieldDescription', () => {
    test('should accept minimal required fields', () => {
      const field: FieldDescription = {
        name: 'username',
        type: 'text',
      };

      expect(field.name).toBe('username');
      expect(field.type).toBe('text');
    });

    test('should accept all optional fields', () => {
      const field: FieldDescription = {
        name: 'email',
        type: 'text',
        label: 'Email Address',
        placeholder: 'Enter email',
        required: true,
        className: 'input-field',
        description: 'Your email will be used for notifications',
        options: [{ label: 'Option' }],
        appearCondition: vi.fn(),
      };

      expect(field.label).toBe('Email Address');
      expect(field.required).toBe(true);
      expect(field.appearCondition).toBeDefined();
    });

    test('should accept appearCondition function', () => {
      const data = { showAdvanced: true };
      const condition = (d: Properties) => d.showAdvanced === true;

      const field: FieldDescription = {
        name: 'advanced',
        type: 'text',
        appearCondition: condition,
      };

      expect(field.appearCondition?.(data)).toBe(true);
      expect(field.appearCondition?.({ showAdvanced: false })).toBe(false);
    });

    test('should accept typed field description', () => {
      const field: FieldDescription = {
        name: 'customField',
        type: 'customType',
      };

      expect(field.name).toBe('customField');
    });
  });

  describe('FieldTypeKey', () => {
    test('should be string type', () => {
      const key: FieldTypeKey = 'text';
      expect(typeof key).toBe('string');
    });
  });

  describe('FieldTypeMap', () => {
    test('should be augmentable interface', () => {
      const map: FieldTypeMap = { customType: { id: '123' } } as any;
      expect(map.customType).toEqual({ id: '123' });
    });
  });
});

describe('Edge Cases', () => {
  test('should handle undefined values in Properties', () => {
    const props: Properties = {
      value: undefined,
    };

    expect(props.value).toBeUndefined();
  });

  test('should handle special characters in property names', () => {
    const props: Properties = {
      'special-key': 'value',
      camelCase: 'test',
      snake_case: 'test',
    };

    expect(props['special-key']).toBe('value');
    expect(props['camelCase']).toBe('test');
    expect(props['snake_case']).toBe('test');
  });

  test('should handle complex appearCondition logic', () => {
    const data = {
      role: 'admin',
      age: 25,
      tags: ['vip', 'active'],
    };

    const condition = (d: Properties) => {
      return (
        d.role === 'admin' &&
        (d.age as number) >= 18 &&
        (d.tags as string[]).includes('vip')
      );
    };

    expect(condition(data)).toBe(true);
    expect(condition({ role: 'user', age: 25, tags: ['vip'] })).toBe(false);
    expect(condition({ role: 'admin', age: 15, tags: ['vip'] })).toBe(false);
  });
});
