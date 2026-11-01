// Run after npm run build. Uses separate ports and no real database or accounts.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const requireWeb = createRequire(new URL('../apps/web/package.json', import.meta.url));
const vite = join(dirname(requireWeb.resolve('vite/package.json')), 'bin/vite.js');
const children = [];
function start(args, cwd, env = {}) {
  const child = spawn(process.execPath, args, { cwd, env: { ...process.env, ...env }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  children.push(child);
  child.on('error', (error) => { output += error.message; });
  return () => output;
}
async function waitFor(url, output) {
  for (let i = 0; i < 80; i++) {
    try { const response = await fetch(url); if (response.ok) return response; } catch { /* server booting */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not start: ${url}\n${output()}`);
}
try {
  const apiLog = start(['dist/main.js'], join(root, 'apps/api'), { PORT: '3301' });
  const webLog = start([vite, 'preview', '--host', '127.0.0.1', '--port', '5317', '--strictPort'], join(root, 'apps/web'));
  const health = await (await waitFor('http://127.0.0.1:3301/api/health', apiLog)).json();
  assert.equal(health.status, 'ok'); assert.equal(health.stage, 'foundation');
  const swagger = await (await fetch('http://127.0.0.1:3301/api/docs-json')).json();
  assert.ok(swagger.paths['/api/health']);
  const html = await (await waitFor('http://127.0.0.1:5317', webLog)).text();
  assert.ok(html.includes('<title>SmartShelf</title>'));
  assert.ok(html.includes('/assets/'));
  console.log('Smoke passed: foundation API health, Swagger and built frontend.');
} finally {
  for (const child of children) child.kill();
}
