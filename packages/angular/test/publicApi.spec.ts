import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FieldRegistry, fieldRegistry } from '@dynamic-field-kit/core';
import { describe, expect, it } from 'vitest';
import * as publicApi from '../src/public-api';
import { FIELD_REGISTRY } from '../src/fieldRegistryToken';
import { DynamicFieldKitModule } from '../src/lib/dynamic-field-kit.module';
import { makeRegistry, TextRendererComponent } from './helpers/renderers';

describe('public API', () => {
  it('exports the components, registry and validation helpers', () => {
    expect(publicApi.DynamicInput).toBeDefined();
    expect(publicApi.FieldInput).toBeDefined();
    expect(publicApi.MultiFieldInput).toBeDefined();
    expect(publicApi.FIELD_REGISTRY).toBe(FIELD_REGISTRY);
    expect(publicApi.FieldRegistry).toBe(FieldRegistry);
    expect(typeof publicApi.validateField).toBe('function');
    expect(typeof publicApi.validateFields).toBe('function');
    expect(typeof publicApi.resolveDisabled).toBe('function');
    expect(typeof publicApi.resolveReadOnly).toBe('function');
  });
});

describe('FIELD_REGISTRY token', () => {
  it('defaults to the process-wide singleton', () => {
    TestBed.configureTestingModule({});

    expect(TestBed.inject(FIELD_REGISTRY)).toBe(fieldRegistry);
  });

  it('can be overridden with a scoped registry', () => {
    const scoped = makeRegistry();
    TestBed.configureTestingModule({
      providers: [{ provide: FIELD_REGISTRY, useValue: scoped }],
    });

    expect(TestBed.inject(FIELD_REGISTRY)).toBe(scoped);
    expect(TestBed.inject(FIELD_REGISTRY)).not.toBe(fieldRegistry);
  });
});

describe('DynamicFieldKitModule', () => {
  @Component({
    standalone: true,
    imports: [DynamicFieldKitModule],
    template: `<dfk-field-input
      [fieldDescription]="{ name: 'a', type: 'text' }"
    ></dfk-field-input>`,
  })
  class ModuleHost {}

  it('exports the components for template use', () => {
    const scoped = makeRegistry();
    scoped.register('text', TextRendererComponent as never);
    TestBed.configureTestingModule({
      providers: [{ provide: FIELD_REGISTRY, useValue: scoped }],
    });

    const fixture = TestBed.createComponent(ModuleHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('input.txt')).not.toBeNull();
  });
});
