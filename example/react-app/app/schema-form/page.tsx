import DemoShell from '../DemoShell';
import { readDemoSource } from '../lib/readDemoSource';
import SchemaFormDemo from './demo';

// Server Component: reads the demo's source at build time so the code panel
// shows exactly what is running beside it.
export default function SchemaFormPage() {
  return (
    <DemoShell
      current="schema-form"
      title="JSON Schema, bản nháp và Undo / Redo"
      code={readDemoSource('schema-form/demo.tsx')}
      codePath="app/schema-form/demo.tsx"
      intro={
        <>
          Minh hoạ <code>fieldsFromJsonSchema</code> (dựng form từ một JSON
          Schema), <code>createFormDraft</code> (giữ dữ liệu qua lần tải lại
          trang) và <code>createFormHistory</code> (undo / redo). Cả ba nằm
          trong <code>@dynamic-field-kit/core</code> từ 1.8.0.
        </>
      }
    >
      <SchemaFormDemo />
    </DemoShell>
  );
}
