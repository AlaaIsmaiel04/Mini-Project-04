// اختبارات بواسطة Codex — تحديث وتشغيل فحص بدء التطبيق وSwagger.
// Run after npm run build and db:deploy. Requires apps/api/.env with a working database.
// Uses separate ports and does not create or modify business records.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const requireWeb = createRequire(
  new URL('../apps/web/package.json', import.meta.url),
);
const vite = join(
  dirname(requireWeb.resolve('vite/package.json')),
  'bin/vite.js',
);
const children = [];
function start(args, cwd, env = {}) {
  const child = spawn(process.execPath, args, {
    cwd,
    env: { ...process.env, ...env },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk;
  });
  child.stderr.on('data', (chunk) => {
    output += chunk;
  });
  children.push(child);
  child.on('error', (error) => {
    output += error.message;
  });
  return () => output;
}
async function waitFor(url, output) {
  for (let i = 0; i < 80; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {
      /* server booting */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not start: ${url}\n${output()}`);
}
try {
  const apiLog = start(['dist/main.js'], join(root, 'apps/api'), {
    PORT: '3301',
  });
  const webLog = start(
    [vite, 'preview', '--host', '127.0.0.1', '--port', '5317', '--strictPort'],
    join(root, 'apps/web'),
  );
  const health = await (
    await waitFor('http://127.0.0.1:3301/api/health', apiLog)
  ).json();
  assert.equal(health.status, 'ok');
  assert.equal(health.stage, 'foundation');
  const swagger = await (
    await fetch('http://127.0.0.1:3301/api/docs-json')
  ).json();
  assert.ok(swagger.paths['/api/health']);
  assert.ok(swagger.paths['/api/auth/login'].post);
  assert.ok(swagger.paths['/api/auth/me'].get);
  assert.ok(swagger.paths['/api/pharmacist/medicines'].get);
  assert.ok(swagger.paths['/api/pharmacist/medicines'].post);
  assert.ok(swagger.paths['/api/pharmacist/medicines/{id}'].patch);
  assert.ok(swagger.paths['/api/pharmacist/medicines/{id}/batches'].post);
  assert.ok(swagger.paths['/api/pharmacist/batches/{id}'].patch);
  assert.ok(swagger.paths['/api/pharmacist/dashboard'].get);
  assert.ok(swagger.paths['/api/pharmacist/profile'].get);
  assert.ok(swagger.paths['/api/pharmacist/profile'].patch);
  assert.ok(swagger.paths['/api/pharmacist/duty-periods'].get);
  assert.ok(swagger.paths['/api/pharmacist/duty-periods'].post);
  assert.ok(swagger.paths['/api/pharmacist/duty-periods/{id}'].patch);
  assert.ok(swagger.paths['/api/pharmacist/duty-periods/{id}'].delete);
  assert.ok(swagger.paths['/api/public/pharmacies'].get);
  assert.ok(swagger.paths['/api/public/medicines'].get);
  assert.equal(
    (await fetch('http://127.0.0.1:3301/api/pharmacist/medicines')).status,
    401,
  );
  for (const route of ['dashboard', 'profile', 'duty-periods']) {
    assert.equal(
      (await fetch(`http://127.0.0.1:3301/api/pharmacist/${route}`)).status,
      401,
      `${route} must require sign-in`,
    );
  }
  assert.equal(
    (await fetch('http://127.0.0.1:3301/api/public/pharmacies')).status,
    200,
  );
  assert.equal(
    (await fetch('http://127.0.0.1:3301/api/public/medicines')).status,
    400,
    'Public medicine search must require a query',
  );
  assert.equal(
    (await fetch('http://127.0.0.1:3301/api/public/medicines?q=smoke-check'))
      .status,
    200,
    'Public medicine search must use the live store',
  );
  const html = await (await waitFor('http://127.0.0.1:5317', webLog)).text();
  assert.ok(html.includes('<title>SmartShelf</title>'));
  assert.ok(html.includes('/assets/'));
  console.log(
    'Smoke passed: API health, auth/inventory/dashboard/profile/duty/public Swagger, protected routes, live public reads and built frontend.',
  );
} finally {
  for (const child of children) child.kill();
}
