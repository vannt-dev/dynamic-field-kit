import { NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FieldDescription } from '@dynamic-field-kit/core';
import { DynamicInput } from './DynamicInput';

@Component({
  selector: 'dfk-field-input',
  standalone: true,
  imports: [NgIf, DynamicInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  @Input() value?: unknown;
  @Output() onValueChangeField = new EventEmitter<{
    value: unknown;
    key: string;
  }>();

  shouldRender = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(_changes: SimpleChanges): void {
    this.shouldRender = !!this.fieldDescription;
    this.cdr.markForCheck();
  }

  getFieldValue(): unknown {
    if (!this.fieldDescription) {
      return undefined;
    }

    if (this.value === undefined && this.fieldDescription.type === 'text') {
      return '';
    }

    return this.value;
  }
}
