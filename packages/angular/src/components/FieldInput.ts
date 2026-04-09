import { NgIf } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FieldDescription, Properties } from '@dynamic-field-kit/core';
import { DynamicInput } from './DynamicInput';

@Component({
  selector: 'dfk-field-input',
  standalone: true,
  imports: [NgIf, DynamicInput],
  template: `
    <dfk-dynamic-input
      *ngIf="shouldRender"
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
export class FieldInput implements OnChanges {
  @Input() fieldDescription?: FieldDescription;
  @Input() renderInfos?: Properties;
  @Output() onValueChangeField = new EventEmitter<{
    value: unknown;
    key: string;
  }>();

  shouldRender = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(_changes: SimpleChanges): void {
    this.shouldRender = !!(this.fieldDescription && this.renderInfos);
    this.cdr.markForCheck();
  }

  getFieldValue(): unknown {
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
