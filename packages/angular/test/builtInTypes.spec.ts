import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DynamicInput } from '../src/components/DynamicInput';
import { FIELD_REGISTRY } from '../src/fieldRegistryToken';
import { makeRegistry } from './helpers/renderers';

// The fallback for the field types that had none before: the same controls,
// values and markup as the React, Vue and Svelte built-ins.
describe('the built-in fallback for every type the README lists', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DynamicInput],
      providers: [{ provide: FIELD_REGISTRY, useValue: makeRegistry() }],
    });
  });

  function mount(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(DynamicInput);
    const emitted: unknown[] = [];
    fixture.componentInstance.onChange.subscribe((value: unknown) =>
      emitted.push(value),
    );
    const set = (next: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(next)) {
        fixture.componentRef.setInput(key, value);
      }
      fixture.detectChanges();
    };
    set(inputs);
    const root = fixture.nativeElement as HTMLElement;
    const one = <T extends Element>(selector: string) =>
      root.querySelector(selector) as T;
    const all = <T extends Element>(selector: string): T[] =>
      Array.from(root.querySelectorAll(selector)) as T[];
    return { fixture, root, set, one, all, emitted };
  }

  const type = (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  it.each([
    ['date', '2026-10-21'],
    ['time', '09:30'],
    ['datetime-local', '2026-10-21T09:30'],
  ])('draw a %s input whose value is the ISO text', (kind, iso) => {
    const { one, set, emitted } = mount({ type: kind, id: 'f-when' });
    const input = one<HTMLInputElement>('input');
    expect(input.type).toBe(kind);
    expect(input.id).toBe('f-when');
    type(input, iso);
    expect(emitted).toEqual([iso]);
    set({ value: iso });
    expect(input.value).toBe(iso);
    expect(input.closest('.dfk-field')).not.toBeNull();
  });

  it('draw a switch as a checkbox that reports a boolean', () => {
    const { one, set, emitted } = mount({ type: 'switch', value: true });
    const input = one<HTMLInputElement>('input');
    expect(input.type).toBe('checkbox');
    expect(input.checked).toBe(true);
    input.click();
    expect(emitted).toEqual([false]);
    set({ readOnly: true });
    // a checkbox has no read-only state of its own
    expect(input.disabled).toBe(true);
  });

  it('draw a range that reports a number, within its bounds', () => {
    const { one, set, emitted } = mount({
      type: 'range',
      min: 1,
      max: 10,
      step: 1,
    });
    const input = one<HTMLInputElement>('input');
    expect(input.type).toBe('range');
    expect([input.min, input.max, input.step]).toEqual(['1', '10', '1']);
    // no value yet: it starts at the minimum
    expect(input.value).toBe('1');
    type(input, '7');
    expect(emitted).toEqual([7]);
    set({ value: 4 });
    expect(input.value).toBe('4');
    set({ readOnly: true });
    expect(input.disabled).toBe(true);
  });

  describe('a file input', () => {
    function choose(input: HTMLInputElement, files: File[]) {
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: Object.assign([...files], {
          item: (index: number) => files[index] ?? null,
        }),
      });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const a = new File(['a'], 'a.png', { type: 'image/png' });
    const b = new File(['b'], 'b.png', { type: 'image/png' });

    it('reports the chosen file, with accept passed on', () => {
      const { one, emitted } = mount({ type: 'file', accept: 'image/*' });
      const input = one<HTMLInputElement>('input');
      expect(input.type).toBe('file');
      expect(input.accept).toBe('image/*');
      expect(input.multiple).toBe(false);
      choose(input, [a]);
      expect(emitted).toEqual([a]);
    });

    it('reports null when the choice is cleared', () => {
      const { one, emitted } = mount({ type: 'file' });
      choose(one<HTMLInputElement>('input'), []);
      expect(emitted).toEqual([null]);
    });

    it('reports every file as an array for multiple', () => {
      const { one, emitted } = mount({ type: 'file', multiple: true });
      const input = one<HTMLInputElement>('input');
      expect(input.multiple).toBe(true);
      choose(input, [a, b]);
      expect(emitted).toEqual([[a, b]]);
    });
  });

  describe('a radio group', () => {
    const options = [
      { label: 'One', value: 1 },
      { label: 'Two', value: 2 },
    ];

    it('is a radiogroup named after its caption, a label per button', () => {
      const { root, one, all } = mount({
        type: 'radio',
        id: 'f-n',
        label: 'Number',
        options,
      });
      const group = one<HTMLDivElement>('[role="radiogroup"]');
      expect(group.id).toBe('f-n');
      expect(group.className).toContain('dfk-radio-group');
      const caption = root.querySelector(
        `[id="${group.getAttribute('aria-labelledby')}"]`,
      );
      expect(caption?.tagName).toBe('SPAN');
      expect(caption?.textContent).toBe('Number');
      // a group cannot take <label for>
      expect(root.querySelector('label[for]')).toBeNull();
      const buttons = all<HTMLInputElement>('input[type="radio"]');
      expect(buttons.map((button) => button.id)).toEqual(['f-n-0', 'f-n-1']);
      expect(buttons.map((button) => button.name)).toEqual(['f-n', 'f-n']);
      expect(buttons.map((button) => button.labels?.[0]?.textContent)).toEqual([
        'One',
        'Two',
      ]);
    });

    it('reports the value of the option itself and checks the one given', () => {
      const { all, set, emitted } = mount({
        type: 'radio',
        id: 'f-n',
        options,
      });
      const buttons = all<HTMLInputElement>('input[type="radio"]');
      buttons[1]!.click();
      // the number 2, not the text of the value attribute
      expect(emitted).toEqual([2]);
      set({ value: 1 });
      expect(buttons.map((button) => button.checked)).toEqual([true, false]);
    });

    it('rebuilds the buttons only when the options change', () => {
      const { all, set } = mount({ type: 'radio', id: 'f-n', options });
      const first = all('input')[0];
      set({ value: 2, options: [...options] });
      expect(all('input')[0]).toBe(first);
      set({ options: [...options, { label: 'Three', value: 3 }] });
      expect(all('input')).toHaveLength(3);
    });

    it('puts the aria flags and the disabled state on every button', () => {
      const { all, set } = mount({
        type: 'radio',
        id: 'f-n',
        options,
        ariaInvalid: true,
        ariaDescribedBy: 'f-n-error',
        required: true,
      });
      for (const button of all<HTMLInputElement>('input[type="radio"]')) {
        expect(button.getAttribute('aria-invalid')).toBe('true');
        expect(button.getAttribute('aria-describedby')).toBe('f-n-error');
        expect(button.required).toBe(true);
      }
      set({ readOnly: true, ariaDescribedBy: undefined });
      for (const button of all<HTMLInputElement>('input[type="radio"]')) {
        expect(button.disabled).toBe(true);
        expect(button.hasAttribute('aria-describedby')).toBe(false);
      }
    });
  });
});
