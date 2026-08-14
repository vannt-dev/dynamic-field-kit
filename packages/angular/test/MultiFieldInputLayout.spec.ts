import { TestBed } from '@angular/core/testing';
import type { FieldDescription } from '@dynamic-field-kit/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MultiFieldInput } from '../src/components/MultiFieldInput';
import { FIELD_REGISTRY } from '../src/fieldRegistryToken';
import { makeRegistry, TextRendererComponent } from './helpers/renderers';

const FIELDS: FieldDescription[] = [
  { name: 'first', type: 'text' },
  { name: 'second', type: 'text' },
];

/**
 * Installs a matchMedia stub that reports "mobile" for the given viewport
 * width, and records every media query the component asks about so a test can
 * assert on the breakpoint it derived. jsdom ships no matchMedia at all, which
 * is why the component's own `typeof window.matchMedia === 'function'` guard
 * exists.
 */
function stubMatchMedia(viewportWidth: number) {
  const queries: string[] = [];
  const stub = vi.fn((query: string) => {
    queries.push(query);
    const max = Number(/max-width:\s*(\d+)px/.exec(query)?.[1] ?? NaN);
    return { matches: viewportWidth <= max } as MediaQueryList;
  });
  (window as unknown as { matchMedia: unknown }).matchMedia = stub;
  return queries;
}

describe('MultiFieldInput responsive layout', () => {
  let registry: ReturnType<typeof makeRegistry>;

  beforeEach(() => {
    registry = makeRegistry();
    registry.register('text', TextRendererComponent as never);
    TestBed.configureTestingModule({
      imports: [MultiFieldInput],
      providers: [{ provide: FIELD_REGISTRY, useValue: registry }],
    });
  });

  afterEach(() => {
    delete (window as unknown as { matchMedia?: unknown }).matchMedia;
  });

  function mount(layout: unknown) {
    const fixture = TestBed.createComponent(MultiFieldInput);
    fixture.componentRef.setInput('fieldDescriptions', FIELDS);
    fixture.componentRef.setInput('properties', {});
    fixture.componentRef.setInput('layout', layout);
    fixture.detectChanges();
    return fixture;
  }

  const RESPONSIVE = {
    type: 'responsive',
    mobile: 'column',
    desktop: { type: 'grid', columns: 3, gap: 16 },
  };

  it('resolves to the desktop layout above the breakpoint', () => {
    stubMatchMedia(1280);

    const fixture = mount(RESPONSIVE);

    expect(fixture.componentInstance.resolvedLayoutType).toBe('grid');
    expect(fixture.componentInstance.columns).toBe(3);
    expect(fixture.componentInstance.gap).toBe(16);
  });

  it('resolves to the mobile layout below the breakpoint', () => {
    stubMatchMedia(375);

    const fixture = mount(RESPONSIVE);

    expect(fixture.componentInstance.resolvedLayoutType).toBe('column');
  });

  it('honours a custom breakpoint, querying one pixel below it', () => {
    // The component asks for `max-width: <breakpoint - 1>px`, so a viewport
    // exactly at the breakpoint counts as desktop rather than mobile.
    const queries = stubMatchMedia(900);

    const fixture = mount({ ...RESPONSIVE, breakpoint: 900 });

    expect(queries).toContain('(max-width: 899px)');
    expect(fixture.componentInstance.resolvedLayoutType).toBe('grid');
  });

  it('falls back to the default breakpoint when none is given', () => {
    const queries = stubMatchMedia(1280);

    mount(RESPONSIVE);

    expect(queries).toEqual([expect.stringMatching(/^\(max-width: \d+px\)$/)]);
    expect(queries).not.toContain('(max-width: 899px)');
  });

  it('re-renders on resize only when the mobile state actually flips', () => {
    stubMatchMedia(1280);
    const fixture = mount(RESPONSIVE);
    const cdr = (
      fixture.componentInstance as unknown as {
        cdr: { markForCheck: () => void };
      }
    ).cdr;
    const markForCheck = vi.spyOn(cdr, 'markForCheck');

    // Still desktop: nothing changed, so no work should be scheduled.
    fixture.componentInstance.onWindowResize();
    expect(markForCheck).not.toHaveBeenCalled();

    // Crossing the breakpoint is the case that must schedule a re-render.
    stubMatchMedia(375);
    fixture.componentInstance.onWindowResize();
    expect(markForCheck).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.resolvedLayoutType).toBe('column');
  });

  it('treats the layout as desktop when the environment has no matchMedia', () => {
    // jsdom without the stub: the guard has to keep the component usable
    // rather than throwing on `window.matchMedia(...)`.
    delete (window as unknown as { matchMedia?: unknown }).matchMedia;

    const fixture = mount(RESPONSIVE);

    expect(fixture.componentInstance.resolvedLayoutType).toBe('grid');
  });
});

