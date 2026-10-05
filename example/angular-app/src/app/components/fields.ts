import { CommonModule } from '@angular/common';
import {
  Component,
  Directive,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { t } from '../../../../shared/i18n';

// The components this app draws its fields with. The Angular adapter ships no
// renderers of its own, so an application registers one for every type it
// uses - these are plain HTML styled by `example/shared/demo.css`.

type Option = { label?: string; value: string | number } | string;

/** The inputs and outputs the kit binds on whatever component it renders. */
@Directive()
export abstract class DemoFieldBase {
  // Templates reach the translation helper through the component.
  t = t;

  @Input() value?: any;
  @Input() label?: string;
  @Input() placeholder?: string;
  @Input() disabled?: boolean;
  @Input() readOnly?: boolean;
  @Input() touched?: boolean;
  @Input() error?: string | string[];
  @Input() options?: Option[];
  @Input() min?: number | string;
  @Input() max?: number | string;
  @Input() step?: number | string;
  @Input() id?: string;

  @Output() valueChange = new EventEmitter<any>();
  @Output() onValueChange = new EventEmitter<any>();
  @Output() onBlur = new EventEmitter<void>();

  /** An error is shown once the field has been visited, not while it is pristine. */
  get shownError(): string | undefined {
    if (!this.touched || !this.error) return undefined;
    return Array.isArray(this.error) ? this.error.join(', ') : this.error;
  }

  emit(value: unknown) {
    this.valueChange.emit(value);
    this.onValueChange.emit(value);
  }

  optionValue(opt: Option) {
    return typeof opt === 'string' ? opt : opt.value;
  }

  optionLabel(opt: Option) {
    return typeof opt === 'string' ? opt : (opt.label ?? String(opt.value));
  }
}

const INPUT_TEMPLATE = `
  <label class="field" [class.field--invalid]="shownError">
    <span *ngIf="label" class="field__label">{{ label }}</span>
    <input
      class="field__control"
      [type]="type"
      [value]="value ?? ''"
      [placeholder]="placeholder || ''"
      [disabled]="disabled"
      [readOnly]="readOnly"
      (input)="onInput($event)"
      (blur)="onBlur.emit()"
    />
    <span *ngIf="shownError" class="field__error">{{ shownError }}</span>
  </label>
`;

@Directive()
abstract class InputFieldBase extends DemoFieldBase {
  abstract type: string;

  onInput(event: Event) {
    const raw = (event.target as HTMLInputElement).value;
    this.emit(
      this.type === 'number' ? (raw === '' ? undefined : Number(raw)) : raw,
    );
  }
}

@Component({
  selector: 'app-text-field',
  standalone: true,
  imports: [CommonModule],
  template: INPUT_TEMPLATE,
})
export class TextFieldComponent extends InputFieldBase {
  type = 'text';
}

@Component({
  selector: 'app-email-field',
  standalone: true,
  imports: [CommonModule],
  template: INPUT_TEMPLATE,
})
export class EmailFieldComponent extends InputFieldBase {
  type = 'email';
}

@Component({
  selector: 'app-password-field',
  standalone: true,
  imports: [CommonModule],
  template: INPUT_TEMPLATE,
})
export class PasswordFieldComponent extends InputFieldBase {
  type = 'password';
}

@Component({
  selector: 'app-date-field',
  standalone: true,
  imports: [CommonModule],
  template: INPUT_TEMPLATE,
})
export class DateFieldComponent extends InputFieldBase {
  type = 'date';
}

@Component({
  selector: 'app-number-field',
  standalone: true,
  imports: [CommonModule],
  template: INPUT_TEMPLATE,
})
export class NumberFieldComponent extends InputFieldBase {
  type = 'number';
}

@Component({
  selector: 'app-select-field',
  standalone: true,
  imports: [CommonModule],
  template: `
    <label class="field" [class.field--invalid]="shownError">
      <span *ngIf="label" class="field__label">{{ label }}</span>
      <select
        class="field__control"
        [value]="value ?? ''"
        [disabled]="disabled || readOnly"
        (change)="emit($any($event.target).value)"
        (blur)="onBlur.emit()"
      >
        <option value="">{{ t('-- Choose --') }}</option>
        <option
          *ngFor="let opt of options || []"
          [value]="optionValue(opt)"
          [selected]="optionValue(opt) === value"
        >
          {{ optionLabel(opt) }}
        </option>
      </select>
      <span *ngIf="shownError" class="field__error">{{ shownError }}</span>
    </label>
  `,
})
export class SelectFieldComponent extends DemoFieldBase {}

@Component({
  selector: 'app-radio-field',
  standalone: true,
  imports: [CommonModule],
  template: `
    <fieldset class="field" [class.field--invalid]="shownError">
      <legend *ngIf="label" class="field__label">{{ label }}</legend>
      <div class="field__options">
        <label *ngFor="let opt of options || []">
          <input
            type="radio"
            [name]="id"
            [checked]="optionValue(opt) === value"
            [disabled]="disabled"
            (change)="emit(optionValue(opt))"
            (blur)="onBlur.emit()"
          />
          {{ optionLabel(opt) }}
        </label>
      </div>
      <span *ngIf="shownError" class="field__error">{{ shownError }}</span>
    </fieldset>
  `,
})
export class RadioFieldComponent extends DemoFieldBase {}

@Component({
  selector: 'app-range-field',
  standalone: true,
  imports: [CommonModule],
  template: `
    <label class="field">
      <span *ngIf="label" class="field__label">{{ label }}</span>
      <span class="field__range">
        <input
          type="range"
          [min]="min"
          [max]="max"
          [step]="step"
          [value]="value ?? min ?? 0"
          [disabled]="disabled"
          (input)="emit(+$any($event.target).value)"
          (blur)="onBlur.emit()"
        />
        <output>{{ value }}</output>
      </span>
    </label>
  `,
})
export class RangeFieldComponent extends DemoFieldBase {}

@Component({
  selector: 'app-check-field',
  standalone: true,
  imports: [CommonModule],
  template: `
    <label class="field field--inline">
      <input
        type="checkbox"
        [checked]="!!value"
        [disabled]="disabled || readOnly"
        (change)="emit($any($event.target).checked)"
        (blur)="onBlur.emit()"
      />
      {{ label }}
    </label>
  `,
})
export class CheckFieldComponent extends DemoFieldBase {}
