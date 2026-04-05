import { beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import { LayoutRegistry } from '../src/layout/layoutRegistry';

describe('LayoutRegistry', () => {
  let registry: LayoutRegistry;

  beforeEach(() => {
    registry = new LayoutRegistry();
  });

  it('should register and get a layout renderer', () => {
    const renderer = ({ children }: { children: any }) => h('div', children);
    registry.register('test-layout', renderer);

    const result = registry.get('test-layout');
    expect(result).toBe(renderer);
  });

  it('should return undefined for unregistered layout', () => {
    const result = registry.get('non-existent');
    expect(result).toBeUndefined();
  });

  it('should warn when registering duplicate layout', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const renderer1 = ({ children }: { children: any }) => h('div', children);
    const renderer2 = ({ children }: { children: any }) => h('div', children);

    registry.register('duplicate', renderer1);
    registry.register('duplicate', renderer2);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('already exists')
    );
    expect(registry.get('duplicate')).toBe(renderer2);

    consoleSpy.mockRestore();
  });

  it('should handle layout with config', () => {
    const renderer = ({
      children,
      config,
    }: {
      children: any;
      config?: { gap: number };
    }) => h('div', { style: { gap: config?.gap } }, children);

    registry.register('with-config', renderer);

    const result = registry.get('with-config');
    expect(result).toBeDefined();
    expect(typeof result).toBe('function');
  });
});
