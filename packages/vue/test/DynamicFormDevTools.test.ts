import { mount, VueWrapper } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { FieldDescription } from '../src';
import { DynamicFormDevTools } from '../src';

function mountDevTools(props: Record<string, unknown> = {}) {
  return mount(DynamicFormDevTools, { props: { data: {}, ...props } });
}

async function open(wrapper: VueWrapper) {
  await wrapper.find('button').trigger('click');
}

async function clickTab(wrapper: VueWrapper, label: string) {
  const tab = wrapper
    .findAll('button')
    .find((b) => b.text().toLowerCase().startsWith(label));
  await tab!.trigger('click');
}

describe('DynamicFormDevTools (Vue)', () => {
  it('renders collapsed without an error badge', () => {
    const wrapper = mountDevTools();

    expect(wrapper.text()).toContain('🔍 DevTools');
    expect(wrapper.text()).not.toContain('🛠️ Form DevTools');
  });

  it('shows the error count on the collapsed badge', () => {
    const wrapper = mountDevTools({
      errors: { name: ['required'], email: ['invalid'] },
    });

    expect(wrapper.text()).toContain('2');
  });

  it('shows form data on the data tab', async () => {
    const wrapper = mountDevTools({ data: { email: 'a@b.com' } });
    await open(wrapper);

    expect(wrapper.text()).toContain('a@b.com');
  });

  it('lists errors on the errors tab', async () => {
    const wrapper = mountDevTools({
      errors: { email: ['Invalid email', 'Too short'] },
    });
    await open(wrapper);
    await clickTab(wrapper, 'errors');

    expect(wrapper.text()).toContain('email:');
    expect(wrapper.text()).toContain('Invalid email');
    expect(wrapper.text()).toContain('Too short');
  });

  it('reports a clean form on the errors tab', async () => {
    const wrapper = mountDevTools();
    await open(wrapper);
    await clickTab(wrapper, 'errors');

    expect(wrapper.text()).toContain('✓ No validation errors');
  });

  it('shows dirty and touched state on the meta tab', async () => {
    const wrapper = mountDevTools({ isDirty: true, touched: { email: true } });
    await open(wrapper);
    await clickTab(wrapper, 'meta');

    expect(wrapper.text()).toContain('isDirty:');
    expect(wrapper.text()).toContain('true');
    expect(wrapper.text()).toContain('"email": true');
  });

  it('lists field descriptions on the fields tab', async () => {
    const fields: FieldDescription[] = [
      { name: 'email', type: 'text', required: true },
    ];
    const wrapper = mountDevTools({ fields });
    await open(wrapper);
    await clickTab(wrapper, 'fields');

    expect(wrapper.text()).toContain('email');
    expect(wrapper.text()).toContain('type: text | required: true');
  });

  it('explains when no field descriptions were passed', async () => {
    const wrapper = mountDevTools();
    await open(wrapper);
    await clickTab(wrapper, 'fields');

    expect(wrapper.text()).toContain('No field descriptions passed');
  });

  it('shows the error count in the errors tab label', async () => {
    const wrapper = mountDevTools({ errors: { name: ['required'] } });
    await open(wrapper);

    expect(wrapper.text()).toContain('errors (1)');
  });

  it('closes the overlay again', async () => {
    const wrapper = mountDevTools();
    await open(wrapper);

    const closeButton = wrapper.findAll('button').find((b) => b.text() === '✕');
    await closeButton!.trigger('click');

    expect(wrapper.text()).not.toContain('🛠️ Form DevTools');
    expect(wrapper.text()).toContain('🔍 DevTools');
  });

  it('anchors to the bottom left when asked', () => {
    const wrapper = mountDevTools({ position: 'bottom-left' });

    expect(wrapper.find('button').attributes('style')).toContain('left: 16px');
  });
});
