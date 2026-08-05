import DemoShell from '../DemoShell';
import { readDemoSource } from '../lib/readDemoSource';
import WizardDemo from './demo';

// Server Component: reads the demo's source at build time so the code panel
// shows exactly what is running beside it.
export default function WizardPage() {
  return (
    <DemoShell
      current="wizard"
      title="Multi-Step Form Wizard"
      code={readDemoSource('wizard/demo.tsx')}
      codePath="app/wizard/demo.tsx"
      intro={
        <>
          Minh hoạ <code>createWizardState</code>, <code>validateStep</code>,{' '}
          <code>goNext</code> / <code>goPrev</code> và{' '}
          <code>completedSteps</code>. State là bất biến — mỗi lần điều hướng
          trả về một state mới.
        </>
      }
    >
      <WizardDemo />
    </DemoShell>
  );
}
