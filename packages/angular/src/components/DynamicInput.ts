import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ComponentRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  Type,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import {
  FieldTypeKey,
  makeErrorId,
  makeLabelId,
  Properties,
} from '@dynamic-field-kit/core';
import { Subscription } from 'rxjs';
import { FIELD_REGISTRY } from '../fieldRegistryToken';
import { BaseInputComponent } from './BaseInput';

// Only the framework-agnostic FieldRendererProps keys. Domain-specific props
// reach the renderer through `extraProps` (FieldDescription.props) instead.
// Must stay in step with core's FIELD_RENDERER_PROP_KEYS - a key missing here
// is a key no Angular renderer can ever receive, which is how `touched`,
// `dirty`, `id` and the aria flags used to be unreachable on this adapter
// alone. `packages/core/test/adapterParity.test.ts` asserts the two lists match.
const KNOWN_PROPS = [
  'value',
  'label',
  'placeholder',
  'required',
  'disabled',
  'readOnly',
  'touched',
  'dirty',
  'error',
  'options',
  'optionsStatus',
  'optionsError',
  'className',
  'description',
  'id',
  'ariaInvalid',
  'ariaDescribedBy',
  'ariaRequired',
  'min',
  'max',
  'step',
  'accept',
  'multiple',
] as const;

// A radio group is a `div` holding the buttons; every other built-in is one
// form control.
type BuiltInControl =
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLDivElement;

/** Types whose control is an `<input>` of the same `type`, holding text. */
const TEXT_INPUT_TYPES: ReadonlySet<string> = new Set([
  'text',
  'password',
  'email',
  'number',
  // The browser hands these over as ISO text: `2026-10-21`, `09:30`,
  // `2026-10-21T09:30`. That text is the value, as in the other adapters.
  'date',
  'time',
  'datetime-local',
]);

/**
 * The types the built-in fallback draws a control for (see createBuiltIn):
 * the same fourteen as the React, Vue and Svelte adapters.
 */
const BUILT_IN_TYPES: ReadonlySet<string> = new Set([
  ...TEXT_INPUT_TYPES,
  'textarea',
  'checkbox',
  'switch',
  'select',
  'radio',
  'range',
  'file',
]);

/** An option as the select and the radio group show it, read as every adapter reads it. */
function readOption(option: unknown): { value: unknown; label: string } {
  const record = option as Record<string, unknown>;
  const value = record?.['value'] ?? record?.['id'] ?? option;
  return {
    value,
    label: String(record?.['label'] ?? record?.['name'] ?? value),
  };
}

