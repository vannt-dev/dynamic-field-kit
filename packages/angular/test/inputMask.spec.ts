import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { FieldDescription, Properties } from '@dynamic-field-kit/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { MultiFieldInput } from '../src/components/MultiFieldInput';
import { FIELD_REGISTRY } from '../src/fieldRegistryToken';
import { makeRegistry, TextRendererComponent } from './helpers/renderers';

const phone: FieldDescription = {
  name: 'phone',
  type: 'text',
  mask: '(999) 999-9999',
};

// A form that keeps what its fields report, the way an application's does.
@Component({
  selector: 'dfk-test-mask-host',
  standalone: true,
  imports: [MultiFieldInput],
  template: `
    <dfk-multi-field-input
      [fieldDescriptions]="fields"
      [properties]="data"
      (onChange)="data = $event"
    ></dfk-multi-field-input>
  `,
})
class HostComponent {
  @Input() fields: FieldDescription[] = [];
  @Input() data: Properties = {};
}

describe('a field with a mask', () => {
  let registry: ReturnType<typeof makeRegistry>;

  beforeEach(() => {
    registry = makeRegistry();
    registry.register('text', TextRendererComponent as never);
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: FIELD_REGISTRY, useValue: registry }],
    });
  });

  function mount(fields: FieldDescription[], data: Properties) {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentRef.setInput('fields', fields);
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();
    const input = (): HTMLInputElement =>
      fixture.nativeElement.querySelector('input');
    const type = async (text: string) => {
      input().value = text;
      input().dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    return { fixture, input, type };
  }

  it('shows the formatted text and stores what was typed', async () => {
    const { fixture, input, type } = mount([phone], { phone: '' });
    expect(input().value).toBe('');

    await type('5');
    expect(input().value).toBe('(5');
    await type('(5551');
    expect(input().value).toBe('(555) 1');
    expect(fixture.componentInstance.data).toEqual({ phone: '5551' });
  });

  it('lays out a value the form already holds', () => {
    const { input } = mount([phone], { phone: '5551234567' });
    expect(input().value).toBe('(555) 123-4567');
  });

  it('takes the character before a separator that was deleted', async () => {
    const { fixture, input, type } = mount([phone], { phone: '5551234567' });
    await type('(555 123-4567');
    expect(fixture.componentInstance.data).toEqual({ phone: '551234567' });
    expect(input().value).toBe('(551) 234-567');
  });

  it('does not leave on screen what the mask refused', async () => {
    const { fixture, input, type } = mount([phone], { phone: '' });

    // A letter where a digit belongs: nothing is stored, nothing is shown.
    await type('x');
    expect(fixture.componentInstance.data).toEqual({ phone: '' });
    expect(input().value).toBe('');

    // One digit more than the pattern has places for.
    await type('5551234567');
    expect(input().value).toBe('(555) 123-4567');
    await type('(555) 123-45678');
    expect(fixture.componentInstance.data).toEqual({ phone: '5551234567' });
    expect(input().value).toBe('(555) 123-4567');

    // And the same refusal a second time is put right a second time.
    await type('(555) 123-45679');
    expect(input().value).toBe('(555) 123-4567');
  });

  it('does not leave it on screen in the built-in input either', async () => {
    registry = makeRegistry();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: FIELD_REGISTRY, useValue: registry }],
    });
    const { fixture, input, type } = mount([phone], { phone: '5551234567' });
    const builtIn = input();
    expect(builtIn.value).toBe('(555) 123-4567');
    await type('(555) 123-45678');
    expect(fixture.componentInstance.data).toEqual({ phone: '5551234567' });
    // the one input, put right where it stands
    expect(fixture.nativeElement.querySelectorAll('input')).toHaveLength(1);
    expect(input()).toBe(builtIn);
    expect(builtIn.value).toBe('(555) 123-4567');
  });

  it('leaves a field without a mask as it was', async () => {
    const { fixture, input, type } = mount([{ name: 'phone', type: 'text' }], {
      phone: '',
    });
    await type('(555) 1');
    expect(fixture.componentInstance.data).toEqual({ phone: '(555) 1' });
    expect(input().value).toBe('(555) 1');
  });

  it('works for a field inside a repeatable group', async () => {
    const { fixture, input, type } = mount(
      [{ name: 'contacts', type: 'text', fields: [phone] }],
      { contacts: [{ phone: '' }] },
    );
    await type('5551234');
    expect(fixture.componentInstance.data).toEqual({
      contacts: [{ phone: '5551234' }],
    });
    expect(input().value).toBe('(555) 123-4');
  });
});
