'use client';

import {
  createFormDraft,
  createFormHistory,
  fieldsFromJsonSchema,
} from '@dynamic-field-kit/core';
import { MultiFieldInput, useDynamicForm } from '@dynamic-field-kit/react';
import { useEffect, useState } from 'react';
import '../../lib/fieldRegistry';
import { t } from '../../../shared/i18n';

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
  key: 'dfk-demo-schema-form',
  version: 1,
  maxAgeMs: 24 * 60 * 60 * 1000,
});

export default function SchemaFormDemo() {
  const form = useDynamicForm({
    fields,
    initialValues: defaults,
    validateOnBlur: true,
  });
  const [history] = useState(() => createFormHistory(form.data));
  const [steps, setSteps] = useState({ undo: false, redo: false });
  const [restoredAt, setRestoredAt] = useState<number>();
  const [loaded, setLoaded] = useState(false);

  // The draft is read after mount: this page is prerendered, and storage only
  // exists in the browser.
  useEffect(() => {
    const saved = draft.load();
    if (saved) {
      form.setData(saved);
      history.reset(saved);
      setRestoredAt(draft.savedAt());
    }
    setLoaded(true);
    return () => draft.flush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded) return;
    // Nothing is written until the form differs from its defaults.
    if (form.isDirty) draft.save(form.data);
    history.push(form.data);
    setSteps({ undo: history.canUndo(), redo: history.canRedo() });
  }, [form.data, form.isDirty, history, loaded]);

  const step = (data: typeof form.data | undefined) => {
    if (data) form.setData(data);
  };

  const startOver = () => {
    draft.clear();
    form.reset(defaults);
    history.reset(defaults);
    setRestoredAt(undefined);
  };

  return (
    <>
      {restoredAt !== undefined && (
        <p className="demo-notice">
          {t('Draft restored, saved at')}{' '}
          {new Date(restoredAt).toLocaleTimeString()}.
        </p>
      )}

      <form
        onSubmit={form.handleSubmit((validData) => {
          draft.clear();
          alert(`${t('Submitted:')}\n${JSON.stringify(validData, null, 2)}`);
        })}
      >
        <MultiFieldInput
          fieldDescriptions={fields}
          form={form}
          layout={{
            type: 'responsive',
            mobile: 'column',
            desktop: { type: 'grid', columns: 2, gap: 16 },
          }}
        />

        <div className="demo-actions">
          <button
            type="button"
            className="btn"
            disabled={!steps.undo}
            onClick={() => step(history.undo())}
          >
            ↶ Undo
          </button>
          <button
            type="button"
            className="btn"
            disabled={!steps.redo}
            onClick={() => step(history.redo())}
          >
            ↷ Redo
          </button>
          <button type="button" className="btn" onClick={startOver}>
            {t('Clear draft')}
          </button>
          <button type="submit" className="btn btn--primary">
            {t('Submit Form')}
          </button>
        </div>
      </form>

      <p className="demo-note">
        {t(
          'Type in a few fields and reload the page: the data is still there (kept in localStorage). Undo groups consecutive typing in one field into a single step.',
        )}
      </p>

      {warnings.length > 0 && (
        <div className="demo-panel demo-panel--warn">
          <h3>
            {t('warnings: the parts of the schema that did not become fields')}
          </h3>
          <pre>{JSON.stringify(warnings, null, 2)}</pre>
        </div>
      )}
    </>
  );
}
