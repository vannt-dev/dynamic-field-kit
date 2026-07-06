import { NgClass, NgFor, NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  applyComputedValues,
  canAddGroupItem,
  canRemoveGroupItem,
  createGroupItem,
  FieldDescription,
  Properties,
} from '@dynamic-field-kit/core';
import { BaseLayoutConfig, LayoutConfig } from '../types/layout';
import { FieldInput } from './FieldInput';

const DEFAULT_BREAKPOINT = 768;

@Component({
  selector: 'dfk-multi-field-input',
  standalone: true,
  // Repeatable field groups render a nested <dfk-multi-field-input> per item
  // (see the #groupTpl below), so this component imports itself. That's the
  // supported way to give a standalone component recursive template usage
  // without a cross-file circular import between FieldInput and a separate
  // group component (whose `imports` arrays are evaluated eagerly at module
  // load time and would deadlock on an actual circular module reference).
  imports: [NgClass, NgFor, NgIf, FieldInput, MultiFieldInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="p-4 border rounded-lg bg-gray-50"
      [ngClass]="{
        'flex flex-col': resolvedLayoutType === 'column',
        'flex flex-row': resolvedLayoutType === 'row',
        grid: resolvedLayoutType === 'grid'
      }"
      [style.gap.px]="gap"
      [style.gridTemplateColumns]="
        resolvedLayoutType === 'grid' ? 'repeat(' + columns + ', 1fr)' : null
      "
    >
      <ng-container
        *ngFor="let field of visibleFields; trackBy: trackByFn"
      >
        <dfk-field-input
          *ngIf="!field.fields"
          [fieldDescription]="field"
          [value]="data[field.name]"
          (onValueChangeField)="onFieldChange($event)"
        ></dfk-field-input>

        <div *ngIf="field.fields" [class]="field.className">
          <div *ngIf="field.label">{{ field.label }}</div>
          <div
            *ngFor="let item of getItems(field); let i = index; trackBy: trackByIndex"
            style="display: flex; align-items: flex-start; gap: 8px;"
          >
            <div style="flex: 1">
              <dfk-multi-field-input
                [fieldDescriptions]="field.fields"
                [properties]="item"
                (onChange)="onGroupItemChange(field, i, $event)"
              ></dfk-multi-field-input>
            </div>
            <button
              type="button"
              (click)="onGroupItemRemove(field, i)"
              [disabled]="!canRemoveItem(field)"
            >
              {{ field.removeLabel || 'Remove' }}
            </button>
          </div>
          <button
            type="button"
            (click)="onGroupItemAdd(field)"
            [disabled]="!canAddItem(field)"
          >
            {{ field.addLabel || 'Add' }}
          </button>
        </div>
      </ng-container>
    </div>
  `,
})
export class MultiFieldInput implements OnInit, OnChanges {
  @Input() fieldDescriptions: FieldDescription[] = [];
  @Input() properties?: Properties;
  @Output() onChange = new EventEmitter<Properties>();
  @Input() layout: LayoutConfig = 'column';

  data: Properties = {};
  visibleFields: FieldDescription[] = [];
  private isMobile = false;

  constructor(private cdr: ChangeDetectorRef) {}

  @HostListener('window:resize')
  onWindowResize(): void {
    const wasMobile = this.isMobile;
    this.updateIsMobile();
    if (wasMobile !== this.isMobile) {
      this.cdr.markForCheck();
    }
  }

  get resolvedLayout(): BaseLayoutConfig {
    if (typeof this.layout === 'object' && this.layout.type === 'responsive') {
      return this.isMobile ? this.layout.mobile : this.layout.desktop;
    }
    return this.layout as BaseLayoutConfig;
  }

  get resolvedLayoutType(): string {
    const resolved = this.resolvedLayout;
    return typeof resolved === 'string' ? resolved : resolved.type;
  }

  get gap(): number {
    const resolved = this.resolvedLayout;
    if (typeof resolved === 'object' && resolved.gap !== undefined) {
      return resolved.gap;
    }
    return 12;
  }

  get columns(): number {
    const resolved = this.resolvedLayout;
    if (typeof resolved === 'object' && resolved.type === 'grid') {
      return resolved.columns ?? 2;
    }
    return 2;
  }

  trackByFn(index: number, field: FieldDescription): string | number {
    return field.name || index;
  }

  trackByIndex(index: number): number {
    return index;
  }

  ngOnInit() {
    this.updateIsMobile();
    this.init();
  }

  ngOnChanges(_changes: SimpleChanges) {
    this.init();
  }

  private updateIsMobile(): void {
    const breakpoint =
      typeof this.layout === 'object' && this.layout.type === 'responsive'
        ? this.layout.breakpoint ?? DEFAULT_BREAKPOINT
        : DEFAULT_BREAKPOINT;
    this.isMobile =
      typeof window !== 'undefined' && window.innerWidth < breakpoint;
  }

  private init() {
    if (this.properties) {
      this.data = applyComputedValues(this.fieldDescriptions, {
        ...this.properties,
      });
    }
    this.updateVisibleFields();
  }

  private updateVisibleFields() {
    this.visibleFields = this.fieldDescriptions.filter(
      (f) => !f.appearCondition || f.appearCondition(this.data)
    );
  }

  onFieldChange(event: { value: unknown; key: string }): void {
    this.commitData({ ...this.data, [event.key]: event.value });
  }

  getItems(field: FieldDescription): Properties[] {
    const value = this.data[field.name];
    return Array.isArray(value) ? (value as Properties[]) : [];
  }

  canAddItem(field: FieldDescription): boolean {
    return canAddGroupItem(field, this.getItems(field));
  }

  canRemoveItem(field: FieldDescription): boolean {
    return canRemoveGroupItem(field, this.getItems(field));
  }

  onGroupItemAdd(field: FieldDescription): void {
    if (!this.canAddItem(field)) {
      return;
    }
    const items = this.getItems(field);
    this.commitData({
      ...this.data,
      [field.name]: [...items, createGroupItem(field)],
    });
  }

  onGroupItemRemove(field: FieldDescription, index: number): void {
    if (!this.canRemoveItem(field)) {
      return;
    }
    const items = this.getItems(field).filter((_, i) => i !== index);
    this.commitData({ ...this.data, [field.name]: items });
  }

  onGroupItemChange(
    field: FieldDescription,
    index: number,
    next: Properties
  ): void {
    const items = this.getItems(field).slice();
    items[index] = next;
    this.commitData({ ...this.data, [field.name]: items });
  }

  private commitData(nextData: Properties): void {
    this.data = applyComputedValues(this.fieldDescriptions, nextData);
    this.updateVisibleFields();
    this.onChange.emit(this.data);
    this.cdr.markForCheck();
  }
}
