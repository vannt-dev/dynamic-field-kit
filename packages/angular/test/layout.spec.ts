import { Component, TemplateRef, ViewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ColumnLayout,
  GridLayout,
  RowLayout,
} from '../src/layout/defaultLayouts';
import { LayoutRegistry, layoutRegistry } from '../src/layout/layoutRegistry';

@Component({
  standalone: true,
  imports: [ColumnLayout, RowLayout, GridLayout],
  template: `
    <ng-template #tpl><span class="child">x</span></ng-template>
    <dfk-column-layout
      [template]="tpl"
      [config]="{ gap: 20 }"
    ></dfk-column-layout>
    <dfk-row-layout [template]="tpl"></dfk-row-layout>
    <dfk-grid-layout
      [template]="tpl"
      [config]="{ columns: 3 }"
    ></dfk-grid-layout>
  `,
})
class LayoutHost {
  @ViewChild('tpl', { static: true }) tpl!: TemplateRef<unknown>;
}

@Component({
  standalone: true,
  imports: [GridLayout],
  template: `
    <ng-template #tpl><span class="child">x</span></ng-template>
    <dfk-grid-layout [template]="tpl"></dfk-grid-layout>
  `,
})
class GridDefaultsHost {
  @ViewChild('tpl', { static: true }) tpl!: TemplateRef<unknown>;
}

describe('LayoutRegistry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers and retrieves a layout', () => {
    const registry = new LayoutRegistry();
    registry.register('custom', ColumnLayout);

    expect(registry.get('custom')).toBe(ColumnLayout);
  });

  it('returns undefined for an unknown layout', () => {
    expect(new LayoutRegistry().get('nope')).toBeUndefined();
  });

  it('warns when a layout type is registered twice', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const registry = new LayoutRegistry();
    registry.register('custom', ColumnLayout);
    registry.register('custom', RowLayout);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(registry.get('custom')).toBe(RowLayout);
  });

  it('exports a shared registry instance', () => {
    expect(layoutRegistry).toBeInstanceOf(LayoutRegistry);
  });
});

describe('default layouts', () => {
  it('renders the projected template with the configured gap', () => {
    const fixture = TestBed.createComponent(LayoutHost);
    fixture.detectChanges();

    const column: HTMLElement = fixture.nativeElement.querySelector(
      'dfk-column-layout > div',
    );
    expect(column.style.flexDirection).toBe('column');
    expect(column.style.gap).toBe('20px');
    expect(column.querySelector('.child')).not.toBeNull();
  });

  it('defaults the gap to 12px', () => {
    const fixture = TestBed.createComponent(LayoutHost);
    fixture.detectChanges();

    const row: HTMLElement = fixture.nativeElement.querySelector(
      'dfk-row-layout > div',
    );
    expect(row.style.flexDirection).toBe('row');
    expect(row.style.gap).toBe('12px');
  });

  it('renders the grid layout with the configured column count', () => {
    const fixture = TestBed.createComponent(LayoutHost);
    fixture.detectChanges();

    const grid: HTMLElement = fixture.nativeElement.querySelector(
      'dfk-grid-layout > div',
    );
    expect(grid.style.display).toBe('grid');
    expect(grid.style.gridTemplateColumns).toBe('repeat(3, 1fr)');
    expect(grid.style.gap).toBe('12px');
  });

  it('defaults the grid columns to 2', () => {
    const fixture = TestBed.createComponent(GridDefaultsHost);
    fixture.detectChanges();

    const grid: HTMLElement = fixture.nativeElement.querySelector(
      'dfk-grid-layout > div',
    );
    expect(grid.style.gridTemplateColumns).toBe('repeat(2, 1fr)');
  });
});
