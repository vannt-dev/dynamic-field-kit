import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
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
import { FieldTypeKey, Properties } from '@dynamic-field-kit/core';
import { Subscription } from 'rxjs';
import { FIELD_REGISTRY } from '../fieldRegistryToken';
import { BaseInputComponent } from './BaseInput';

// Only the framework-agnostic FieldRendererProps keys. Domain-specific props
// reach the renderer through `extraProps` (FieldDescription.props) instead.
const KNOWN_PROPS = [
  'value',
  'label',
  'placeholder',
  'required',
  'disabled',
  'readOnly',
  'error',
  'options',
  'className',
  'description',
] as const;

@Component({
  selector: 'dfk-dynamic-input',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #host style="display: contents;"></div>`,
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
  private subscriptions: Subscription[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    super.ngOnChanges(changes);

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
    if (changes['extraProps']) {
      this.applyExtraProps(this.inputInstance);
    }
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

  private render(): void {
    const Renderer = this.registry.get(this.type);
    this.cleanup();
    this.host.clear();

    if (!Renderer) {
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

  private isComponentType(renderer: unknown): boolean {
    return (
      typeof renderer === 'object' && renderer !== null && 'cmp' in renderer
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
      label: this.label ?? '',
      placeholder: this.placeholder ?? '',
      required: this.required ?? false,
      disabled: this.disabled ?? false,
      readOnly: this.readOnly ?? false,
      error: this.error,
      options: this.options ?? [],
      className: this.className ?? '',
      description: this.description ?? '',
    };
  }

  private applyProps(instance: unknown): void {
    const instanceObj = instance as Record<string, unknown>;
    for (const prop of KNOWN_PROPS) {
      if (prop in this && prop in instanceObj) {
        instanceObj[prop] = (this as Record<string, unknown>)[prop];
      }
    }
    this.applyExtraProps(instance);
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

  private renderError(message: string): void {
    const el = document.createElement('div');
    el.textContent = message;
    el.style.color = 'red';
    this.host.element.nativeElement.appendChild(el);
  }
}
