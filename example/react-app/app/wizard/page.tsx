import DemoShell from '../DemoShell';
import { readDemoSource } from '../lib/readDemoSource';
import WizardDemo from './demo';

// Server Component: reads the demo's source at build time so the code panel
// shows exactly what is running beside it. The title and introduction come
// from the page list in DemoNav, in the visitor's language.
export default function WizardPage() {
  return (
    <DemoShell
      current="wizard"
      code={readDemoSource('wizard/demo.tsx')}
      codePath="app/wizard/demo.tsx"
    >
      <WizardDemo />
    </DemoShell>
  );
}
