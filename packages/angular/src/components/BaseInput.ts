import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { FieldRendererProps } from '@dynamic-field-kit/core';

@Component({
  template: ''
})
export abstract class BaseInputComponent {
  @Input() value?: any;
  @Input() label?: string;
  @Input() placeholder?: string;
  @Input() required?: boolean;
  @Input() disabled?: boolean;
  @Input() options?: any[];
  @Input() className?: string;
  @Input() description?: string;
  @Input() errorMessage?: string;
  @Input() acceptFile?: string;
  @Input() maxLength?: number;
  @Input() minNumber?: number;
  @Input() maxNumber?: number;
  // Add more from mplis as needed

  @Output() valueChange = new EventEmitter<any>();

  constructor(protected cdr: ChangeDetectorRef) {}
}

