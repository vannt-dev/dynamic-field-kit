'use client';

import { useState } from 'react';
import DemoNav from './DemoNav';

type Page = 'basics' | 'new-features' | 'wizard';

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
    <main
      style={{
        padding: '24px',
        maxWidth: showCode ? '1180px' : '720px',
        margin: '0 auto',
        fontFamily: 'sans-serif',
        transition: 'max-width 0.2s',
      }}
    >
      <DemoNav current={current} />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 12px', fontSize: '24px' }}>{title}</h1>
          <p style={{ color: '#666', margin: '0 0 24px', lineHeight: 1.5 }}>
            {intro}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCode((v) => !v)}
          style={{
            flexShrink: 0,
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid #d7dee6',
            background: showCode ? '#0f172a' : '#fff',
            color: showCode ? '#f8fafc' : '#0f172a',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {showCode ? '✕ Ẩn code' : '‹/› Xem code'}
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gap: '20px',
          gridTemplateColumns: showCode
            ? 'minmax(0, 1fr) minmax(0, 1fr)'
            : '1fr',
          alignItems: 'start',
        }}
      >
        <div style={{ minWidth: 0 }}>{children}</div>

        {showCode && (
          <div
            style={{
              minWidth: 0,
              position: 'sticky',
              top: '16px',
              border: '1px solid #23324a',
              borderRadius: '10px',
              overflow: 'hidden',
              background: '#0f172a',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                background: '#16213a',
                borderBottom: '1px solid #23324a',
              }}
            >
              <code style={{ color: '#94a3b8', fontSize: '12px' }}>
                {codePath}
              </code>
              <button
                type="button"
                onClick={copy}
                style={{
                  background: 'transparent',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: copied ? '#4ade80' : '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '11px',
                  padding: '3px 8px',
                }}
              >
                {copied ? '✓ Đã copy' : 'Copy'}
              </button>
            </div>
            <pre
              style={{
                margin: 0,
                padding: '14px',
                maxHeight: '75vh',
                overflow: 'auto',
                color: '#e2e8f0',
                fontSize: '12px',
                lineHeight: 1.55,
              }}
            >
              {code}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
