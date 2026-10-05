'use client';

import { useState } from 'react';
import DemoNav, { type Page } from './DemoNav';

interface Props {
  current: Page;
  title: string;
  intro: React.ReactNode;
  /** The demo's own source, read at build time. */
  code: string;
  /** Shown as the panel's filename label. */
  codePath: string;
  children: React.ReactNode;
}

export default function DemoShell({
  current,
  title,
  intro,
  code,
  codePath,
  children,
}: Props) {
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className={`demo${showCode ? ' demo--wide' : ''}`}>
      <DemoNav current={current} />

      <div className="demo-head">
        <div>
          <h1>{title}</h1>
          <p className="demo-intro">{intro}</p>
        </div>
        <button
          type="button"
          className="btn"
          aria-pressed={showCode}
          onClick={() => setShowCode((v) => !v)}
          style={{ flexShrink: 0 }}
        >
          {showCode ? 'Ẩn code' : 'Xem code'}
        </button>
      </div>

      <div className={`demo-split${showCode ? ' demo-split--code' : ''}`}>
        <section className="demo-card">{children}</section>

        {showCode && (
          <aside className="demo-code">
            <div className="demo-code__bar">
              <span>{codePath}</span>
              <button type="button" onClick={copy}>
                {copied ? 'Đã copy' : 'Copy'}
              </button>
            </div>
            <pre>{code}</pre>
          </aside>
        )}
      </div>
    </main>
  );
}
