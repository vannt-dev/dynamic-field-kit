import BasicsDemo from './demo';
import DemoShell from './DemoShell';
import { readDemoSource } from './lib/readDemoSource';

export default function HomePage() {
  return (
    <DemoShell
      current="basics"
      title="Dynamic Field Kit — React"
      code={readDemoSource('demo.tsx')}
      codePath="app/demo.tsx"
      intro={
        <>
          Nền tảng: đăng ký renderer qua <code>fieldRegistry</code>,{' '}
          <code>MultiFieldInput</code>, layout, trường điều kiện (
          <code>appearCondition</code>), trường dẫn xuất (
          <code>computeValue</code>) và nhóm lặp lại.
        </>
      }
    >
      <BasicsDemo />
    </DemoShell>
  );
}