@Component({
  selector: 'dfk-dynamic-input',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // A built-in control is bare, so its label is drawn here, tied to it by
  // `for`. The host element keeps label, control and message together, as
  // the `.dfk-field` wrapper does in the other adapters.
  host: { '[class.dfk-field]': 'isBuiltIn()' },
  // *ngIf rather than @if: the peer range starts at Angular 16, and the
  // built-in control flow block syntax is 17+.
  //
  // A radio group is not a labelable element: its caption is a plain element
  // the group names itself after (`aria-labelledby`), as in the other
  // adapters.
  template: `<label
      *ngIf="showDefaultLabel() && type !== 'radio'"
      [id]="labelNodeId()"
      [attr.for]="id"
      class="dfk-field-label"
      >{{ label }}</label
    ><span
      *ngIf="showDefaultLabel() && type === 'radio'"
      [id]="labelNodeId()"
      class="dfk-field-label"
      >{{ label }}</span
    >
    <div #host style="display: contents;"></div>
    <div
      *ngIf="showDefaultError()"
      [id]="errorNodeId()"
      class="dfk-field-error"
      role="alert"
    >
      {{ firstError() }}
    </div>`,
})
export class DynamicInput
  extends BaseInputComponent
  implements OnChanges, AfterViewInit, OnDestroy
{
  @Input() type!: FieldTypeKey;
  // Extra, framework-agnostic props forwarded verbatim to the renderer.
  @Input() extraProps?: Properties;
  @Output() override valueChange = new EventEmitter<unknown>();
  @Output() onChange = new EventEmitter<unknown>();

  private registry = inject(FIELD_REGISTRY);

  @ViewChild('host', { read: ViewContainerRef, static: false })
  host!: ViewContainerRef;
  private compRef?: ComponentRef<unknown>;
  private inputInstance?: unknown;
  // The built-in control in use, the type it was built for and the options it lists. Kept so that a
  // change updates the control where it stands.
  private builtIn?: BuiltInControl;
  private builtInType?: string;
  private builtInOptions?: string;
  // The values of the radio buttons, by position: what a button emits when
  // chosen is the option's own value, not the text of its `value` attribute.
  private radioValues: unknown[] = [];
  private subscriptions: Subscription[] = [];
  // Tracks which KNOWN_PROPS were actually supplied to DynamicInput (via
  // SimpleChanges), independent of TS class-field emit. See applyProps.
  private supplied = new Set<string>();

  ngOnChanges(changes: SimpleChanges): void {
    super.ngOnChanges(changes);

    for (const prop of KNOWN_PROPS) {
      if (changes[prop]) {
        this.supplied.add(prop);
      }
    }

    if (this.inputInstance) {
      this.syncPropsToInstance(changes);
    }

    if (changes['type'] && !changes['type'].firstChange && this.host) {
      this.render();
    } else if (!this.inputInstance && this.host) {
      this.render();
    }
  }

  ngAfterViewInit(): void {
    this.render();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private syncPropsToInstance(changes: SimpleChanges): void {
    if (!this.inputInstance) {
      return;
    }

    for (const prop of KNOWN_PROPS) {
      if (changes[prop] && this.inputInstance) {
        (this.inputInstance as Record<string, unknown>)[prop] = (
          this as Record<string, unknown>
        )[prop];
      }
    }
    if (changes['onOptionsQuery']) {
      this.applyCallbackProps(this.inputInstance);
    }
    if (changes['extraProps']) {
      this.applyExtraProps(this.inputInstance);
    }
    // The props above are assigned to the instance, which Angular does not
    // see. Checking the host view alone skips an OnPush renderer that is not
    // marked, and from Angular 22 every renderer that names no strategy is
    // OnPush: a value the form set itself (a computed field, a reset) never
    // showed. The renderer's own view is marked first.
    this.compRef?.injector.get(ChangeDetectorRef).markForCheck();
    this.compRef?.changeDetectorRef?.detectChanges();
  }

  private cleanup(): void {
    this.cleanupSubscriptions();
    this.cleanupRenderedComponent();
  }

  private cleanupSubscriptions(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.subscriptions = [];
  }

  private cleanupRenderedComponent(): void {
    this.compRef?.destroy();
    this.compRef = undefined;
    this.inputInstance = undefined;
  }

  /**
   * Removes what this component put into the host element itself: a built-in
   * control, the HTML of a function renderer, an error message. `host.clear()`
   * does not: it only knows the components it created, which sit beside the
   * host element, not inside it.
   */
  private clearOwnNodes(): void {
    const element = this.host.element.nativeElement as HTMLElement;
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
    this.builtIn = undefined;
    this.builtInType = undefined;
    this.builtInOptions = undefined;
  }

  /** The id `ariaDescribedBy` points at. See core's `makeErrorId`. */
  errorNodeId(): string {
    return makeErrorId(this.id ?? '');
  }

  /** The id of the label drawn for a built-in control. See core's `makeLabelId`. */
  labelNodeId(): string {
    return makeLabelId(this.id ?? '');
  }

  /**
   * Whether the built-in fallback draws this field's control. Asks the
   * registry directly, for the reason given on `showDefaultError`.
   */
  isBuiltIn(): boolean {
    return !this.registry.get(this.type) && BUILT_IN_TYPES.has(this.type);
  }

  /** A registered renderer owns its label; a built-in control gets one here. */
  showDefaultLabel(): boolean {
    return Boolean(this.isBuiltIn() && this.label && this.id);
  }

  /** `error` may arrive as a bare string, so index 0 would be a character. */
  firstError(): string | undefined {
    return Array.isArray(this.error) ? this.error[0] : this.error;
  }

  /**
   * Whether the adapter should render the validation message itself.
   *
   * Asks the registry directly rather than reading a flag set by `render()`:
   * `render()` runs in `ngAfterViewInit`, by which point this template's
   * bindings have already been checked for the pass, and under `OnPush`
   * nothing would mark them dirty again. A registered renderer owns its own
   * error presentation, so only the built-in fallback gets a message here.
   */
  showDefaultError(): boolean {
    return Boolean(
      !this.registry.get(this.type) && this.firstError() && this.id,
    );
  }

  private render(): void {
    const Renderer = this.registry.get(this.type);

    // A built-in control of the same type is updated where it stands. Built
    // again on every change, as it used to be, it would lose the focus after
    // each character typed - and the ones built before stayed in the page.
    if (!Renderer && this.builtIn && this.builtInType === this.type) {
      this.syncBuiltIn(this.builtIn);
      this.applyFallbackAria();
      return;
    }

    this.cleanup();
    this.host.clear();
    this.clearOwnNodes();

    if (!Renderer) {
      if (this.renderDefaultFallbackHTML5(this.type)) {
        this.applyFallbackAria();
        return;
      }
      this.renderError(`Unknown field type: ${this.type}`);
      return;
    }

    if (this.isComponentType(Renderer)) {
      this.renderComponent(Renderer as unknown as Type<unknown>);
    } else if (typeof Renderer === 'function') {
      this.renderFallback(Renderer);
    } else {
      this.renderError(`Invalid renderer for type: ${this.type}`);
    }
  }

  // Angular component classes carry a static ɵcmp. Checked instead of
  // reflectComponentType() because the peer range starts at Angular 13 and
  // reflectComponentType is v14+. Plain function renderers have no ɵcmp and
  // fall through to renderFallback. Uses hasOwnProperty (not `in`) so a
  // class that merely extends a component without its own @Component
  // decorator - and would otherwise inherit the parent's static ɵcmp via the
  // prototype chain - is not mistaken for a component in its own right.
  private isComponentType(renderer: unknown): boolean {
    return (
      typeof renderer === 'function' &&
      Object.prototype.hasOwnProperty.call(renderer, 'ɵcmp')
    );
  }

  private renderComponent(compType: Type<unknown>): void {
    try {
      const compRef = this.host.createComponent(compType);
      const instance = compRef.instance;

      if (!instance) {
        this.renderError(`Failed to create instance for ${this.type}`);
        return;
      }

      this.applyProps(instance);
      this.bindOutputs(instance);

      this.compRef = compRef;
      this.inputInstance = instance;
      compRef.changeDetectorRef.detectChanges();
    } catch {
      this.renderError(`Failed to render field: ${this.type}`);
    }
  }

  private renderFallback(renderer: unknown): void {
    try {
      const props = this.getFallbackProps();
      const result = (renderer as (props: unknown) => string)(props);

      if (typeof result === 'string') {
        const el = document.createElement('div');
        el.innerHTML = result;
        this.host.element.nativeElement.appendChild(el);
      }
    } catch {
      this.renderError(`Failed to render field: ${this.type}`);
    }
  }

  private getFallbackProps(): Record<string, unknown> {
    return {
      ...this.extraProps,
      value: this.value,
      onValueChange: (v: unknown) => this.emitValue(v),
      onOptionsQuery: this.onOptionsQuery,
      label: this.label ?? '',
      placeholder: this.placeholder ?? '',
      required: this.required ?? false,
      disabled: this.disabled ?? false,
      readOnly: this.readOnly ?? false,
      touched: this.touched ?? false,
      dirty: this.dirty ?? false,
      error: this.error,
      options: this.options ?? [],
      className: this.className ?? '',
      description: this.description ?? '',
      id: this.id ?? '',
      ariaInvalid: this.ariaInvalid ?? false,
      ariaDescribedBy: this.ariaDescribedBy,
      ariaRequired: this.ariaRequired ?? false,
      min: this.min,
      max: this.max,
      step: this.step,
      accept: this.accept,
      multiple: this.multiple ?? false,
    };
  }

  // Gates on `this.supplied` (populated from SimpleChanges in ngOnChanges),
  // not on `prop in instanceObj` or `prop in this`. Both `in` checks test a
  // TypeScript class-field emit artifact rather than intent: whether a
  // property slot exists at runtime depends on the compile target
  // (useDefineForClassFields is false below ES2022, true at ES2022+), so the
  // same source can behave oppositely between this package's test build and
  // its shipped ES2022 bundle, where every declared field is always an own
  // property. `this.supplied` instead reflects only whether Angular ever
  // fired a SimpleChange for that input, i.e. whether the prop was *bound*
  // at all - it skips only props DynamicInput was never given a binding
  // for. It is NOT a general "renderer defaults survive" guarantee: Angular
  // fires a firstChange SimpleChange for every bound input even when the
  // bound value is undefined, and FieldInput's template binds all
  // KNOWN_PROPS unconditionally, so on the real
  // MultiFieldInput -> FieldInput -> DynamicInput path every prop counts as
  // supplied and renderer-side defaults (e.g. `@Input() label = 'None'`)
  // are still overwritten with undefined. This only helps when DynamicInput
  // is mounted directly with some inputs left unbound.
  private applyProps(instance: unknown): void {
    const instanceObj = instance as Record<string, unknown>;
    for (const prop of KNOWN_PROPS) {
      if (this.supplied.has(prop)) {
        instanceObj[prop] = (this as Record<string, unknown>)[prop];
      }
    }
    this.applyCallbackProps(instance);
    this.applyExtraProps(instance);
  }

  /**
   * Props that are callbacks rather than resolved values, so they are not in
   * `KNOWN_PROPS` / `FIELD_RENDERER_PROP_KEYS` and the loop above never sees
   * them. Without this a renderer declaring `onOptionsQuery` always got
   * `undefined` and could never trigger a search-remote refetch.
   */
  private applyCallbackProps(instance: unknown): void {
    if (!instance) {
      return;
    }
    (instance as Record<string, unknown>)['onOptionsQuery'] =
      this.onOptionsQuery;
  }

  private applyExtraProps(instance: unknown): void {
    if (!instance || !this.extraProps) {
      return;
    }
    const instanceObj = instance as Record<string, unknown>;
    for (const [key, value] of Object.entries(this.extraProps)) {
      instanceObj[key] = value;
    }
  }

  private bindOutputs(instance: unknown): void {
    const outputNames: Array<'valueChange' | 'onValueChange'> = [
      'valueChange',
      'onValueChange',
    ];

    for (const outputName of outputNames) {
      const output = (instance as Record<string, unknown>)[outputName];
      if (output && typeof output === 'object' && 'subscribe' in output) {
        const sub = (
          output as { subscribe: (cb: (v: unknown) => void) => Subscription }
        ).subscribe((value: unknown) => this.emitValue(value));
        this.subscriptions.push(sub);
      }
    }
  }

  private emitValue(value: unknown): void {
    this.valueChange.emit(value);
    this.onChange.emit(value);
  }

  /**
   * Puts the aria flags on whatever control the HTML5 fallback just built.
   *
   * Applied here, once, rather than in each of the fallback's branches: they
   * hand-build an input, textarea, checkbox or select, and every one of them
   * would otherwise need the same four lines. Without this the fallback emits
   * the `{id}-error` node with nothing pointing at it, and
   * `focusFirstInvalidField` - which selects `[aria-invalid="true"]` - still
   * finds nothing on this adapter.
   *
   * `render()` re-runs on every ngOnChanges while the fallback is in use (there
   * is no component instance to sync props into), so this stays current as the
   * field's error comes and goes. The control is the same one from change to
   * change, so a flag that is no longer given is taken off again.
   */
  private applyFallbackAria(): void {
    const root = this.host.element.nativeElement as HTMLElement;
    // Each button of a radio group carries the flags, as in the React and Vue
    // adapters; any other built-in is a single control.
    const group = this.builtIn instanceof HTMLDivElement;
    const controls = group
      ? Array.from(root.querySelectorAll('input[type="radio"]'))
      : [root.querySelector('input, select, textarea')].filter(
          (control): control is Element => control !== null,
        );
    for (const control of controls) {
      const flag = (name: string, value: string | undefined) => {
        if (value === undefined) {
          control.removeAttribute(name);
        } else {
          control.setAttribute(name, value);
        }
      };
      flag(
        'aria-invalid',
        this.ariaInvalid === undefined ? undefined : String(this.ariaInvalid),
      );
      // The group's `required` says it; a button is not required on its own.
      if (!group) {
        flag(
          'aria-required',
          this.ariaRequired === undefined
            ? undefined
            : String(this.ariaRequired),
        );
      }
      flag('aria-describedby', this.ariaDescribedBy || undefined);
    }
  }

  /**
   * Builds the built-in control for `type` and puts it in the host element.
   * What the control shows is set by `syncBuiltIn`, here and on every later
   * change.
   */
  private renderDefaultFallbackHTML5(type: string): boolean {
    const control = this.createBuiltIn(type);
    if (!control) {
      return false;
    }
    this.builtIn = control;
    this.builtInType = type;
    this.syncBuiltIn(control);
    (this.host.element.nativeElement as HTMLElement).appendChild(control);
    return true;
  }

  private createBuiltIn(type: string): BuiltInControl | null {
    if (TEXT_INPUT_TYPES.has(type)) {
      const input = document.createElement('input');
      input.type = type;
      input.addEventListener('input', () => {
        const raw = input.value;
        const val =
          type === 'number' ? (raw === '' ? undefined : Number(raw)) : raw;
        this.emitValue(val);
      });
      return input;
    }

    if (type === 'textarea') {
      const textarea = document.createElement('textarea');
      textarea.addEventListener('input', () => {
        this.emitValue(textarea.value);
      });
      return textarea;
    }

    // A switch is a checkbox, as in the other adapters.
    if (type === 'checkbox' || type === 'switch') {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.addEventListener('change', () => {
        this.emitValue(checkbox.checked);
      });
      return checkbox;
    }

    if (type === 'select') {
      const select = document.createElement('select');
      select.addEventListener('change', () => {
        this.emitValue(select.value);
      });
      return select;
    }

    if (type === 'range') {
      const range = document.createElement('input');
      range.type = 'range';
      range.addEventListener('input', () => {
        this.emitValue(Number(range.value));
      });
      return range;
    }

    if (type === 'file') {
      const file = document.createElement('input');
      file.type = 'file';
      // The chosen file, or the list of them for `multiple`; `null` when the
      // choice is cleared.
      file.addEventListener('change', () => {
        const files = file.files;
        if (!files) {
          return;
        }
        this.emitValue(this.multiple ? Array.from(files) : (files[0] ?? null));
      });
      return file;
    }

    if (type === 'radio') {
      const group = document.createElement('div');
      group.setAttribute('role', 'radiogroup');
      group.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        const index = Number(target.dataset['index']);
        if (target.type === 'radio' && index in this.radioValues) {
          this.emitValue(this.radioValues[index]);
        }
      });
      return group;
    }

    return null;
  }

  /** Brings a built-in control in line with the current inputs. */
  private syncBuiltIn(control: BuiltInControl): void {
    const attribute = (name: string, value: string | undefined) => {
      if (value) {
        control.setAttribute(name, value);
      } else {
        control.removeAttribute(name);
      }
    };
    attribute('id', this.id);

    if (control instanceof HTMLDivElement) {
      control.className = `dfk-radio-group ${this.className || ''}`;
      // The caption drawn for a labelled field; see `showDefaultLabel`.
      attribute(
        'aria-labelledby',
        this.label && this.id ? this.labelNodeId() : undefined,
      );
      this.syncRadioButtons(control);
      return;
    }

    attribute('class', this.className);
    control.required = Boolean(this.required);

    if (control instanceof HTMLSelectElement) {
      // a select has no read-only state of its own
      control.disabled = Boolean(this.disabled || this.readOnly);
      this.syncBuiltInOptions(control);
      return;
    }

    if (control instanceof HTMLInputElement && control.type === 'checkbox') {
      // nor has a checkbox
      control.disabled = Boolean(this.disabled || this.readOnly);
      control.checked = Boolean(this.value);
      return;
    }

    if (control instanceof HTMLInputElement && control.type === 'range') {
      // nor a range
      control.disabled = Boolean(this.disabled || this.readOnly);
      attribute('min', this.min?.toString());
      attribute('max', this.max?.toString());
      attribute('step', this.step?.toString());
      // Bounds first: the browser clamps the value to them.
      const next = String(this.value ?? this.min ?? 0);
      if (control.value !== next) {
        control.value = next;
      }
      return;
    }

    if (control instanceof HTMLInputElement && control.type === 'file') {
      // A file input cannot be given a value, so `value` is not written.
      control.disabled = Boolean(this.disabled || this.readOnly);
      attribute('accept', this.accept);
      control.multiple = Boolean(this.multiple);
      return;
    }

    attribute('placeholder', this.placeholder);
    control.disabled = Boolean(this.disabled);
    control.readOnly = Boolean(this.readOnly);

    const next = ((this.value as string | number) ?? '').toString();
    // Written only when it says something else than the control already
    // does: writing the text a user is in the middle of typing moves the
    // caret to its end. For a number, "the same" is the same number: "1.50"
    // is 1.5, and must not be rewritten to "1.5" under the caret.
    const same =
      control.type === 'number' && control.value !== '' && next !== ''
        ? Number(control.value) === Number(next)
        : control.value === next;
    if (!same) {
      control.value = next;
    }
  }

  /**
   * The buttons of a built-in radio group, rebuilt only when the options
   * changed, and the one that is checked. Markup as in the other adapters: a
   * `<label>` per option around its button and its text.
   */
  private syncRadioButtons(group: HTMLDivElement): void {
    const shown = (this.options || []).map(readOption);
    const listed = JSON.stringify(
      shown.map((option) => [String(option.value), option.label]),
    );
    if (listed !== this.builtInOptions) {
      this.builtInOptions = listed;
      this.radioValues = shown.map((option) => option.value);
      while (group.firstChild) {
        group.removeChild(group.firstChild);
      }
      shown.forEach((option, index) => {
        const label = document.createElement('label');
        label.style.marginRight = '12px';
        label.style.display = 'inline-flex';
        label.style.alignItems = 'center';
        const button = document.createElement('input');
        button.type = 'radio';
        button.value = String(option.value);
        button.dataset['index'] = String(index);
        const text = document.createElement('span');
        text.style.marginLeft = '4px';
        text.textContent = option.label;
        label.append(button, text);
        group.appendChild(label);
      });
    }

    const buttons = Array.from(
      group.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
    );
    buttons.forEach((button, index) => {
      button.id = `${this.id || 'radio'}-${index}`;
      button.name = this.id ?? '';
      button.disabled = Boolean(this.disabled || this.readOnly);
      button.required = Boolean(this.required);
      button.checked = String(this.value) === String(this.radioValues[index]);
    });
  }

  /** The options of a built-in select, rebuilt only when the list changed, and the one that is chosen. */
  private syncBuiltInOptions(select: HTMLSelectElement): void {
    const options = (this.options || []).map((opt) => {
      const option = readOption(opt);
      return { value: String(option.value), label: option.label };
    });
    const listed = JSON.stringify(options);
    if (listed !== this.builtInOptions) {
      this.builtInOptions = listed;
      while (select.firstChild) {
        select.removeChild(select.firstChild);
      }
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.disabled = true;
      defaultOpt.textContent = '-- Select --';
      select.appendChild(defaultOpt);
      for (const option of options) {
        const optionEl = document.createElement('option');
        optionEl.value = option.value;
        optionEl.textContent = option.label;
        select.appendChild(optionEl);
      }
    }

    const wanted = String(this.value);
    const all = Array.from(select.options);
    // Without a match the first option that can be chosen is shown, which is
    // what a select built from scratch shows.
    const chosen =
      all.find((option) => !option.disabled && option.value === wanted) ??
      all.find((option) => !option.disabled);
    if (chosen && !chosen.selected) {
      chosen.selected = true;
    }
  }

  private renderError(message: string): void {
    const el = document.createElement('div');
    el.textContent = message;
    el.style.color = 'red';
    this.host.element.nativeElement.appendChild(el);
  }
}
