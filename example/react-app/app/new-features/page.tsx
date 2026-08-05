import DemoShell from '../DemoShell';
import { readDemoSource } from '../lib/readDemoSource';
import NewFeaturesDemo from './demo';

export default function NewFeaturesPage() {
  return (
    <DemoShell
      current="new-features"
      title="Tính Năng Enterprise-Grade (v1.4+)"
      code={readDemoSource('new-features/demo.tsx')}
      codePath="app/new-features/demo.tsx"
      intro={
        <>
          Minh hoạ <code>useDynamicForm</code>, Extended Renderers (
          <code>radio</code>, <code>range</code>, <code>date</code>,{' '}
          <code>switch</code>), blur wiring qua <code>onBlurField</code>, và{' '}
          <code>DynamicFormDevTools</code> ở góc màn hình.
        </>
      }
    >
      <NewFeaturesDemo />
    </DemoShell>
  );
}
