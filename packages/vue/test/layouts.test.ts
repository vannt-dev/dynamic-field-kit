import type { FieldDescription } from '@dynamic-field-kit/core';
import { fieldRegistry } from '@dynamic-field-kit/core';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MultiFieldInput from '../src/components/MultiFieldInput';
import '../src/layout/defaultLayouts';

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

describe('Layout: Row', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fieldRegistry as any).registry['text'] = {
      props: ['value'],
      template: '<input :value="value" />',
    };
  });

  afterEach(() => {
    (fieldRegistry as any).registry = {};
  });

  it('should render fields in row layout', async () => {
    const fields: FieldDescription[] = [
      { name: 'field1', type: 'text' },
      { name: 'field2', type: 'text' },
    ];

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: fields,
        layout: 'row',
      },
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

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: fields,
        layout: { type: 'row', gap: 20 },
      },
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
    (fieldRegistry as any).registry['text'] = {
      props: ['value'],
      template: '<input :value="value" />',
    };
  });

  afterEach(() => {
    (fieldRegistry as any).registry = {};
  });

  it('should render fields in default grid layout (2 columns)', async () => {
    const fields: FieldDescription[] = [
      { name: 'field1', type: 'text' },
      { name: 'field2', type: 'text' },
    ];

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: fields,
        layout: 'grid',
      },
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

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: fields,
        layout: { type: 'grid', columns: 3 },
      },
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

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: fields,
        layout: { type: 'grid', gap: 24 },
      },
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
    (fieldRegistry as any).registry['text'] = {
      props: ['value'],
      template: '<input :value="value" />',
    };
  });

  afterEach(() => {
    (fieldRegistry as any).registry = {};
  });

  it('should render fields in column layout with default gap', async () => {
    const fields: FieldDescription[] = [
      { name: 'field1', type: 'text' },
      { name: 'field2', type: 'text' },
    ];

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: fields,
        layout: 'column',
      },
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

    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: fields,
        layout: { type: 'column', gap: 16 },
      },
    });

    const container = wrapper.find('div');
    const style = container.attributes('style');
    expect(style).toContain('flex-direction: column');
    expect(style).toContain('16px');
  });
});
