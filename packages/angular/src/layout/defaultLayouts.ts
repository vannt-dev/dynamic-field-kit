import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'dfk-column-layout',
  standalone: true,
  imports: [CommonModule],
  template: `<div
    style="display:flex;flex-direction:column;gap:var(--dfk-gap,12px)"
  >
    <ng-content></ng-content>
  </div>`,
})
export class ColumnLayout {}

@Component({
  selector: 'dfk-row-layout',
  standalone: true,
  imports: [CommonModule],
  template: `<div
    style="display:flex;flex-direction:row;gap:var(--dfk-gap,12px)"
  >
    <ng-content></ng-content>
  </div>`,
})
export class RowLayout {}

@Component({
  selector: 'dfk-grid-layout',
  standalone: true,
  imports: [CommonModule],
  template: `<div
    style="display:grid;grid-template-columns:repeat(var(--dfk-columns,2),1fr);gap:var(--dfk-gap,12px)"
  >
    <ng-content></ng-content>
  </div>`,
})
export class GridLayout {}
