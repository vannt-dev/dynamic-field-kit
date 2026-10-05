import { CommonModule } from '@angular/common';
import { Component, effect, OnDestroy, signal } from '@angular/core';
import {
  createDynamicFormStore,
  MultiFieldInput,
} from '@dynamic-field-kit/angular';
import {
  createFormDraft,
  createFormHistory,
  fieldsFromJsonSchema,
} from '@dynamic-field-kit/core';
import '../fieldRegistry';

// The kind of schema an API already publishes, e.g. an OpenAPI
// `components.schemas` entry. The form below is built from it.
const schema = {
  type: 'object',
  required: ['fullName', 'email'],
  properties: {
    fullName: { type: 'string', title: 'Họ và tên', minLength: 2 },
    email: { type: 'string', format: 'email', title: 'Email' },
    age: { type: 'integer', title: 'Tuổi', minimum: 18, maximum: 100 },
    plan: {
      title: 'Gói dịch vụ',
      enum: ['free', 'pro', 'team'],
      default: 'free',
    },
    newsletter: { type: 'boolean', title: 'Nhận bản tin', default: true },
    // Nested objects are not turned into fields; this one shows up in
    // `warnings` instead of being dropped silently.
    address: { type: 'object', properties: { city: { type: 'string' } } },
  },
};

// `overrides` is merged over the generated fields - here, two placeholders.
const { fields, defaults, warnings } = fieldsFromJsonSchema(schema, {
  overrides: {
    fullName: { placeholder: 'Nguyễn Văn A' },
    email: { placeholder: 'example@domain.com' },
  },
});

const draft = createFormDraft({
  key: 'dfk-demo-schema-form-angular',
  version: 1,
  maxAgeMs: 24 * 60 * 60 * 1000,
});

@Component({
  selector: 'app-schema-demo',
  standalone: true,
  imports: [CommonModule, MultiFieldInput],
  template: `
    <p *ngIf="restoredAt() !== undefined" class="demo-notice">
      Đã khôi phục bản nháp lưu lúc {{ restoredAt() | date: 'mediumTime' }}.
    </p>

    <form (submit)="onSubmit($event)">
      <dfk-multi-field-input
        [fieldDescriptions]="fields"
        [properties]="store.data()"
        [errors]="store.errors()"
        [touched]="store.touched()"
        [layout]="layout"
        (onChange)="store.handleChange($event)"
        (onBlurField)="store.handleBlur($event)"
      ></dfk-multi-field-input>

      <div class="demo-actions">
        <button
          type="button"
          class="btn"
          [disabled]="!canUndo()"
          (click)="step(history.undo())"
        >
          ↶ Undo
        </button>
        <button
          type="button"
          class="btn"
          [disabled]="!canRedo()"
          (click)="step(history.redo())"
        >
          ↷ Redo
        </button>
        <button type="button" class="btn" (click)="startOver()">
          Xoá bản nháp
        </button>
        <button type="submit" class="btn btn--primary">Submit Form</button>
      </div>
    </form>

    <p class="demo-note">
      Nhập vài ô rồi tải lại trang: dữ liệu vẫn còn (lưu trong
      <code>localStorage</code>). Undo gom các lần gõ liên tiếp vào cùng một ô
      thành một bước.
    </p>

    <div *ngIf="warnings.length > 0" class="demo-panel demo-panel--warn">
      <h3><code>warnings</code> — phần schema không thành field</h3>
      <pre>{{ warnings | json }}</pre>
    </div>
  `,
})
export class SchemaDemoComponent implements OnDestroy {
  fields = fields;
  warnings = warnings;

  layout = {
    type: 'responsive' as const,
    mobile: 'column' as const,
    desktop: { type: 'grid' as const, columns: 2, gap: 16 },
  };

  // A saved draft becomes the starting point; `savedAt` feeds the notice.
  private saved = draft.load();
  restoredAt = signal(this.saved ? draft.savedAt() : undefined);

  store = createDynamicFormStore({
    fields,
    initialValues: this.saved ?? defaults,
    validateOnBlur: true,
  });

  history = createFormHistory(this.store.data());
  canUndo = signal(false);
  canRedo = signal(false);

  constructor() {
    effect(() => {
      const data = this.store.data();
      // Nothing is written until the form differs from where it started.
      if (this.store.isDirty()) draft.save(data);
      this.history.push(data);
      this.canUndo.set(this.history.canUndo());
      this.canRedo.set(this.history.canRedo());
    });
  }

  ngOnDestroy(): void {
    draft.flush();
  }

  step(data: Record<string, unknown> | undefined): void {
    if (data) this.store.handleChange(data);
  }

  startOver(): void {
    draft.clear();
    this.store.reset(defaults);
    this.history.reset(defaults);
    this.restoredAt.set(undefined);
  }

  onSubmit = this.store.handleSubmit((data) => {
    draft.clear();
    alert(`Submit thành công:\n${JSON.stringify(data, null, 2)}`);
  });
}
