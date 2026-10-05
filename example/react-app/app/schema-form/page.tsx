import DemoShell from '../DemoShell';
import { readDemoSource } from '../lib/readDemoSource';
import SchemaFormDemo from './demo';

// Server Component: reads the demo's source at build time so the code panel
// shows exactly what is running beside it. The title and introduction come
// from the page list in DemoNav, in the visitor's language.
export default function SchemaFormPage() {
  return (
    <DemoShell
      current="schema-form"
      code={readDemoSource('schema-form/demo.tsx')}
      codePath="app/schema-form/demo.tsx"
    >
      <SchemaFormDemo />
    </DemoShell>
  );
}
