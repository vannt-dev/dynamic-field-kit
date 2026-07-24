import { beforeEach, describe, expect, test, vi } from 'vitest';
import { FieldRegistry, fieldRegistry } from '../src';

declare module '../src' {
  interface FieldTypeMap {
    text: string;
    number: number;
    checkbox: boolean;
    select: string;
  }
}

describe('FieldRegistry', () => {
  let registry: FieldRegistry;

  beforeEach(() => {
    registry = new FieldRegistry();
  });

  describe('register()', () => {
    test('should register a renderer for a type', () => {
      const renderer = vi.fn();
      registry.register('text', renderer as any);

      const result = registry.get('text');
      expect(result).toBe(renderer);
    });

    test('should register multiple renderers for different types', () => {
      const textRenderer = vi.fn();
      const numberRenderer = vi.fn();
      const checkboxRenderer = vi.fn();

      registry.register('text', textRenderer as any);
      registry.register('number', numberRenderer as any);
      registry.register('checkbox', checkboxRenderer as any);

      expect(registry.get('text')).toBe(textRenderer);
      expect(registry.get('number')).toBe(numberRenderer);
      expect(registry.get('checkbox')).toBe(checkboxRenderer);
    });

    test('should overwrite existing renderer for same type', () => {
      const renderer1 = vi.fn();
      const renderer2 = vi.fn();

      registry.register('text', renderer1 as any);
      registry.register('text', renderer2 as any);

      expect(registry.get('text')).toBe(renderer2);
    });
  });

  describe('get()', () => {
    test('should return undefined for unregistered type', () => {
      const result = registry.get('text');
      expect(result).toBeUndefined();
    });

    test('should return registered renderer', () => {
      const renderer = vi.fn();
      registry.register('text', renderer as any);

      const result = registry.get('text');
      expect(result).toBe(renderer);
    });

    test('should return undefined for non-existent type', () => {
      registry.register('text', vi.fn() as any);

      const result = registry.get('number');
      expect(result).toBeUndefined();
    });
  });

  describe('singleton instance', () => {
    test('should export singleton fieldRegistry instance', () => {
      expect(fieldRegistry).toBeDefined();
      expect(fieldRegistry).toBeInstanceOf(FieldRegistry);
    });

    test('should share state across imports', () => {
      const renderer = vi.fn();
      fieldRegistry.register('text', renderer as any);

      const result = fieldRegistry.get('text');
      expect(result).toBe(renderer);
    });
  });
});

describe('FieldRenderer', () => {
  test('should be a function type', () => {
    const renderer = (props: { value: string }) => `rendered:${props.value}`;
    expect(typeof renderer).toBe('function');
  });

  test('should accept FieldRendererProps', () => {
    const renderer = (props: {
      value?: string;
      label?: string;
      onValueChange?: (v: string) => void;
    }) => {
      return props.value || '';
    };

    const result = renderer({
      value: 'test',
      label: 'Label',
      onValueChange: vi.fn(),
    });

    expect(result).toBe('test');
  });
});
