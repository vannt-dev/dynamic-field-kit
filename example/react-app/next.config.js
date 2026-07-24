const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence turbopack root warning in monorepos by explicitly setting the root
  turbopack: {
    root: path.resolve(__dirname, '../../'),
  },
};

module.exports = nextConfig;
