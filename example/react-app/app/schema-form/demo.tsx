'use client';

import {
  createFormDraft,
  createFormHistory,
  fieldsFromJsonSchema,
} from '@dynamic-field-kit/core';
import { MultiFieldInput, useDynamicForm } from '@dynamic-field-kit/react';
import { useEffect, useState } from 'react';
import '../../lib/fieldRegistry';

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
          Đã khôi phục bản nháp lưu lúc{' '}
          {new Date(restoredAt).toLocaleTimeString()}.
        </p>
      )}

      <form
        onSubmit={form.handleSubmit((validData) => {
          draft.clear();
          alert(`Submit thành công:\n${JSON.stringify(validData, null, 2)}`);
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
            Xoá bản nháp
          </button>
          <button type="submit" className="btn btn--primary">
            Submit Form
          </button>
        </div>
      </form>

      <p className="demo-note">
        Nhập vài ô rồi tải lại trang: dữ liệu vẫn còn (lưu trong{' '}
        <code>localStorage</code>). Undo gom các lần gõ liên tiếp vào cùng một ô
        thành một bước.
      </p>

      {warnings.length > 0 && (
        <div className="demo-panel demo-panel--warn">
          <h3>
            <code>warnings</code> — phần schema không thành field
          </h3>
          <pre>{JSON.stringify(warnings, null, 2)}</pre>
        </div>
      )}
    </>
  );
}
