import { NgClass, NgFor } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FieldDescription, Properties } from '@dynamic-field-kit/core';
import { LayoutConfig } from '../types/layout';
import { FieldInput } from './FieldInput';

@Component({
  selector: 'dfk-multi-field-input',
  standalone: true,
  imports: [NgClass, NgFor, FieldInput],
  template: `
    <div
      class="flex flex-col gap-3 p-4 border rounded-lg bg-gray-50"
      [ngClass]="{
        'flex-row gap-3': layout === 'row',
        'grid grid-cols-2 gap-3': layout === 'grid'
      }"
    >
      <dfk-field-input
        *ngFor="let field of visibleFields; trackBy: trackByFn"
        [fieldDescription]="field"
        [renderInfos]="data"
        (onValueChangeField)="onFieldChange($event)"
      ></dfk-field-input>
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

  constructor(private cdr: ChangeDetectorRef) {}

  trackByFn(index: number, field: FieldDescription): string | number {
    return field.name || index;
  }

  ngOnInit() {
    this.init();
  }

  ngOnChanges(_changes: SimpleChanges) {
    this.init();
  }

  private init() {
    if (this.properties) {
      this.data = { ...this.properties };
    }
    this.updateVisibleFields();
  }

  private updateVisibleFields() {
    this.visibleFields = this.fieldDescriptions.filter(
      (f) => !f.appearCondition || f.appearCondition(this.data)
    );
  }

  onFieldChange(event: { value: unknown; key: string }): void {
    this.data = { ...this.data, [event.key]: event.value };
    this.updateVisibleFields();
    this.onChange.emit(this.data);
    this.cdr.markForCheck();
  }
}
