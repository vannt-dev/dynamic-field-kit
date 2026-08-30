'use client';

import Link from 'next/link';

/**
 * Absolute rather than relative: the landing page only exists on the deployed
 * Pages site, one level above each app's base path. A relative `../` would
 * resolve to nothing when running the demo locally.
 */
export const ALL_DEMOS_URL = 'https://vannt-dev.github.io/dynamic-field-kit/';

const linkStyle: React.CSSProperties = {
  marginRight: '16px',
  fontWeight: 'normal',
  color: '#0066cc',
  textDecoration: 'none',
};

const currentStyle: React.CSSProperties = {
  marginRight: '16px',
  color: '#111',
};

type Page = 'basics' | 'new-features' | 'wizard';

const PAGES: { id: Page; href: string; label: string }[] = [
  { id: 'basics', href: '/', label: '📌 Cơ bản' },
  { id: 'new-features', href: '/new-features', label: '✨ Enterprise (v1.5+)' },
  { id: 'wizard', href: '/wizard', label: '🧭 Wizard nhiều bước' },
];

export default function DemoNav({ current }: { current: Page }) {
  return (
    <nav
      style={{
        marginBottom: '20px',
        padding: '12px',
        background: '#f0f4f8',
        borderRadius: '8px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <a href={ALL_DEMOS_URL} style={{ ...linkStyle, fontWeight: 500 }}>
        ← Tất cả demo
      </a>
      <span style={{ marginRight: '16px', color: '#c3ccd6' }}>|</span>
      {PAGES.map((page) =>
        page.id === current ? (
          <strong key={page.id} style={currentStyle}>
            {page.label}
          </strong>
        ) : (
          <Link key={page.id} href={page.href} style={linkStyle}>
            {page.label}
          </Link>
        ),
      )}
    </nav>
  );
}
