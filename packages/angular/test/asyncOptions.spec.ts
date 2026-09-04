import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { FieldDescription, Properties } from '@dynamic-field-kit/core';
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
