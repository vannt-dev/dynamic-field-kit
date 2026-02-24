// Registry demo: imports example registrations from React and Angular packages
// and prints the registered renderer for the 'text' key.
//
// To run this demo locally (developer machine) you can either:
// 1) Build packages and run with node (if you bundle/compile the TS files), or
// 2) Use ts-node to execute TypeScript directly:
//    npx ts-node --esm example/registry-demo.ts
//
// This demo is intentionally minimal: it demonstrates registration and retrieval
// from the shared `fieldRegistry` at runtime. It does not execute framework renderers.

import "../packages/react/src/examples/registerExample"
import "../packages/angular/src/examples/registerExample"

import { fieldRegistry } from "@dynamic-field-kit/core"

const renderer = (fieldRegistry as any).get("text")
console.log("Registered renderer for 'text':", renderer)

if (!renderer) process.exitCode = 2
