#!/usr/bin/env node
// Verify that every symbol the docs import from a @dynamic-field-kit package
// is actually exported by it. Documentation drifts silently: a rename lands,
// the READMEs keep the old name, and nothing fails until a reader copies the
// snippet. Only import statements inside fenced code blocks are checked -
// they are unambiguous, unlike prose, and they are what people copy.
//
// Exports are read from each package's built .d.ts through the TypeScript
// compiler, so type-only exports count too. Packages that are not built are
// skipped, the way the other integration checks skip.

const fs = require('fs');
const path = require('path');

const PACKAGES = ['core', 'react', 'vue', 'angular'];

const DOC_GLOBS = [
  'README.md',
  'docs',
  ...PACKAGES.map((p) => path.join('packages', p, 'README.md')),
];

const FENCE = /^```([A-Za-z0-9]*)\s*$/;
const CODE_LANGS = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'typescript',
  'javascript',
]);

// [^{}] rather than [\s\S] so the span cannot run from one import statement
// through the next: `import { h } from 'vue'` sitting above an import of this
// package was otherwise read as a single statement, and every name in the
// first one was reported as missing.
const IMPORT =
  /import\s*\{([^{}]*)\}\s*from\s*['"]@dynamic-field-kit\/([a-z]+)['"]/g;

/** Named imports of @dynamic-field-kit packages inside fenced code blocks. */
function collectDocImports(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

  // Blank out everything that is not inside a code fence, keeping line numbers
  // intact so a problem can point at the real line.
  let lang = null;
  const code = lines.map((line) => {
    const fence = FENCE.exec(line);
    if (fence) {
      lang = lang === null ? fence[1].toLowerCase() : null;
      return '';
    }
    return lang !== null && CODE_LANGS.has(lang) ? line : '';
  });

  const text = code.join('\n');
  const found = [];
  for (const match of text.matchAll(IMPORT)) {
    const line = text.slice(0, match.index).split('\n').length;
    const names = match[1]
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      // `type Foo`, `Foo as Bar` - the exported name is the first identifier.
      .map((part) =>
        part
          .replace(/^type\s+/, '')
          .split(/\s+as\s+/)[0]
          .trim(),
      )
      .filter((name) => /^[A-Za-z_$][\w$]*$/.test(name));

    for (const name of names) {
      found.push({ pkg: match[2], name, line });
    }
  }
  return found;
}

/** One message per documented import the package does not export. */
function findDocApiProblems(files, exportsByPackage) {
  return files.flatMap((file) =>
    collectDocImports(file)
      .filter(({ pkg, name }) => {
        const exported = exportsByPackage[pkg];
        // A package that was not built is not evidence of anything.
        return exported !== undefined && !exported.has(name);
      })
      .map(
        ({ pkg, name, line }) =>
          `${path.basename(file)}:${line} imports ${name} from @dynamic-field-kit/${pkg}, which does not export it`,
      ),
  );
}

function typesEntry(root, pkg) {
  const dir = path.join(root, 'packages', pkg);
  const manifestPath = path.join(dir, 'package.json');
  if (!fs.existsSync(manifestPath)) {
    return undefined;
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const declared = manifest.types || manifest.typings;
  if (!declared) {
    return undefined;
  }
  const entry = path.join(dir, declared);
  return fs.existsSync(entry) ? entry : undefined;
}

/** Exported names per package, read from the built declarations. */
function collectExports(root) {
  // Resolved lazily so the unit tests can exercise the pure functions above
  // without TypeScript or a build.
  const ts = require('typescript');
  const byPackage = {};

  for (const pkg of PACKAGES) {
    const entry = typesEntry(root, pkg);
    if (!entry) {
      continue;
    }
    const program = ts.createProgram([entry], {
      noEmit: true,
      skipLibCheck: true,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    });
    const source = program.getSourceFile(entry);
    const symbol =
      source && program.getTypeChecker().getSymbolAtLocation(source);
    if (!symbol) {
      continue;
    }
    byPackage[pkg] = new Set(
      program
        .getTypeChecker()
        .getExportsOfModule(symbol)
        .map((s) => s.getName()),
    );
  }

  return byPackage;
}

function docFiles(root) {
  return DOC_GLOBS.flatMap((entry) => {
    const full = path.join(root, entry);
    if (!fs.existsSync(full)) {
      return [];
    }
    if (fs.statSync(full).isDirectory()) {
      return fs
        .readdirSync(full)
        .filter((f) => f.endsWith('.md'))
        .map((f) => path.join(full, f));
    }
    return [full];
  });
}

module.exports = {
  collectDocImports,
  findDocApiProblems,
  collectExports,
  docFiles,
};

if (require.main === module) {
  const root = process.cwd();
  const exportsByPackage = collectExports(root);

  if (Object.keys(exportsByPackage).length === 0) {
    console.log('Docs API check skipped: no package has been built yet.');
    process.exit(0);
  }

  const problems = findDocApiProblems(docFiles(root), exportsByPackage);
  if (problems.length > 0) {
    console.error('Documented imports that do not exist:');
    for (const problem of problems) {
      console.error(`  - ${problem}`);
    }
    process.exit(1);
  }

  console.log(
    `Docs API check passed: every documented import resolves against ${Object.keys(exportsByPackage).join(', ')}.`,
  );
}
