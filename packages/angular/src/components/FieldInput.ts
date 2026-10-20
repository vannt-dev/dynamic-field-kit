import { NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  buildFieldRendererProps,
  createOptionsLoader,
  isAsyncOptions,
  type OptionsLoader,
  type OptionsState,
  makeErrorId,
  makeFieldId,
  FieldDescription,
  Properties,
  type ResolvedFieldRendererProps,
} from '@dynamic-field-kit/core';
import { DynamicInput } from './DynamicInput';

@Component({
  selector: 'dfk-field-input',
  standalone: true,
  imports: [NgIf, DynamicInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dfk-dynamic-input
      *ngIf="rendererProps as p"
      [type]="p.type"
      [value]="p.value"
      [label]="p.label"
      [placeholder]="p.placeholder"
      [required]="p.required"
      [description]="$any(p.description)"
      [options]="$any(p.options)"
      [optionsStatus]="p.optionsStatus"
      [optionsError]="p.optionsError"
      [className]="p.className"
      [disabled]="p.disabled"
      [readOnly]="p.readOnly"
      [touched]="p.touched"
      [dirty]="p.dirty"
      [error]="$any(p.error)"
      [id]="p.id"
      [ariaInvalid]="p.ariaInvalid"
      [ariaDescribedBy]="p.ariaDescribedBy"
      [ariaRequired]="p.ariaRequired"
      [min]="p.min"
      [max]="p.max"
      [step]="p.step"
      [accept]="p.accept"
      [multiple]="p.multiple"
      (valueChange)="handleValueChange($event)"
      (focusout)="onBlurField.emit(fieldDescription!.name)"
      [extraProps]="p.extraProps"
      [onOptionsQuery]="onOptionsQuery"
    ></dfk-dynamic-input>
  `,
})
export class FieldInput implements OnChanges, OnDestroy {
  @Input() fieldDescription?: FieldDescription;
  /**
   * Data at this field's own level. Preferred over `value`: the shared
   * `buildFieldRendererProps` needs the surrounding data to resolve
   * `appearCondition`, dynamic options and cross-field validation. When only
   * `value` is bound (mounting this component directly), a one-key object is
   * synthesised from it.
   */
  @Input() data?: Properties;
  /** Top-level form data, for fields nested inside a repeatable group. */
  @Input() rootData?: Properties;
  @Input() value?: unknown;
  @Input() options?: Record<string, unknown>[];
  @Input() disabled?: boolean;
  @Input() readOnly?: boolean;
  @Input() error?: string | string[];
  /** Distinguishes a controlled empty error from an omitted error input. */
  @Input() validationControlled = false;
  /** Whether the field has been blurred, or marked touched by a form store. */
  @Input() touched?: boolean;
  /** Whether the value differs from the one the form opened with. */
  @Input() dirty?: boolean;
  /** Per-form-instance id namespace; see core's `makeFieldId`. */
  @Input() idPrefix = 'dfk-field';
  @Output() onValueChangeField = new EventEmitter<{
    value: unknown;
    key: string;
  }>();
  /**
   * Emits this field's name when focus leaves it. Driven by `focusout`, which
   * bubbles, so it works for any renderer without the renderer having to
   * declare a blur output of its own.
   */
  @Output() onBlurField = new EventEmitter<string>();

  /**
   * The full renderer prop bag, built once per change-detection pass rather
   * than from one getter per binding - `buildFieldRendererProps` validates the
   * field, and running that ~20 times per pass would be wasteful.
   */
  rendererProps: ResolvedFieldRendererProps | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  // Async options only; a static or synchronous list allocates nothing here.
  private loader?: OptionsLoader;
  private optionsState?: OptionsState;

  /** Bound into the template so a renderer can drive a search-remote refetch. */
  onOptionsQuery = (query: string): void => {
    this.loader?.setQuery(query);
  };

  /**
   * A masked field shows formatted text; `parseInput` turns what its renderer
   * reports back into the value to store.
   */
  handleValueChange(input: unknown): void {
    const props = this.rendererProps;
    const parseInput = props?.parseInput;
    if (
      props &&
      parseInput &&
      typeof input === 'string' &&
      input !== props.value
    ) {
      // The text on screen is no longer the text this field last handed down,
      // and the text to show next may well be that same one: the mask takes
      // nothing from a letter where a digit belongs, or from a character past
      // its last place. A binding that does not change writes nothing, so the
      // refused character would stay on screen. Tell the renderer what it
      // holds now; whatever is shown next is then a change.
      this.rendererProps = { ...props, value: input };
      this.cdr.detectChanges();
      this.rendererProps = props;
      this.cdr.markForCheck();
    }
    this.onValueChangeField.emit({
      value: parseInput ? parseInput(input) : input,
      key: this.fieldDescription!.name,
    });
  }

  ngOnChanges(_changes: SimpleChanges): void {
    this.syncOptionsLoader();
    this.rendererProps = this.buildProps();
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.loader?.dispose();
  }

  private syncOptionsLoader(): void {
    const field = this.fieldDescription;
    if (!field || !isAsyncOptions(field)) {
      // A field can be swapped for one with synchronous options. Without this,
      // the stale optionsState would keep winning in buildFieldRendererProps
      // (`optionsState ? optionsState.options : resolveOptions(...)`) and the
      // old async list would be served forever, with the loader never disposed.
      this.loader?.dispose();
      this.loader = undefined;
      this.optionsState = undefined;
      return;
    }
    if (!this.loader) {
      this.optionsState = { status: 'idle' };
      this.loader = createOptionsLoader(field, (state) => {
        this.optionsState = state;
        this.rendererProps = this.buildProps();
        // OnPush: an async arrival happens outside any event this view is
        // checked for, so without this the options would load and never appear.
        this.cdr.markForCheck();
      });
    }
    this.loader.update(this.data ?? {}, this.rootData);
  }

  private buildProps(): ResolvedFieldRendererProps | null {
    const field = this.fieldDescription;
    if (!field) {
      return null;
    }

    const data = this.data ?? { [field.name]: this.value };
    const id = makeFieldId(field, this.idPrefix);
    const base = buildFieldRendererProps({
      fieldDescription: field,
      data,
      rootData: this.rootData,
      id,
      touched: this.touched,
      dirty: this.dirty,
      optionsState: this.optionsState,
      applyMask: true,
    });

    // Explicitly bound inputs override what the field description resolves to,
    // so a host can still drive options/disabled/error itself.
    const error = this.validationControlled
      ? this.error
      : (this.error ?? base.error);
    return {
      ...base,
      options: this.options ?? base.options,
      disabled: this.disabled ?? base.disabled,
      readOnly: this.readOnly ?? base.readOnly,
      error,
      ariaInvalid: Boolean(error),
      // Follows `error` as `ariaInvalid` does: an error the host passed in
      // (a form store's) has a message node too, and the control must point
      // at it. Taken from `base`, it pointed at nothing whenever the field
      // description's own rules found no error.
      ariaDescribedBy: error ? makeErrorId(id) : undefined,
    };
  }
}
