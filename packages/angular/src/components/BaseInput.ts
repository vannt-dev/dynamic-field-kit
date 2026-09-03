import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';

// Mirrors the framework-agnostic FieldRendererProps (core's
// FIELD_RENDERER_PROP_KEYS). Domain-specific inputs (acceptFile, maxLength,
// ...) intentionally live on the individual renderer, not here - pass them per
// field via FieldDescription.props instead.
export interface FieldInputProps {
  value?: unknown;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  touched?: boolean;
  dirty?: boolean;
  error?: string | string[];
  options?: unknown[];
  className?: string;
  description?: string;
  id?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  ariaRequired?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  accept?: string;
  multiple?: boolean;
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
  /**
   * Whether the field has been blurred (or marked touched by the form store).
   * Renderers gate error display on this to avoid shouting at a user who has
   * not reached the field yet.
   */
  @Input() touched?: boolean;
  /** Whether the value differs from the one the form opened with. */
  @Input() dirty?: boolean;
  @Input() error?: string | string[];
  @Input() options?: unknown[];
  @Input() className?: string;
  @Input() description?: string;
  @Input() id?: string;
  @Input() ariaInvalid?: boolean;
  @Input() ariaDescribedBy?: string;
  @Input() ariaRequired?: boolean;
  @Input() min?: number | string;
  @Input() max?: number | string;
  @Input() step?: number | string;
  @Input() accept?: string;
  @Input() multiple?: boolean;

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
