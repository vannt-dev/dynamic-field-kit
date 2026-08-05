import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import {
  DefaultDateRenderer,
  DefaultDateTimeLocalRenderer,
  DefaultFileRenderer,
  DefaultRadioRenderer,
  DefaultRangeRenderer,
  DefaultSelectRenderer,
  DefaultSwitchRenderer,
  DefaultTimeRenderer,
  defaultRenderersMap,
  getDefaultRenderer,
} from '../src/defaultRenderers';

describe('date/time renderers (Vue)', () => {
  it.each([
    ['date', DefaultDateRenderer],
    ['time', DefaultTimeRenderer],
    ['datetime-local', DefaultDateTimeLocalRenderer],
  ])('renders an input of type %s', (type, Renderer) => {
    const wrapper = mount(Renderer as never, { props: { value: '' } });

    expect(wrapper.find('input').attributes('type')).toBe(type);
  });

  it('emits the raw string value on input', async () => {
    const onValueChange = vi.fn();
    const wrapper = mount(DefaultTimeRenderer as never, {
      props: { value: '', onValueChange },
    });

    await wrapper.find('input').setValue('10:30');

    expect(onValueChange).toHaveBeenCalledWith('10:30');
  });
});

describe('DefaultSwitchRenderer (Vue)', () => {
  it('renders a checkbox reflecting the value', () => {
    const wrapper = mount(DefaultSwitchRenderer as never, {
      props: { value: true },
    });

    const input = wrapper.find('input');
    expect(input.attributes('type')).toBe('checkbox');
    expect((input.element as HTMLInputElement).checked).toBe(true);
  });

  it('emits the checked state', async () => {
    const onValueChange = vi.fn();
    const wrapper = mount(DefaultSwitchRenderer as never, {
      props: { value: false, onValueChange },
    });

    await wrapper.find('input').setValue(true);

    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});

describe('DefaultFileRenderer (Vue)', () => {
  function changeFiles(wrapper: ReturnType<typeof mount>, files: File[]) {
    const input = wrapper.find('input').element as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: files, writable: false });
    return wrapper.find('input').trigger('change');
  }

  it('emits a single File by default', async () => {
    const onValueChange = vi.fn();
    const wrapper = mount(DefaultFileRenderer as never, {
      props: { onValueChange },
    });
    const file = new File(['x'], 'a.txt');

    await changeFiles(wrapper, [file]);

    expect(onValueChange).toHaveBeenCalledWith(file);
  });

  it('emits an array when multiple is set', async () => {
    const onValueChange = vi.fn();
    const wrapper = mount(DefaultFileRenderer as never, {
      props: { onValueChange, multiple: true },
    });
    const a = new File(['a'], 'a.txt');
    const b = new File(['b'], 'b.txt');

    await changeFiles(wrapper, [a, b]);

    expect(onValueChange).toHaveBeenCalledWith([a, b]);
  });

  it('emits null when a single selection is cleared', async () => {
    const onValueChange = vi.fn();
    const wrapper = mount(DefaultFileRenderer as never, {
      props: { onValueChange },
    });

    await changeFiles(wrapper, []);

    expect(onValueChange).toHaveBeenCalledWith(null);
  });

  it('forwards accept and multiple', () => {
    const wrapper = mount(DefaultFileRenderer as never, {
      props: { accept: '.png', multiple: true },
    });

    expect(wrapper.find('input').attributes('accept')).toBe('.png');
    expect(wrapper.find('input').attributes('multiple')).toBeDefined();
  });
});

describe('option-shaped fallbacks (Vue)', () => {
  it('falls back to id/name when a select option has no value/label', () => {
    const wrapper = mount(DefaultSelectRenderer as never, {
      props: { value: '1', options: [{ id: '1', name: 'One' }] },
    });

    const option = wrapper.findAll('option')[1];
    expect(option.text()).toBe('One');
    expect(option.attributes('value')).toBe('1');
  });

  it('falls back to id/name when a radio option has no value/label', () => {
    const wrapper = mount(DefaultRadioRenderer as never, {
      props: { value: '1', options: [{ id: '1', name: 'One' }], id: 'rad' },
    });

    expect(wrapper.text()).toContain('One');
    expect(
      (wrapper.find('input[type="radio"]').element as HTMLInputElement).checked
    ).toBe(true);
  });

  it('emits the option value when a radio is picked', async () => {
    const onValueChange = vi.fn();
    const wrapper = mount(DefaultRadioRenderer as never, {
      props: {
        value: 'a',
        options: [
          { label: 'A', value: 'a' },
          { label: 'B', value: 'b' },
        ],
        onValueChange,
      },
    });

    await wrapper.findAll('input[type="radio"]')[1].trigger('change');

    expect(onValueChange).toHaveBeenCalledWith('b');
  });

  it('treats a readOnly select as disabled', () => {
    const wrapper = mount(DefaultSelectRenderer as never, {
      props: { value: '', options: [], readOnly: true },
    });

    expect(wrapper.find('select').attributes('disabled')).toBeDefined();
  });
});

describe('DefaultRangeRenderer (Vue)', () => {
  it('falls back to min when no value is set', () => {
    const wrapper = mount(DefaultRangeRenderer as never, {
      props: { min: 5, max: 10 },
    });

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('5');
  });

  it('emits a number on input', async () => {
    const onValueChange = vi.fn();
    const wrapper = mount(DefaultRangeRenderer as never, {
      props: { value: 5, min: 0, max: 10, onValueChange },
    });

    await wrapper.find('input').setValue('7');

    expect(onValueChange).toHaveBeenCalledWith(7);
  });
});

describe('getDefaultRenderer (Vue)', () => {
  it('resolves every registered type', () => {
    for (const type of Object.keys(defaultRenderersMap)) {
      expect(getDefaultRenderer(type)).toBe(defaultRenderersMap[type]);
    }
  });

  it('returns undefined for an unknown type', () => {
    expect(getDefaultRenderer('nope')).toBeUndefined();
  });
});
