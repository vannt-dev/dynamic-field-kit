import { NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FieldRegistry } from '@dynamic-field-kit/core';

// The field types the specs register. Without this augmentation `keyof
// FieldTypeMap` is `never`, so `registry.register('text', …)` fails to compile
// once vitest type-checking is enabled. Every spec imports this helper, so the
// augmentation applies across the whole test compilation.
declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
    number: number;
    defaults: string;
  }
}

@Component({
  selector: 'dfk-test-text',
  standalone: true,
  imports: [NgIf],
  template: `
    <input
      class="txt"
      [value]="value ?? ''"
      [disabled]="!!disabled"
      [readOnly]="!!readOnly"
      [placeholder]="placeholder ?? ''"
      (input)="valueChange.emit($any($event.target).value)"
    />
    <span class="err" *ngIf="error">{{ errorText }}</span>
    <span class="hint" *ngIf="hint">{{ hint }}</span>
  `,
})
export class TextRendererComponent {
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
  // Not a FieldRendererProps key: proves extraProps reach the instance.
  @Input() hint?: string;

  @Output() valueChange = new EventEmitter<unknown>();

  get errorText(): string {
    return ([] as string[]).concat(this.error ?? []).join(', ');
  }
}

@Component({
  selector: 'dfk-test-legacy',
  standalone: true,
  template: `<button class="legacy-btn" (click)="onValueChange.emit('legacy')">
    go
  </button>`,
})
export class LegacyOutputRendererComponent {
  @Input() value?: unknown;
  // Deliberately the legacy output name, to cover DynamicInput.bindOutputs.
  @Output() onValueChange = new EventEmitter<unknown>();
}

@Component({
  selector: 'dfk-test-defaults',
  standalone: true,
  template: `<span class="label">{{ label }}</span>`,
})
export class DefaultsRendererComponent {
  // Initialized input: proves DynamicInput does not overwrite a renderer's
  // own default with undefined for a prop it was never given.
  @Input() label = 'None';
  @Input() value?: unknown;
  @Output() valueChange = new EventEmitter<unknown>();
}

export function fallbackRenderer(props: Record<string, unknown>): string {
  return `<span class="fallback">${String(props['label'] ?? '')}:${String(
    props['value'] ?? ''
  )}</span>`;
}

export function makeRegistry(): FieldRegistry {
  return new FieldRegistry();
}
