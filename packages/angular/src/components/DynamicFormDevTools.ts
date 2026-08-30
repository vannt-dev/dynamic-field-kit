import { NgIf, NgFor, JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  signal,
} from '@angular/core';
import { FieldDescription, Properties } from '@dynamic-field-kit/core';

@Component({
  selector: 'dfk-dev-tools',
  standalone: true,
  imports: [NgIf, NgFor, JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      *ngIf="!isOpen()"
      type="button"
      (click)="isOpen.set(true)"
      style="
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 99999;
        background: #1e293b;
        color: #f8fafc;
        border: 1px solid #334155;
        border-radius: 20px;
        padding: 8px 14px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 6px;
      "
    >
      <span>🔍 DevTools</span>
      <span
        *ngIf="errorCount() > 0"
        class="dfk-devtools-badge"
        style="
          background: #ef4444;
          color: #fff;
          border-radius: 10px;
          padding: 2px 6px;
          font-size: 10px;
        "
        >{{ errorCount() }}</span
      >
    </button>

    <div
      *ngIf="isOpen()"
      style="
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 99999;
        width: 360px;
        max-height: 420px;
        background: #0f172a;
        color: #f8fafc;
        border: 1px solid #334155;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        font-family: monospace, sans-serif;
        font-size: 12px;
        overflow: hidden;
      "
    >
      <div
        style="
          padding: 10px 14px;
          background: #1e293b;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #334155;
        "
      >
        <span style="font-weight: bold; color: #38bdf8;">🛠️ Form DevTools</span>
        <button
          type="button"
          (click)="isOpen.set(false)"
          style="background: transparent; border: none; color: #94a3b8; font-size: 14px; cursor: pointer;"
        >
          ✕
        </button>
      </div>

      <div
        style="display: flex; background: #1e293b; border-bottom: 1px solid #334155;"
      >
        <button
          type="button"
          *ngFor="let tab of tabs"
          (click)="activeTab.set(tab)"
          [style.background]="activeTab() === tab ? '#0f172a' : 'transparent'"
          [style.color]="activeTab() === tab ? '#38bdf8' : '#94a3b8'"
          style="flex: 1; padding: 6px 0; border: none; cursor: pointer; text-transform: capitalize; font-size: 11px;"
        >
          {{ tab
          }}{{
            tab === 'errors' && errorCount() > 0
              ? ' (' + errorCount() + ')'
              : ''
          }}
        </button>
      </div>

      <div style="padding: 12px; overflow-y: auto; flex: 1;">
        <pre
          *ngIf="activeTab() === 'data'"
          style="margin: 0; white-space: pre-wrap; word-break: break-all; color: #a7f3d0;"
        >
          {{ data | json }}
        </pre>
        <pre
          *ngIf="activeTab() === 'errors'"
          style="margin: 0; white-space: pre-wrap; word-break: break-all; color: #f87171;"
        >
          {{ errors | json }}
        </pre>
        <div *ngIf="activeTab() === 'meta'">
          <div>isDirty: {{ isDirty }}</div>
          <pre style="margin: 4px 0 0 0; color: #cbd5e1;">{{
            touched | json
          }}</pre>
        </div>
        <div *ngIf="activeTab() === 'fields'">
          <div
            *ngFor="let f of fields"
            style="padding: 6px; margin-bottom: 6px; background: #1e293b; border-radius: 4px;"
          >
            <div style="color: #38bdf8; font-weight: bold;">{{ f.name }}</div>
            <div style="color: #94a3b8; font-size: 10px;">
              type: {{ f.type }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DynamicFormDevToolsComponent {
  @Input() data: Properties = {};
  @Input() errors: Record<string, string[]> = {};
  @Input() touched: Record<string, boolean> = {};
  @Input() isDirty = false;
  @Input() fields: FieldDescription[] = [];

  /** Number of fields carrying errors, mirroring the react and vue overlays. */
  errorCount(): number {
    return Object.keys(this.errors || {}).length;
  }

  isOpen = signal(false);
  activeTab = signal<'data' | 'errors' | 'meta' | 'fields'>('data');
  tabs: Array<'data' | 'errors' | 'meta' | 'fields'> = [
    'data',
    'errors',
    'meta',
    'fields',
  ];
}
