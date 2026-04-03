#!/usr/bin/env node
const { spawnSync } = require('child_process');

function runBuild() {
  const res = spawnSync('npm', ['run', 'build', '--workspaces'], {
    stdio: 'inherit',
    shell: true,
    windowsHide: false,
  });
  return res.status === 0;
}

console.log('Attempting full workspace build...');
let ok = runBuild();
if (!ok) {
  // naive heuristic: detect common core resolution errors and retry once
  console.log('Initial build failed. Checking for core resolution hints...');
  // In a real environment, you would parse logs; here we'll retry once unconditionally after a short delay
  const delay = 3000;
  console.log(`Waiting ${delay / 1000}s before retry...`);
  return new Promise((resolve) => setTimeout(resolve, delay)).then(() => {
    console.log('Retrying build...');
    const retryOk = runBuild();
    if (!retryOk) {
      console.error(
        'Adapter/core build failed after retry. Exiting with error.'
      );
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
}
process.exit(0);
