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
import { t } from '../../../../shared/i18n';

// The kind of schema an API already publishes, e.g. an OpenAPI
// `components.schemas` entry. The form below is built from it.
const schema = {
  type: 'object',
  required: ['fullName', 'email'],
  properties: {
    fullName: { type: 'string', title: t('Full name'), minLength: 2 },
    email: { type: 'string', format: 'email', title: t('Email') },
    age: { type: 'integer', title: t('Age'), minimum: 18, maximum: 100 },
    plan: {
      title: t('Plan'),
      enum: ['free', 'pro', 'team'],
      default: 'free',
    },
    newsletter: {
      type: 'boolean',
      title: t('Send me the newsletter'),
      default: true,
    },
    // Nested objects are not turned into fields; this one shows up in
    // `warnings` instead of being dropped silently.
    address: { type: 'object', properties: { city: { type: 'string' } } },
  },
};

// `overrides` is merged over the generated fields - here, two placeholders.
const { fields, defaults, warnings } = fieldsFromJsonSchema(schema, {
  overrides: {
    fullName: { placeholder: t('Jane Doe') },
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
      {{ t('Draft restored, saved at') }}
      {{ restoredAt() | date: 'mediumTime' }}.
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
          {{ t('Clear draft') }}
        </button>
        <button type="submit" class="btn btn--primary">
          {{ t('Submit Form') }}
        </button>
      </div>
    </form>

    <p class="demo-note">
      {{
        t(
          'Type in a few fields and reload the page: the data is still there (kept in localStorage). Undo groups consecutive typing in one field into a single step.'
        )
      }}
    </p>

    <div *ngIf="warnings.length > 0" class="demo-panel demo-panel--warn">
      <h3>
        {{ t('warnings: the parts of the schema that did not become fields') }}
      </h3>
      <pre>{{ warnings | json }}</pre>
    </div>
  `,
})
export class SchemaDemoComponent implements OnDestroy {
  t = t;

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
    alert(`${t('Submitted:')}\n${JSON.stringify(data, null, 2)}`);
  });
}
