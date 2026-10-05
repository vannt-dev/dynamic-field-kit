// Builds the handbook's pages from the documentation that already lives in the
// repository: the package READMEs, the root README and docs/. Nothing is
// written twice - edit the README, and the handbook follows on the next build.
//
// Output goes to guide/, frameworks/ and more/, which are gitignored.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HANDBOOK = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = resolve(HANDBOOK, '..');
const BLOB = 'https://github.com/vannt-dev/dynamic-field-kit/blob/master/';

const CORE = 'packages/core/README.md';
const ROOT = 'README.md';

/**
 * One entry per page. `sections` picks `## ` sections out of the source by
 * heading; without it the whole file is used, minus the sections in `drop`.
 */
const PAGES = [
  {
    out: 'guide/getting-started.md',
    title: 'Getting started',
    source: ROOT,
    sections: [
      'Installation',
      'Core Concepts',
      'Defining Field Types (App Side)',
    ],
  },
  {
    out: 'guide/fields.md',
    title: 'Describing fields',
    source: CORE,
    sections: ['Shared types', 'Example schema'],
  },
  {
    out: 'guide/computed-fields.md',
    title: 'Computed fields',
    source: CORE,
    sections: ['Derived fields with `computeValue`'],
  },
  {
    out: 'guide/validation.md',
    title: 'Validation and conditions',
    source: CORE,
    sections: ['Validation & conditions'],
  },
  {
    out: 'guide/groups.md',
    title: 'Repeatable groups',
    source: CORE,
    sections: ['Repeatable field groups', 'Group array helpers'],
  },
  {
    out: 'guide/json-schema.md',
    title: 'Fields from a JSON Schema',
    source: CORE,
    sections: ['Fields from a JSON Schema'],
  },
  {
    out: 'guide/drafts.md',
    title: 'Saving a draft',
    source: CORE,
    sections: ['Saving a draft'],
  },
  {
    out: 'guide/undo-redo.md',
    title: 'Undo and redo',
    source: CORE,
    sections: ['Undo and redo'],
  },
  {
    out: 'guide/wizard.md',
    title: 'Multi-step wizard',
    source: CORE,
    sections: ['Multi-step wizard'],
  },
  {
    out: 'guide/registries.md',
    title: 'Registries',
    source: CORE,
    sections: ['Scoped registries', 'Register renderers through an adapter'],
  },
  {
    out: 'frameworks/react.md',
    title: 'React',
    source: 'packages/react/README.md',
    drop: ['License'],
  },
  {
    out: 'frameworks/vue.md',
    title: 'Vue 3',
    source: 'packages/vue/README.md',
    drop: ['License'],
  },
  {
    out: 'frameworks/angular.md',
    title: 'Angular',
    source: 'packages/angular/README.md',
    drop: ['License'],
  },
  {
    out: 'more/ui-kit-recipes.md',
    title: 'UI kit recipes',
    source: 'docs/ui-kit-recipes.md',
  },
  {
    out: 'more/migrating.md',
    title: 'Migrating',
    source: 'docs/MIGRATING.md',
  },
];

