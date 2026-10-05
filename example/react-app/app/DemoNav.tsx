'use client';

import Link from 'next/link';
import { lang, setLang, t } from '../../shared/i18n';

/**
 * Absolute rather than relative: the landing page only exists on the deployed
 * Pages site, one level above each app's base path. A relative `../` would
 * resolve to nothing when running the demo locally.
 */
export const ALL_DEMOS_URL = 'https://vannt-dev.github.io/dynamic-field-kit/';

export type Page = 'basics' | 'new-features' | 'wizard' | 'schema-form';

export const PAGES: {
  id: Page;
  href: string;
  label: string;
  title: string;
  intro: string;
}[] = [
  {
    id: 'basics',
    href: '/',
    label: t('Basics'),
    title: 'Dynamic Field Kit — React',
    intro: t(
      'Registering renderers with fieldRegistry, MultiFieldInput, layouts, computed fields (computeValue) and repeatable groups.',
    ),
  },
  {
    id: 'new-features',
    href: '/new-features',
    label: 'Form state',
    title: t('Form state with useDynamicForm'),
    intro: t(
      'The hook owns data, errors, touched and submit state; DynamicFormDevTools sits in the corner.',
    ),
  },
  {
    id: 'wizard',
    href: '/wizard',
    label: 'Wizard',
    title: 'Multi-Step Wizard',
    intro: t(
      'createWizardState, validateStep, goNext / goPrev. State is immutable: every navigation returns a new state.',
    ),
  },
  {
    id: 'schema-form',
    href: '/schema-form',
    label: 'JSON Schema + Undo',
    title: t('JSON Schema, drafts and Undo / Redo'),
    intro: t(
      'fieldsFromJsonSchema builds the form from a JSON Schema, createFormDraft keeps the data across reloads, createFormHistory gives undo / redo.',
    ),
  },
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
      <span className="demo-lang" role="group" aria-label="Language">
        <button
          type="button"
          aria-pressed={lang === 'en'}
          onClick={() => setLang('en')}
        >
          EN
        </button>
        <button
          type="button"
          aria-pressed={lang === 'vi'}
          onClick={() => setLang('vi')}
        >
          VI
        </button>
      </span>
      <a href={ALL_DEMOS_URL} className="demo-tab">
        {t('← All demos')}
      </a>
    </nav>
  );
}
