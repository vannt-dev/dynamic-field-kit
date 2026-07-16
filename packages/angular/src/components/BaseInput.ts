import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';

// Mirrors the framework-agnostic FieldRendererProps. Domain-specific inputs
// (acceptFile, maxLength, ...) intentionally live on the individual renderer,
// not here - pass them per field via FieldDescription.props instead.
export interface FieldInputProps {
  value?: unknown;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string | string[];
  options?: unknown[];
  className?: string;
  description?: string;
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
  @Input() readOnly?: boolean;
  @Input() error?: string | string[];
  @Input() options?: unknown[];
  @Input() className?: string;
  @Input() description?: string;

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
