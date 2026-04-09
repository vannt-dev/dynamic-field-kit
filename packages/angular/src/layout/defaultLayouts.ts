import { CommonModule } from '@angular/common';
import { Component, Input, TemplateRef } from '@angular/core';
import { layoutRegistry } from './layoutRegistry';

@Component({
  selector: 'dfk-column-layout',
  standalone: true,
  imports: [CommonModule],
  template: `<div
    [style.display]="'flex'"
    [style.flexDirection]="'column'"
    [style.gap]="gap + 'px'"
  >
    <ng-container *ngTemplateOutlet="template"></ng-container>
  </div>`,
})
export class ColumnLayout {
  @Input() config?: { gap?: number };
  @Input() template!: TemplateRef<unknown>;
  get gap() {
    return this.config?.gap ?? 12;
  }
}

@Component({
  selector: 'dfk-row-layout',
  standalone: true,
  imports: [CommonModule],
  template: `<div
    [style.display]="'flex'"
    [style.flexDirection]="'row'"
    [style.gap]="gap + 'px'"
  >
    <ng-container *ngTemplateOutlet="template"></ng-container>
  </div>`,
})
export class RowLayout {
  @Input() config?: { gap?: number };
  @Input() template!: TemplateRef<unknown>;
  get gap() {
    return this.config?.gap ?? 12;
  }
}

@Component({
  selector: 'dfk-grid-layout',
  standalone: true,
  imports: [CommonModule],
  template: `<div
    [style.display]="'grid'"
    [style.gridTemplateColumns]="'repeat(' + columns + ', 1fr)'"
    [style.gap]="gap + 'px'"
  >
    <ng-container *ngTemplateOutlet="template"></ng-container>
  </div>`,
})
export class GridLayout {
  @Input() config?: { columns?: number; gap?: number };
  @Input() template!: TemplateRef<unknown>;
  get columns() {
    return this.config?.columns ?? 2;
  }
  get gap() {
    return this.config?.gap ?? 12;
  }
}

layoutRegistry.register('column', ColumnLayout);
layoutRegistry.register('row', RowLayout);
layoutRegistry.register('grid', GridLayout);
