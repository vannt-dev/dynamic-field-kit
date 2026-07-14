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
      [value]="value"
      [label]="fieldDescription!.label"
      [placeholder]="fieldDescription!.placeholder"
      [required]="fieldDescription!.required"
      [description]="$any(fieldDescription!.description)"
      [options]="fieldDescription!.options"
      [className]="fieldDescription!.className"
      (valueChange)="
        onValueChangeField.emit({ value: $event, key: fieldDescription!.name })
      "
      [disabled]="disabled"
      [readOnly]="readOnly"
      [error]="$any(error)"
      [extraProps]="fieldDescription!.props"
    ></dfk-dynamic-input>
  `,
})
export class FieldInput implements OnChanges {
  @Input() fieldDescription?: FieldDescription;
  @Input() value?: unknown;
  @Input() disabled?: boolean;
  @Input() readOnly?: boolean;
  @Input() error?: string | string[];
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
}
