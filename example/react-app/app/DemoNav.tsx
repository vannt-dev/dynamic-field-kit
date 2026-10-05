'use client';

import Link from 'next/link';

/**
 * Absolute rather than relative: the landing page only exists on the deployed
 * Pages site, one level above each app's base path. A relative `../` would
 * resolve to nothing when running the demo locally.
 */
export const ALL_DEMOS_URL = 'https://vannt-dev.github.io/dynamic-field-kit/';

export type Page = 'basics' | 'new-features' | 'wizard' | 'schema-form';

const PAGES: { id: Page; href: string; label: string }[] = [
  { id: 'basics', href: '/', label: 'Cơ bản' },
  { id: 'new-features', href: '/new-features', label: 'Form state' },
  { id: 'wizard', href: '/wizard', label: 'Wizard' },
  { id: 'schema-form', href: '/schema-form', label: 'JSON Schema + Undo' },
];

export default function DemoNav({ current }: { current: Page }) {
  return (
    <nav className="demo-nav" aria-label="Demo pages">
      {PAGES.map((page) => (
        <Link
          key={page.id}
          href={page.href}
          className="demo-tab"
          aria-current={page.id === current ? 'page' : undefined}
        >
          {page.label}
        </Link>
      ))}
      <a href={ALL_DEMOS_URL} className="demo-tab demo-nav__home">
        ← Tất cả demo
      </a>
    </nav>
  );
}
