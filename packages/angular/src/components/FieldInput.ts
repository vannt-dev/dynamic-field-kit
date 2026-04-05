import { NgIf } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FieldDescription, Properties } from '@dynamic-field-kit/core';
import { DynamicInput } from './DynamicInput';

@Component({
  selector: 'dfk-field-input',
  standalone: true,
  imports: [NgIf, DynamicInput],
  template: `
    <dfk-dynamic-input
      *ngIf="fieldDescription && renderInfos"
      [type]="fieldDescription!.type"
      [value]="getFieldValue()"
      [label]="fieldDescription!.label"
      [placeholder]="fieldDescription!.placeholder"
      [required]="fieldDescription!.required"
      [description]="$any(fieldDescription!.description)"
      [options]="fieldDescription!.options"
      [className]="fieldDescription!.className"
      (valueChange)="
        onValueChangeField.emit({ value: $event, key: fieldDescription!.name })
      "
      [disabled]="false"
      [errorMessage]="''"
    ></dfk-dynamic-input>
  `,
})
export class FieldInput {
  @Input() fieldDescription?: FieldDescription;
  @Input() renderInfos?: Properties;
  @Output() onValueChangeField = new EventEmitter<{
    value: any;
    key: string;
  }>();

  getFieldValue() {
    if (!this.fieldDescription || !this.renderInfos) {
      return undefined;
    }

    const value = this.renderInfos[this.fieldDescription.name];
    if (value === undefined && this.fieldDescription.type === 'text') {
      return '';
    }

    return value;
  }
}
