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
  resolveDisabled,
  resolveReadOnly,
  validateField,
  validateFields,
  FieldDescription,
  Properties,
} from '@dynamic-field-kit/core';
import type { ValidationResult } from '@dynamic-field-kit/core';
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
      <ng-container *ngFor="let field of visibleFields; trackBy: trackByFn">
        <dfk-field-input
          *ngIf="!field.fields"
          [fieldDescription]="field"
          [value]="data[field.name]"
          [disabled]="getDisabled(field)"
          [readOnly]="getReadOnly(field)"
          [error]="getError(field)"
          (onValueChangeField)="onFieldChange($event)"
        ></dfk-field-input>

        <div *ngIf="field.fields" [class]="field.className">
          <div *ngIf="field.label">{{ field.label }}</div>
          <div
            *ngFor="
              let item of getItems(field);
              let i = index;
              trackBy: groupTrackBy(field)
            "
            style="display: flex; align-items: flex-start; gap: 8px;"
          >
            <div style="flex: 1">
              <dfk-multi-field-input
                [fieldDescriptions]="field.fields"
                [properties]="item"
                [rootData]="rootData ?? data"
                (onChange)="onGroupItemChange(field, i, $event)"
              ></dfk-multi-field-input>
            </div>
            <button
              type="button"
              [attr.aria-label]="
                (field.removeLabel || 'Remove') +
                ' ' +
                (field.label || field.name) +
                ' ' +
                (i + 1)
              "
              (click)="onGroupItemRemove(field, i)"
              [disabled]="!canRemoveItem(field)"
            >
              {{ field.removeLabel || 'Remove' }}
            </button>
          </div>
          <button
            type="button"
            [attr.aria-label]="
              (field.addLabel || 'Add') + ' ' + (field.label || field.name)
            "
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
  @Output() validityChange = new EventEmitter<ValidationResult>();
  @Input() layout: LayoutConfig = 'column';
  // Top-level form data, threaded down through repeatable groups so a nested
  // field's appearCondition/computeValue can read the root form. Omitted at
  // the top level, where the form's own data is the root.
  @Input() rootData?: Properties;

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

  private groupTrackByCache = new WeakMap<
    FieldDescription,
    (index: number, item: Properties) => unknown
  >();

  // Returns a stable trackBy per group field: item[keyField] when configured,
  // else the index. Cached by field reference so the template hands Angular the
  // same function each change-detection pass.
  groupTrackBy(
    field: FieldDescription
  ): (index: number, item: Properties) => unknown {
    let fn = this.groupTrackByCache.get(field);
    if (!fn) {
      fn = (index: number, item: Properties) =>
        field.keyField ? item[field.keyField] ?? index : index;
      this.groupTrackByCache.set(field, fn);
    }
    return fn;
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
      this.data = applyComputedValues(
        this.fieldDescriptions,
        { ...this.properties },
        this.rootData
      );
    }
    this.updateVisibleFields();
    this.validityChange.emit(
      validateFields(this.fieldDescriptions, this.data, this.rootData)
    );
  }

  private updateVisibleFields() {
    const root = this.rootData ?? this.data;
    this.visibleFields = this.fieldDescriptions.filter(
      (f) => !f.appearCondition || f.appearCondition(this.data, root)
    );
  }

  onFieldChange(event: { value: unknown; key: string }): void {
    this.commitData({ ...this.data, [event.key]: event.value });
  }

  getItems(field: FieldDescription): Properties[] {
    const value = this.data[field.name];
    return Array.isArray(value) ? (value as Properties[]) : [];
  }

  getDisabled(field: FieldDescription): boolean {
    return resolveDisabled(field, this.data, this.rootData);
  }

  getReadOnly(field: FieldDescription): boolean {
    return resolveReadOnly(field, this.data, this.rootData);
  }

  getError(field: FieldDescription): string[] | undefined {
    if (this.getDisabled(field)) {
      return undefined;
    }
    const errors = validateField(
      field,
      this.data[field.name],
      this.data,
      this.rootData
    );
    return errors.length > 0 ? errors : undefined;
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
    this.data = applyComputedValues(
      this.fieldDescriptions,
      nextData,
      this.rootData
    );
    this.updateVisibleFields();
    this.onChange.emit(this.data);
    this.validityChange.emit(
      validateFields(this.fieldDescriptions, this.data, this.rootData)
    );
    this.cdr.markForCheck();
  }
}