/** Headings carry emoji in the root README; the handbook's do not. */
const plain = (heading) =>
  heading
    .replace(/[\p{Extended_Pictographic}️]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Close to the slugs VitePress generates, which is all the link map needs. */
const slug = (heading) =>
  plain(heading)
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');

/** Splits a file into its preamble and its `## ` sections, fences respected. */
function split(markdown) {
  const preamble = [];
  const sections = [];
  let current;
  let fence = false;
  for (const line of markdown.split('\n')) {
    if (/^(```|~~~)/.test(line.trim())) fence = !fence;
    const match = !fence && /^## (.+)$/.exec(line);
    if (match) {
      current = { heading: plain(match[1]), lines: [`## ${plain(match[1])}`] };
      sections.push(current);
    } else if (current) {
      current.lines.push(line);
    } else {
      preamble.push(line);
    }
  }
  return { preamble, sections };
}

const routeOf = (page) => `/${page.out.replace(/\.md$/, '')}`;

/** Headings that became a page title: a link to one goes to the page itself. */
const titleAnchors = new Map();

function body(page) {
  const { preamble, sections } = split(
    readFileSync(join(REPO, page.source), 'utf8').replace(/\r\n/g, '\n'),
  );

  if (page.sections) {
    // A page made of one section already has that section's name as its title.
    const single = page.sections.length === 1;
    return page.sections
      .map((wanted) => {
        const found = sections.find((s) => s.heading === plain(wanted));
        if (!found) {
          throw new Error(`${page.source}: no section "## ${wanted}"`);
        }
        if (single) {
          titleAnchors.set(
            `${page.source}#${slug(found.heading)}`,
            routeOf(page),
          );
        }
        return (single ? found.lines.slice(1) : found.lines).join('\n').trim();
      })
      .join('\n\n');
  }

  // Whole file: its own title and badges go, the introduction stays.
  const intro = preamble
    .filter(
      (line) => !/^# /.test(line) && !/^\s*(\[!\[|<img|<p|<\/p)/.test(line),
    )
    .join('\n')
    .trim();
  const kept = sections
    .filter((s) => !(page.drop ?? []).includes(s.heading))
    .map((s) => s.lines.join('\n').trimEnd());
  return [intro, ...kept].filter(Boolean).join('\n\n');
}

const pages = PAGES.map((page) => ({ ...page, body: body(page) }));

/** Where every heading ended up, so a link into another page can follow it. */
const anchors = new Map();
const sourcePages = new Map();
for (const page of pages) {
  const route = `/${page.out.replace(/\.md$/, '')}`;
  if (!page.sections && !sourcePages.has(page.source)) {
    sourcePages.set(page.source, route);
  }
  let fence = false;
  for (const line of page.body.split('\n')) {
    if (/^(```|~~~)/.test(line.trim())) fence = !fence;
    const match = !fence && /^#{2,4} (.+)$/.exec(line);
    if (match) {
      const key = `${page.source}#${slug(match[1])}`;
      if (!anchors.has(key)) anchors.set(key, route);
    }
  }
}
// The core README is spread over the guide; a bare link to it lands here.
sourcePages.set(CORE, '/guide/fields');
sourcePages.set(ROOT, '/guide/getting-started');

function rewriteLinks(page) {
  const route = `/${page.out.replace(/\.md$/, '')}`;
  const sourceDir = posix.dirname(page.source);

  const rewrite = (target) => {
    if (/^(https?:|mailto:)/.test(target)) return target;

    const [path, hash = ''] = target.split('#');
    const file = path
      ? posix.normalize(posix.join(sourceDir, path))
      : page.source;

    if (hash && titleAnchors.has(`${file}#${hash}`)) {
      return titleAnchors.get(`${file}#${hash}`);
    }
    if (hash) {
      const home = anchors.get(`${file}#${hash}`);
      if (home) return home === route ? `#${hash}` : `${home}#${hash}`;
    }
    if (!path) return target;
    if (sourcePages.has(file)) {
      return sourcePages.get(file) + (hash ? `#${hash}` : '');
    }
    // Anything else is a file in the repository, not a handbook page.
    return BLOB + file.replace(/^(\.\.\/)+/, '') + (hash ? `#${hash}` : '');
  };

  let fence = false;
  return page.body
    .split('\n')
    .map((line) => {
      if (/^(```|~~~)/.test(line.trim())) fence = !fence;
      if (fence) return line;
      return line.replace(
        /(!?)\[([^\]]*)\]\(([^)\s]+)\)/g,
        (whole, bang, text, target) =>
          bang ? whole : `[${text}](${rewrite(target)})`,
      );
    })
    .join('\n');
}

for (const dir of ['guide', 'frameworks', 'more']) {
  rmSync(join(HANDBOOK, dir), { recursive: true, force: true });
}

for (const page of pages) {
  const file = join(HANDBOOK, page.out);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(
    file,
    [
      '---',
      `title: ${page.title}`,
      `source: ${page.source}`,
      '---',
      '',
      `# ${page.title}`,
      '',
      rewriteLinks(page),
      '',
    ].join('\n'),
  );
}

console.log(`handbook: wrote ${pages.length} pages from the repository's docs`);