describe('MultiFieldInput layout defaults', () => {
  let registry: ReturnType<typeof makeRegistry>;

  beforeEach(() => {
    registry = makeRegistry();
    registry.register('text', TextRendererComponent as never);
    TestBed.configureTestingModule({
      imports: [MultiFieldInput],
      providers: [{ provide: FIELD_REGISTRY, useValue: registry }],
    });
  });

  function mount(layout: unknown) {
    const fixture = TestBed.createComponent(MultiFieldInput);
    fixture.componentRef.setInput('fieldDescriptions', FIELDS);
    fixture.componentRef.setInput('properties', {});
    fixture.componentRef.setInput('layout', layout);
    fixture.detectChanges();
    return fixture;
  }

  it('defaults a grid without an explicit column count to two columns', () => {
    const fixture = mount({ type: 'grid' });

    expect(fixture.componentInstance.columns).toBe(2);
  });

  it('defaults the gap when the layout config omits it', () => {
    const fixture = mount({ type: 'grid', columns: 4 });

    expect(fixture.componentInstance.gap).toBe(12);
    expect(fixture.componentInstance.columns).toBe(4);
  });

  it('reports two columns for a non-grid layout', () => {
    const fixture = mount('column');

    expect(fixture.componentInstance.resolvedLayoutType).toBe('column');
    expect(fixture.componentInstance.columns).toBe(2);
  });
});

describe('MultiFieldInput group bounds', () => {
  let registry: ReturnType<typeof makeRegistry>;

  beforeEach(() => {
    registry = makeRegistry();
    registry.register('text', TextRendererComponent as never);
    TestBed.configureTestingModule({
      imports: [MultiFieldInput],
      providers: [{ provide: FIELD_REGISTRY, useValue: registry }],
    });
  });

  function mountGroup(field: FieldDescription, items: unknown) {
    const fixture = TestBed.createComponent(MultiFieldInput);
    fixture.componentRef.setInput('fieldDescriptions', [field]);
    fixture.componentRef.setInput('properties', { [field.name]: items });
    fixture.detectChanges();
    return fixture;
  }

  const GROUP: FieldDescription = {
    name: 'contacts',
    type: 'text',
    fields: [{ name: 'email', type: 'text' }],
    minItems: 1,
    maxItems: 2,
  };

  it('refuses to add past maxItems', () => {
    const changes: unknown[] = [];
    const fixture = mountGroup(GROUP, [{ email: 'a' }, { email: 'b' }]);
    fixture.componentInstance.onChange.subscribe((next) => changes.push(next));

    fixture.componentInstance.onGroupItemAdd(GROUP);

    expect(changes).toEqual([]);
  });

  it('refuses to remove below minItems', () => {
    const changes: unknown[] = [];
    const fixture = mountGroup(GROUP, [{ email: 'a' }]);
    fixture.componentInstance.onChange.subscribe((next) => changes.push(next));

    fixture.componentInstance.onGroupItemRemove(GROUP, 0);

    expect(changes).toEqual([]);
  });

  it('treats a non-array group value as empty rather than throwing', () => {
    // A schema can declare a group whose data has not been initialised yet, or
    // arrives as a scalar from a stale payload.
    const fixture = mountGroup(GROUP, 'not-an-array');

    expect(fixture.componentInstance.canRemoveItem(GROUP)).toBe(false);
    expect(fixture.componentInstance.canAddItem(GROUP)).toBe(true);
  });
});
