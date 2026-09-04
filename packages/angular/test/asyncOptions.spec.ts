import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type {
  FieldDescription,
  OptionsContext,
  Properties,
} from '@dynamic-field-kit/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MultiFieldInput } from '../src/components/MultiFieldInput';
import { FIELD_REGISTRY } from '../src/fieldRegistryToken';
import { makeRegistry } from './helpers/renderers';

@Component({
  selector: 'dfk-option-probe',
  standalone: true,
  template: `<span class="status">{{ optionsStatus ?? 'none' }}</span
    ><span class="opts">{{ optionValues }}</span>`,
})
class OptionProbeComponent {
  @Input() options?: unknown[];
  @Input() optionsStatus?: string;
  @Input() optionsError?: unknown;
  @Input() onOptionsQuery?: (q: string) => void;

  get optionValues(): string {
    return ((this.options ?? []) as Properties[])
      .map((o) => String(o.value))
      .join(',');
  }
}

async function mountField(fields: FieldDescription[]) {
  const registry = makeRegistry();
  registry.register('optionProbe' as never, OptionProbeComponent as never);
  TestBed.configureTestingModule({
    imports: [MultiFieldInput],
    providers: [{ provide: FIELD_REGISTRY, useValue: registry }],
  });
  const fixture = TestBed.createComponent(MultiFieldInput);
  fixture.componentRef.setInput('fieldDescriptions', fields);
  fixture.componentRef.setInput('properties', {});
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('async field options', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('goes ready and shows the resolved options', async () => {
    const fixture = await mountField([
      {
        name: 'city',
        type: 'optionProbe' as never,
        options: async () => [{ value: 'hn' }, { value: 'sg' }],
      },
    ]);

    expect(fixture.nativeElement.querySelector('.status').textContent).toBe(
      'ready',
    );
    expect(fixture.nativeElement.querySelector('.opts').textContent).toBe(
      'hn,sg',
    );
  });

  it('reports a failed load', async () => {
    const fixture = await mountField([
      {
        name: 'city',
        type: 'optionProbe' as never,
        options: async () => {
          throw new Error('network down');
        },
      },
    ]);

    expect(fixture.nativeElement.querySelector('.status').textContent).toBe(
      'error',
    );
  });

  it('leaves a synchronous field with no options status at all', async () => {
    const fixture = await mountField([
      {
        name: 'city',
        type: 'optionProbe' as never,
        options: [{ value: 'hn' }],
      },
    ]);

    expect(fixture.nativeElement.querySelector('.status').textContent).toBe(
      'none',
    );
    expect(fixture.nativeElement.querySelector('.opts').textContent).toBe('hn');
  });

  it('never calls a synchronous options function through the loader', async () => {
    const load = vi.fn(() => [{ value: 'hn' }]);
    await mountField([
      { name: 'city', type: 'optionProbe' as never, options: load },
    ]);

    expect(load).toHaveBeenCalled();
    expect(load.mock.calls[0]).toHaveLength(2);
  });
});

describe('onOptionsQuery reaches an Angular renderer', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('lets a registered renderer trigger a search-remote refetch', async () => {
    const seen: (string | undefined)[] = [];
    const registry = makeRegistry();
    registry.register('optionProbe' as never, OptionProbeComponent as never);
    TestBed.configureTestingModule({
      imports: [MultiFieldInput],
      providers: [{ provide: FIELD_REGISTRY, useValue: registry }],
    });

    const fixture = TestBed.createComponent(MultiFieldInput);
    fixture.componentRef.setInput('fieldDescriptions', [
      {
        name: 'user',
        type: 'optionProbe' as never,
        optionsMode: 'async',
        options: async (
          _d: Properties,
          _r?: Properties,
          ctx?: OptionsContext,
        ) => {
          seen.push(ctx?.query);
          return [{ value: ctx?.query ?? 'none' }];
        },
      },
    ]);
    fixture.componentRef.setInput('properties', {});
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const probe = fixture.debugElement.query(
      (d) => d.componentInstance instanceof OptionProbeComponent,
    ).componentInstance as OptionProbeComponent;

    // The renderer must actually receive the callback, not undefined.
    expect(typeof probe.onOptionsQuery).toBe('function');

    probe.onOptionsQuery!('ada');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(seen).toContain('ada');
  });
});

describe('the HTML5 fallback carries the aria flags', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('sets aria-invalid and aria-describedby on the built-in control', async () => {
    const registry = makeRegistry();
    TestBed.configureTestingModule({
      imports: [MultiFieldInput],
      providers: [{ provide: FIELD_REGISTRY, useValue: registry }],
    });

    const fixture = TestBed.createComponent(MultiFieldInput);
    fixture.componentRef.setInput('fieldDescriptions', [
      {
        name: 'title',
        type: 'text',
        required: true,
        validate: (v: unknown) => (v ? undefined : 'Required'),
      },
    ]);
    fixture.componentRef.setInput('properties', { title: '' });
    fixture.componentRef.setInput('idPrefix', 'aria');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const input: HTMLElement = fixture.nativeElement.querySelector('input');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-required')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('aria-title-error');
    // and the node it points at exists
    expect(
      fixture.nativeElement.querySelector('#aria-title-error'),
    ).not.toBeNull();
  });
});
