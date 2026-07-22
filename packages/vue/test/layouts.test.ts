import type { FieldDescription } from '@dynamic-field-kit/core';
import { FieldRegistry } from '@dynamic-field-kit/core';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MultiFieldInput from '../src/components/MultiFieldInput';
import { FieldRegistryKey } from '../src/fieldRegistryContext';
import '../src/layout/defaultLayouts';
import '../src/layout/responsiveLayout';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
    email: string;
    checkbox: boolean;
    select: string;
    country: string;
    city: string;
  }
}

// Mount with a fresh scoped registry holding a minimal text input, injected so
// each test is isolated from the global singleton and from every other test.
function mountLayout(props: Record<string, unknown>) {
  const registry = new FieldRegistry();
  registry.register('text', {
    props: ['value'],
    template: '<input :value="value" />',
  } as never);
  return mount(MultiFieldInput, {
    props,
    global: { provide: { [FieldRegistryKey]: registry } },
  });
}

describe('Layout: Row', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render fields in row layout', async () => {
    const fields: FieldDescription[] = [
      { name: 'field1', type: 'text' },
      { name: 'field2', type: 'text' },
    ];

    const wrapper = mountLayout({
      fieldDescriptions: fields,
      layout: 'row',
    });

    const container = wrapper.find('div');
    const style = container.attributes('style');
    expect(style).toContain('flex-direction: row');
  });

  it('should render fields in row layout with custom gap', async () => {
    const fields: FieldDescription[] = [
      { name: 'field1', type: 'text' },
      { name: 'field2', type: 'text' },
    ];

    const wrapper = mountLayout({
      fieldDescriptions: fields,
      layout: { type: 'row', gap: 20 },
    });

    const container = wrapper.find('div');
    const style = container.attributes('style');
    expect(style).toContain('flex-direction: row');
    expect(style).toContain('20px');
  });
});

describe('Layout: Grid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render fields in default grid layout (2 columns)', async () => {
    const fields: FieldDescription[] = [
      { name: 'field1', type: 'text' },
      { name: 'field2', type: 'text' },
    ];

    const wrapper = mountLayout({
      fieldDescriptions: fields,
      layout: 'grid',
    });

    const container = wrapper.find('div');
    const style = container.attributes('style');
    expect(style).toContain('display: grid');
    expect(style).toContain('repeat(2, 1fr)');
  });

  it('should render fields in grid layout with 3 columns', async () => {
    const fields: FieldDescription[] = [
      { name: 'field1', type: 'text' },
      { name: 'field2', type: 'text' },
      { name: 'field3', type: 'text' },
    ];

    const wrapper = mountLayout({
      fieldDescriptions: fields,
      layout: { type: 'grid', columns: 3 },
    });

    const container = wrapper.find('div');
    const style = container.attributes('style');
    expect(style).toContain('display: grid');
    expect(style).toContain('repeat(3, 1fr)');
  });

  it('should render fields in grid layout with custom gap', async () => {
    const fields: FieldDescription[] = [
      { name: 'field1', type: 'text' },
      { name: 'field2', type: 'text' },
    ];

    const wrapper = mountLayout({
      fieldDescriptions: fields,
      layout: { type: 'grid', gap: 24 },
    });

    const container = wrapper.find('div');
    const style = container.attributes('style');
    expect(style).toContain('display: grid');
    expect(style).toContain('24px');
  });
});

describe('Layout: Column', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render fields in column layout with default gap', async () => {
    const fields: FieldDescription[] = [
      { name: 'field1', type: 'text' },
      { name: 'field2', type: 'text' },
    ];

    const wrapper = mountLayout({
      fieldDescriptions: fields,
      layout: 'column',
    });

    const container = wrapper.find('div');
    const style = container.attributes('style');
    expect(style).toContain('flex-direction: column');
    expect(style).toContain('16px');
  });

  it('should render fields in column layout with custom gap', async () => {
    const fields: FieldDescription[] = [
      { name: 'field1', type: 'text' },
      { name: 'field2', type: 'text' },
    ];

    const wrapper = mountLayout({
      fieldDescriptions: fields,
      layout: { type: 'column', gap: 16 },
    });

    const container = wrapper.find('div');
    const style = container.attributes('style');
    expect(style).toContain('flex-direction: column');
    expect(style).toContain('16px');
  });
});

describe('Layout: Responsive', () => {
  const originalWidth = window.innerWidth;

  function setWidth(width: number) {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    window.dispatchEvent(new Event('resize'));
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    setWidth(originalWidth);
  });

  it('should use desktop layout above the breakpoint', () => {
    setWidth(1024);
    const fields: FieldDescription[] = [{ name: 'field1', type: 'text' }];

    const wrapper = mountLayout({
      fieldDescriptions: fields,
      layout: { type: 'responsive', mobile: 'column', desktop: 'row' },
    });

    const style = wrapper.find('div').attributes('style');
    expect(style).toContain('flex-direction: row');
  });

  it('should use mobile layout below the breakpoint', () => {
    setWidth(375);
    const fields: FieldDescription[] = [{ name: 'field1', type: 'text' }];

    const wrapper = mountLayout({
      fieldDescriptions: fields,
      layout: { type: 'responsive', mobile: 'column', desktop: 'row' },
    });

    const style = wrapper.find('div').attributes('style');
    expect(style).toContain('flex-direction: column');
  });

  it('should react to window resize', async () => {
    setWidth(1024);
    const fields: FieldDescription[] = [{ name: 'field1', type: 'text' }];

    const wrapper = mountLayout({
      fieldDescriptions: fields,
      layout: { type: 'responsive', mobile: 'column', desktop: 'row' },
    });

    expect(wrapper.find('div').attributes('style')).toContain(
      'flex-direction: row'
    );

    setWidth(375);
    await wrapper.vm.$nextTick();

    expect(wrapper.find('div').attributes('style')).toContain(
      'flex-direction: column'
    );
  });

  it('should respect a custom breakpoint', () => {
    setWidth(900);
    const fields: FieldDescription[] = [{ name: 'field1', type: 'text' }];

    const wrapper = mountLayout({
      fieldDescriptions: fields,
      layout: {
        type: 'responsive',
        mobile: 'column',
        desktop: 'row',
        breakpoint: 1200,
      },
    });

    expect(wrapper.find('div').attributes('style')).toContain(
      'flex-direction: column'
    );
  });
});
