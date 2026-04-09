import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ComponentRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  Type,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { fieldRegistry, FieldTypeKey } from '@dynamic-field-kit/core';
import { Subscription } from 'rxjs';
import { BaseInputComponent } from './BaseInput';

const KNOWN_PROPS = [
  'value',
  'label',
  'placeholder',
  'required',
  'disabled',
  'options',
  'className',
  'description',
  'errorMessage',
  'acceptFile',
  'maxLength',
  'minNumber',
  'maxNumber',
] as const;

@Component({
  selector: 'dfk-dynamic-input',
  standalone: true,
  imports: [CommonModule],
  template: `<div #host style="display: contents;"></div>`,
})
export class DynamicInput
  extends BaseInputComponent
  implements OnChanges, AfterViewInit, OnDestroy
{
  @Input() type!: FieldTypeKey;
  @Output() override valueChange = new EventEmitter<unknown>();
  @Output() onChange = new EventEmitter<unknown>();

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
    const Renderer = fieldRegistry.get(this.type);
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
      value: this.value,
      onValueChange: (v: unknown) => this.emitValue(v),
      label: this.label ?? '',
      placeholder: this.placeholder ?? '',
      required: this.required ?? false,
      options: this.options ?? [],
      className: this.className ?? '',
      description: this.description ?? '',
      disabled: this.disabled ?? false,
      errorMessage: this.errorMessage ?? '',
    };
  }

  private applyProps(instance: unknown): void {
    const instanceObj = instance as Record<string, unknown>;
    for (const prop of KNOWN_PROPS) {
      if (prop in this && prop in instanceObj) {
        instanceObj[prop] = (this as Record<string, unknown>)[prop];
      }
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
