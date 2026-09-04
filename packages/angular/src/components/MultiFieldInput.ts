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
  indexGroupPathMap,
  validateFields,
  FieldDescription,
  Properties,
} from '@dynamic-field-kit/core';
import type { ValidationResult } from '@dynamic-field-kit/core';
import { BaseLayoutConfig, LayoutConfig } from '../types/layout';
import { FieldInput } from './FieldInput';

const DEFAULT_BREAKPOINT = 768;

// Per-instance id counter, so two forms rendering the same field name emit
// different DOM ids.
/**
 * Shared empty maps. A fresh object literal in a template binding is a new
 * identity on every change detection pass, which defeats the per-item caching
 * below and trips dev-mode checkNoChanges (NG0100).
 */
const EMPTY_ERRORS: Record<string, string[]> = Object.freeze({});
const EMPTY_TOUCHED: Record<string, boolean> = Object.freeze({});

let instanceCounter = 0;
function nextInstanceId(): number {
  instanceCounter += 1;
  return instanceCounter;
}

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
        grid: resolvedLayoutType === 'grid',
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
          [data]="data"
          [rootData]="rootData"
          [idPrefix]="effectiveIdPrefix"
          [touched]="isTouched(field.name)"
          [dirty]="isFieldDirty(field.name)"
          [error]="fieldErrors(field.name)"
          [validationControlled]="errors !== undefined"
          (onValueChangeField)="onFieldChange($event)"
          (onBlurField)="handleBlurField($event)"
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
                [errors]="errorsForItem(field.name, i)"
                [touched]="touchedForItem(field.name, i)"
                (onBlurField)="handleGroupBlur(field.name, i, $event)"
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
  /**
   * The values per-field `dirty` is measured against. Defaults to the first
   * non-`undefined` `properties` this component sees. This adapter has no
   * `form` shorthand, so pass `store.baselineValues()` here to keep `dirty`
   * correct across `store.reset(newValues)`.
   */
  @Input() initialProperties?: Properties;
  @Output() onChange = new EventEmitter<Properties>();
  @Output() validityChange = new EventEmitter<ValidationResult>();
  /**
   * Emits a field's name when it loses focus. Touched state is tracked
   * internally either way; this is the hook for driving an external form store
   * - pass `createDynamicFormStore`'s `handleBlur` to get its `touched` map and
   * `validateOnBlur` behaviour.
   */
  @Output() onBlurField = new EventEmitter<string>();
  /**
   * Controlled touched map. When bound it is the single source of truth and
   * the internal tracker is bypassed, so `createDynamicFormStore`'s `touched`
   * signal (updated by setFieldTouched/touchAll/handleSubmit, cleared by
   * reset) is what renderers actually see. Leave it unbound to keep the
   * internal, blur-only tracker.
   */
  @Input() touched?: Record<string, boolean>;
  /** Controlled error map; bind the form store's `errors()` signal here. */
  @Input() errors?: Record<string, string[]>;
  /** Emits the next touched map whenever a field is blurred. */
  @Output() touchedChange = new EventEmitter<Record<string, boolean>>();
  /**
   * Namespace for generated field ids: a field renders with
   * `${idPrefix}-${name}`. Defaults to a value unique to this component
   * instance, so two forms containing the same field name do not emit
   * duplicate DOM ids. Bind a fixed string to pin ids (`idPrefix="dfk-field"`
   * restores the pre-1.6 ids), or set `FieldDescription.id` per field.
   */
  @Input() idPrefix?: string;

  private touchedFields: Record<string, boolean> = {};
  // Unique per component instance. Angular has no useId equivalent, and this
  // component is client-rendered by the time ids matter, so a module counter
  // is enough.
  private readonly instanceId = nextInstanceId();
  private firstSeenProperties: Properties = {};
  private indexedErrorsSource?: Record<string, string[]>;
  private indexedErrors = new Map<
    string,
    Record<number, Record<string, string[]>> | undefined
  >();
  private indexedTouchedSource?: Record<string, boolean>;
  private indexedTouched = new Map<
    string,
    Record<number, Record<string, boolean>> | undefined
  >();

  get effectiveIdPrefix(): string {
    return this.idPrefix ?? `dfk-${this.instanceId}`;
  }

  /** The touched map in effect: the controlled input, else the internal one. */
  private get effectiveTouched(): Record<string, boolean> {
    return this.touched ?? this.touchedFields;
  }

  handleBlurField(fieldName: string): void {
    if (this.touched === undefined) {
      this.touchedFields = { ...this.touchedFields, [fieldName]: true };
    }
    this.touchedChange.emit({ ...this.effectiveTouched, [fieldName]: true });
    this.onBlurField.emit(fieldName);
    this.cdr.markForCheck();
  }

  /** Whether this field has been blurred at least once. */
  isTouched(fieldName: string): boolean {
    return Boolean(this.effectiveTouched[fieldName]);
  }

  /** Whether this field's value differs from the one the form opened with. */
  isFieldDirty(fieldName: string): boolean {
    const baseline = this.initialProperties ?? this.firstSeenProperties;
    return !Object.is(this.data[fieldName], baseline[fieldName]);
  }

  fieldErrors(fieldName: string): string[] | undefined {
    return this.errors?.[fieldName];
  }

  errorsForItem(
    fieldName: string,
    index: number,
  ): Record<string, string[]> | undefined {
    if (this.indexedErrorsSource !== this.errors) {
      this.indexedErrorsSource = this.errors;
      this.indexedErrors.clear();
    }
    if (!this.indexedErrors.has(fieldName)) {
      this.indexedErrors.set(
        fieldName,
        indexGroupPathMap(this.errors, fieldName),
      );
    }
    // An item with no errors still gets a map when the parent has one, so a
    // nested input is never handed `undefined` for a controlled error map.
    return this.errors === undefined
      ? undefined
      : (this.indexedErrors.get(fieldName)?.[index] ?? EMPTY_ERRORS);
  }

  touchedForItem(fieldName: string, index: number): Record<string, boolean> {
    const current = this.effectiveTouched;
    if (this.indexedTouchedSource !== current) {
      this.indexedTouchedSource = current;
      this.indexedTouched.clear();
    }
    if (!this.indexedTouched.has(fieldName)) {
      this.indexedTouched.set(fieldName, indexGroupPathMap(current, fieldName));
    }
    // A fresh {} here would be a new binding identity on every change
    // detection pass, re-running the nested input's ngOnChanges each time and
    // risking NG0100 in dev mode.
    return this.indexedTouched.get(fieldName)?.[index] ?? EMPTY_TOUCHED;
  }

  handleGroupBlur(fieldName: string, index: number, key: string): void {
    this.handleBlurField(`${fieldName}[${index}].${key}`);
  }

  /**
   * Clears the internally tracked touched state. Only meaningful in
   * uncontrolled mode - when `touched` is bound, resetting the form store
   * (e.g. `createDynamicFormStore().reset()`) already clears it.
   */
  resetTouched(): void {
    this.touchedFields = {};
    this.touchedChange.emit(this.effectiveTouched);
    this.cdr.markForCheck();
  }

  setFieldTouched(fieldName: string, isTouched = true): void {
    if (this.touched === undefined) {
      this.touchedFields = { ...this.touchedFields, [fieldName]: isTouched };
    }
    this.touchedChange.emit({
      ...this.effectiveTouched,
      [fieldName]: isTouched,
    });
    this.cdr.markForCheck();
  }
  @Input() layout: LayoutConfig = 'column';
  // Top-level form data, threaded down through repeatable groups so a nested
  // field's appearCondition/computeValue can read the root form. Omitted at
  // the top level, where the form's own data is the root.
  @Input() rootData?: Properties;

  data: Properties = {};
  visibleFields: FieldDescription[] = [];
  private initialised = false;
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
    field: FieldDescription,
  ): (index: number, item: Properties) => unknown {
    let fn = this.groupTrackByCache.get(field);
    if (!fn) {
      fn = (index: number, item: Properties) =>
        field.keyField ? (item[field.keyField] ?? index) : index;
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
        ? (this.layout.breakpoint ?? DEFAULT_BREAKPOINT)
        : DEFAULT_BREAKPOINT;
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function'
    ) {
      this.isMobile = window.matchMedia(
        `(max-width: ${breakpoint - 1}px)`,
      ).matches;
    } else {
      this.isMobile =
        typeof window !== 'undefined' && window.innerWidth < breakpoint;
    }
  }

  private init() {
    if (this.properties) {
      this.data = applyComputedValues(
        this.fieldDescriptions,
        { ...this.properties },
        this.rootData,
      );
      // Baseline for the `dirty` flag: the values the form opened with, not
      // whatever `properties` happens to hold after later edits.
      if (!this.initialised) {
        this.firstSeenProperties = { ...this.properties };
        this.initialised = true;
      }
    }
    this.updateVisibleFields();
    this.validityChange.emit(
      validateFields(this.fieldDescriptions, this.data, this.rootData),
    );
  }

  private updateVisibleFields() {
    const root = this.rootData ?? this.data;
    this.visibleFields = this.fieldDescriptions.filter(
      (f) => !f.appearCondition || f.appearCondition(this.data, root),
    );
  }

  onFieldChange(event: { value: unknown; key: string }): void {
    this.commitData({ ...this.data, [event.key]: event.value });
  }

  getItems(field: FieldDescription): Properties[] {
    const value = this.data[field.name];
    return Array.isArray(value) ? (value as Properties[]) : [];
  }

  // The per-field getResolvedOptions/getDisabled/getReadOnly/getError helpers
  // that used to live here are gone: FieldInput now resolves all of it through
  // core's shared buildFieldRendererProps. Keeping a second copy of that logic
  // beside the shared one is exactly how the adapters drifted apart in the
  // first place.

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
    next: Properties,
  ): void {
    const items = this.getItems(field).slice();
    items[index] = next;
    this.commitData({ ...this.data, [field.name]: items });
  }

  private commitData(nextData: Properties): void {
    this.data = applyComputedValues(
      this.fieldDescriptions,
      nextData,
      this.rootData,
    );
    this.updateVisibleFields();
    this.onChange.emit(this.data);
    this.validityChange.emit(
      validateFields(this.fieldDescriptions, this.data, this.rootData),
    );
    this.cdr.markForCheck();
  }
}
