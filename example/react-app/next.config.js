const path = require('path');

// Set by the Pages workflow to '/dynamic-field-kit/react'. Empty locally, so
// `next dev` and `next build` keep serving the app at the root.
const basePath = process.env.PAGES_BASE_PATH || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence turbopack root warning in monorepos by explicitly setting the root
  turbopack: {
    root: path.resolve(__dirname, '../../'),
  },
  // Static HTML export. Every route here is already prerendered, and this is
  // what lets the demo be served from GitHub Pages.
  output: 'export',
  basePath,
  assetPrefix: basePath || undefined,
  // Pages has no Next image optimizer behind it.
  images: { unoptimized: true },
  // Emit `wizard/index.html` rather than `wizard.html`, so a static host
  // resolves /wizard without needing a rewrite rule.
  trailingSlash: true,
};

module.exports = nextConfig;
