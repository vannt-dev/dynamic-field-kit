import { TestBed } from '@angular/core/testing';
import { DynamicInput } from '../src/components/DynamicInput';
import { FIELD_REGISTRY } from '../src/fieldRegistryToken';
import { beforeEach, describe, expect, it } from 'vitest';
import { makeRegistry, TextRendererComponent } from './helpers/renderers';

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
});
