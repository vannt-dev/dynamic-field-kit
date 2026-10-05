import DemoShell from './DemoShell';
import { readDemoSource } from './lib/readDemoSource';
import BasicsDemo from './demo';

// Server Component: reads the demo's source at build time so the code panel
// shows exactly what is running beside it. The title and introduction come
// from the page list in DemoNav, in the visitor's language.
export default function HomePage() {
  return (
    <DemoShell
      current="basics"
      code={readDemoSource('demo.tsx')}
      codePath="app/demo.tsx"
    >
      <BasicsDemo />
    </DemoShell>
  );
}
