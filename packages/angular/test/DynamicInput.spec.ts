import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DynamicInput } from '../src/components/DynamicInput';
import { FIELD_REGISTRY } from '../src/fieldRegistryToken';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DefaultsRendererComponent,
  makeRegistry,
  TextRendererComponent,
  LegacyOutputRendererComponent,
  fallbackRenderer,
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

  it('forwards KNOWN_PROPS to the rendered instance', () => {
    registry.register('text', TextRendererComponent as never);

    const fixture = TestBed.createComponent(DynamicInput);
    fixture.componentRef.setInput('type', 'text');
    fixture.componentRef.setInput('placeholder', 'Your name');
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('input.txt');
    expect(input.placeholder).toBe('Your name');
    expect(input.disabled).toBe(true);
  });

  it('forwards extraProps verbatim', () => {
    registry.register('text', TextRendererComponent as never);

    const fixture = TestBed.createComponent(DynamicInput);
    fixture.componentRef.setInput('type', 'text');
    fixture.componentRef.setInput('extraProps', { hint: 'be brief' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.hint').textContent).toBe(
      'be brief'
    );
  });

  it('syncs prop changes to an already-rendered instance', () => {
    registry.register('text', TextRendererComponent as never);

    const fixture = TestBed.createComponent(DynamicInput);
    fixture.componentRef.setInput('type', 'text');
    fixture.componentRef.setInput('value', 'first');
    fixture.detectChanges();

    fixture.componentRef.setInput('value', 'second');
    fixture.detectChanges();

    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('input.txt');
    expect(input.value).toBe('second');
  });

  it('emits valueChange and onChange when the renderer emits valueChange', () => {
    registry.register('text', TextRendererComponent as never);

    const fixture = TestBed.createComponent(DynamicInput);
    fixture.componentRef.setInput('type', 'text');
    fixture.detectChanges();

    const seen: unknown[] = [];
    const legacy: unknown[] = [];
    fixture.componentInstance.valueChange.subscribe((v) => seen.push(v));
    fixture.componentInstance.onChange.subscribe((v) => legacy.push(v));

    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('input.txt');
    input.value = 'typed';
    input.dispatchEvent(new Event('input'));

    expect(seen).toEqual(['typed']);
    expect(legacy).toEqual(['typed']);
  });

  it('binds the legacy onValueChange output name', () => {
    registry.register('text', LegacyOutputRendererComponent as never);

    const fixture = TestBed.createComponent(DynamicInput);
    fixture.componentRef.setInput('type', 'text');
    fixture.detectChanges();

    const seen: unknown[] = [];
    fixture.componentInstance.valueChange.subscribe((v) => seen.push(v));

    fixture.nativeElement.querySelector('button.legacy-btn').click();

    expect(seen).toEqual(['legacy']);
  });

  it('renders a plain function renderer as fallback HTML', () => {
    registry.register('text', fallbackRenderer as never);

    const fixture = TestBed.createComponent(DynamicInput);
    fixture.componentRef.setInput('type', 'text');
    fixture.componentRef.setInput('label', 'Name');
    fixture.componentRef.setInput('value', 'Ada');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.fallback').textContent).toBe(
      'Name:Ada'
    );
  });

  it('renders an error for an unknown field type', () => {
    const fixture = TestBed.createComponent(DynamicInput);
    fixture.componentRef.setInput('type', 'nope');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Unknown field type: nope'
    );
  });

  it('re-renders when type changes', () => {
    registry.register('text', TextRendererComponent as never);
    registry.register('number', fallbackRenderer as never);

    const fixture = TestBed.createComponent(DynamicInput);
    fixture.componentRef.setInput('type', 'text');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input.txt')).not.toBeNull();

    fixture.componentRef.setInput('type', 'number');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('input.txt')).toBeNull();
    expect(fixture.nativeElement.querySelector('.fallback')).not.toBeNull();
  });

  it('unsubscribes from renderer outputs on destroy', () => {
    registry.register('text', TextRendererComponent as never);

    const fixture = TestBed.createComponent(DynamicInput);
    fixture.componentRef.setInput('type', 'text');
    fixture.detectChanges();

    const rendererInstance = fixture.debugElement.query(
      By.directive(TextRendererComponent)
    ).componentInstance as TextRendererComponent;

    const seen: unknown[] = [];
    fixture.componentInstance.valueChange.subscribe((v) => seen.push(v));

    fixture.destroy();
    rendererInstance.valueChange.emit('after destroy'); // bypasses DOM entirely

    expect(seen).toEqual([]);
  });

  it('unsubscribes from the legacy onValueChange output on destroy', () => {
    registry.register('text', LegacyOutputRendererComponent as never);

    const fixture = TestBed.createComponent(DynamicInput);
    fixture.componentRef.setInput('type', 'text');
    fixture.detectChanges();

    const rendererInstance = fixture.debugElement.query(
      By.directive(LegacyOutputRendererComponent)
    ).componentInstance as LegacyOutputRendererComponent;

    const seen: unknown[] = [];
    fixture.componentInstance.valueChange.subscribe((v) => seen.push(v));

    fixture.destroy();
    rendererInstance.onValueChange.emit('after destroy');

    expect(seen).toEqual([]);
  });
});
