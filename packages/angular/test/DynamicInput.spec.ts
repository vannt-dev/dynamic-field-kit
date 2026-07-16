import { TestBed } from '@angular/core/testing';
import { DynamicInput } from '../src/components/DynamicInput';
import { FIELD_REGISTRY } from '../src/fieldRegistryToken';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DefaultsRendererComponent,
  makeRegistry,
  TextRendererComponent,
} from './helpers/renderers';

describe('DynamicInput', () => {
  let registry: ReturnType<typeof makeRegistry>;

  beforeEach(() => {
    registry = makeRegistry();
    TestBed.configureTestingModule({
      imports: [DynamicInput],
      providers: [{ provide: FIELD_REGISTRY, useValue: registry }],
    });
  });

  it('renders a registered Angular component class', () => {
    registry.register('text', TextRendererComponent as never);

    const fixture = TestBed.createComponent(DynamicInput);
    fixture.componentRef.setInput('type', 'text');
    fixture.componentRef.setInput('value', 'hello');
    fixture.detectChanges();

    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('input.txt');
    expect(input).not.toBeNull();
    expect(input.value).toBe('hello');
  });

  it('does not clobber a renderer input default when DynamicInput was never given that prop', () => {
    registry.register('defaults', DefaultsRendererComponent as never);

    const fixture = TestBed.createComponent(DynamicInput);
    fixture.componentRef.setInput('type', 'defaults');
    // Deliberately never setInput('label', ...): DynamicInput was never
    // given a value for `label`, so the renderer's own initializer
    // (`label = 'None'`) must survive applyProps untouched.
    fixture.detectChanges();

    const label: HTMLElement = fixture.nativeElement.querySelector('.label');
    expect(label.textContent).toBe('None');
  });
});
