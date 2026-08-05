import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Reads a demo's own source so the page can show it next to the running form.
 *
 * Called from a Server Component, and every route here is statically exported,
 * so this runs at build time and the text is baked into the page - no runtime
 * fetch, and the snippet on screen is by construction the code that rendered
 * the demo above it.
 *
 * @param file path relative to `app/`, e.g. `wizard/demo.tsx`
 */
export function readDemoSource(file: string): string {
  return readFileSync(join(process.cwd(), 'app', file), 'utf8');
}
