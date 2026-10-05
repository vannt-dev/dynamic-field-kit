import DemoShell from '../DemoShell';
import { readDemoSource } from '../lib/readDemoSource';
import NewFeaturesDemo from './demo';

export default function NewFeaturesPage() {
  return (
    <DemoShell
      current="new-features"
      title="Form state với useDynamicForm"
      code={readDemoSource('new-features/demo.tsx')}
      codePath="app/new-features/demo.tsx"
      intro={
        <>
          Hook giữ data, errors, touched và trạng thái submit;{' '}
          <code>DynamicFormDevTools</code> ở góc màn hình.
        </>
      }
    >
      <NewFeaturesDemo />
    </DemoShell>
  );
}
