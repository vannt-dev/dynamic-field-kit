import DemoShell from '../DemoShell';
import { readDemoSource } from '../lib/readDemoSource';
import NewFeaturesDemo from './demo';

// Server Component: reads the demo's source at build time so the code panel
// shows exactly what is running beside it. The title and introduction come
// from the page list in DemoNav, in the visitor's language.
export default function NewFeaturesPage() {
  return (
    <DemoShell
      current="new-features"
      code={readDemoSource('new-features/demo.tsx')}
      codePath="app/new-features/demo.tsx"
    >
      <NewFeaturesDemo />
    </DemoShell>
  );
}
