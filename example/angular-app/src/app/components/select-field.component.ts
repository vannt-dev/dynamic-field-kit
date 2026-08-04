import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-select-field',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="field-container"
      [class]="className"
      style="margin-bottom: 12px;"
    >
      <label
        *ngIf="label"
        style="display: block; margin-bottom: 4px; font-weight: 500;"
      >
        {{ label }}<span *ngIf="required" style="color: red;"> *</span>
      </label>
      <select
        [value]="value ?? ''"
        [disabled]="disabled || readOnly"
        (change)="onChange($event)"
        (blur)="onBlur.emit()"
        [style.background-color]="disabled ? '#f0f0f0' : '#fff'"
        [style.border-color]="error ? '#ef4444' : '#ccc'"
        style="
          padding: 8px;
          margin-bottom: 4px;
          border: 1px solid #ccc;
          border-radius: 4px;
          display: block;
          width: 100%;
          box-sizing: border-box;
        "
      >
        <option value="">-- Chọn --</option>
        <option *ngFor="let opt of options" [value]="getOptValue(opt)">
          {{ getOptLabel(opt) }}
        </option>
      </select>
      <span
        *ngIf="error"
        style="color: #ef4444; font-size: 12px; display: block;"
      >
        {{ isArray(error) ? error.join(', ') : error }}
      </span>
    </div>
  `,
})
export class SelectFieldComponent {
  @Input() value?: any;
  @Input() options?: any[];
  @Input() required?: boolean;
  @Input() disabled?: boolean;
  @Input() readOnly?: boolean;
  @Input() error?: any;
  @Input() label?: string;
  @Input() className?: string;
  @Output() valueChange = new EventEmitter<any>();
  @Output() onValueChange = new EventEmitter<any>();
  @Output() onBlur = new EventEmitter<void>();

  isArray(val: any): boolean {
    return Array.isArray(val);
  }

  getOptValue(opt: any): string {
    return opt?.value ?? opt;
  }

  getOptLabel(opt: any): string {
    return opt?.label ?? opt?.value ?? opt;
  }

  onChange(e: any) {
    const value = e.target.value;
    this.valueChange.emit(value);
    this.onValueChange.emit(value);
  }
}
