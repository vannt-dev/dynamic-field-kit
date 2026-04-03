import { fieldRegistry } from '../src';
import { describe, test, expect } from 'vitest';

// Module augmentation to extend FieldTypeMap with a new type 'text'
declare module '../src' {
  interface FieldTypeMap {
    text: string;
  }
}

describe('FieldRegistry (core)', () => {
  test('register and get a text renderer', () => {
    // Ensure a renderer can be registered for type 'text'
    const renderer = (props: { value: string; label?: string }) =>
      `rendered:${props.value}`;
    fieldRegistry.register('text' as any, renderer as any);

    const reg = fieldRegistry.get('text' as any);
    expect(typeof reg).toBe('function');

    // Call the renderer with sample props
    const output = (reg as any)({ value: 'hello' });
    expect(output).toBe('rendered:hello');
  });
});
