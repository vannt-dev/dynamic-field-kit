import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';

export interface FieldInputProps {
  value?: unknown;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: unknown[];
  className?: string;
  description?: string;
  errorMessage?: string;
  acceptFile?: string;
  maxLength?: number;
  minNumber?: number;
  maxNumber?: number;
}

@Component({
  template: '',
})
export abstract class BaseInputComponent implements OnChanges {
  @Input() value?: unknown;
  @Input() label?: string;
  @Input() placeholder?: string;
  @Input() required?: boolean;
  @Input() disabled?: boolean;
  @Input() options?: unknown[];
  @Input() className?: string;
  @Input() description?: string;
  @Input() errorMessage?: string;
  @Input() acceptFile?: string;
  @Input() maxLength?: number;
  @Input() minNumber?: number;
  @Input() maxNumber?: number;

  @Output() valueChange = new EventEmitter<unknown>();

  constructor(protected cdr: ChangeDetectorRef) {}

  ngOnChanges(_changes: SimpleChanges): void {
    this.detectChanges();
  }

  protected detectChanges(): void {
    this.cdr.markForCheck();
  }

  protected hasChanges(changes: SimpleChanges, prop: string): boolean {
    return changes[prop] !== undefined;
  }
}
