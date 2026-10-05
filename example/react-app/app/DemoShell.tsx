'use client';

import { useEffect, useState } from 'react';
import DemoNav, { PAGES, type Page } from './DemoNav';
import { t } from '../../shared/i18n';

interface Props {
  current: Page;
  /** The demo's own source, read at build time. */
  code: string;
  /** Shown as the panel's filename label. */
  codePath: string;
  children: React.ReactNode;
}

export default function DemoShell({
  current,
  code,
  codePath,
  children,
}: Props) {
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  // The language is known only in the browser, and these pages are
  // prerendered: wait for the browser before rendering any text.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!ready) return <main className="demo" />;

  const page = PAGES.find((entry) => entry.id === current)!;

  return (
    <main className={`demo${showCode ? ' demo--wide' : ''}`}>
      <DemoNav current={current} />

      <div className="demo-head">
        <div>
          <h1>{page.title}</h1>
          <p className="demo-intro">{page.intro}</p>
        </div>
        <button
          type="button"
          className="btn"
          aria-pressed={showCode}
          onClick={() => setShowCode((v) => !v)}
          style={{ flexShrink: 0 }}
        >
          {showCode ? t('Hide code') : t('View code')}
        </button>
      </div>

      <div className={`demo-split${showCode ? ' demo-split--code' : ''}`}>
        <section className="demo-card">{children}</section>

        {showCode && (
          <aside className="demo-code">
            <div className="demo-code__bar">
              <span>{codePath}</span>
              <button type="button" onClick={copy}>
                {copied ? t('Copied') : t('Copy')}
              </button>
            </div>
            <pre>{code}</pre>
          </aside>
        )}
      </div>
    </main>
  );
}
