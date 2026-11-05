// اختبارات بواسطة Codex — تشغيل اختبارات القبول على قاعدة منفصلة.
// Runs only on an explicitly supplied, dedicated PostgreSQL test database.
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

const root = fileURLToPath(new URL('..', import.meta.url));
const api = fileURLToPath(new URL('../apps/api/', import.meta.url));
const require = createRequire(import.meta.url);
const localTestEnv = join(root, '.local', 'test.env');
if (!process.env.TEST_DATABASE_URL && existsSync(localTestEnv))
  loadEnvFile(localTestEnv);
const databaseUrl = process.env.TEST_DATABASE_URL;
if (
  !databaseUrl ||
  !/^\/smartshelf_test(?:_[a-z0-9_]+)?$/.test(new URL(databaseUrl).pathname)
) {
  throw new Error(
    'Set TEST_DATABASE_URL to a separate database named smartshelf_test or smartshelf_test_<suffix>.',
  );
}
const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  JWT_SECRET: randomBytes(48).toString('hex'),
  BUSINESS_TIME_ZONE: 'Asia/Amman',
  RUN_DB_TESTS: 'true',
};
function run(args, cwd = root) {
  const result = spawnSync(process.execPath, args, {
    cwd,
    env,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const prisma = join(
  dirname(require.resolve('prisma/package.json')),
  'build/index.js',
);
const tsc = require.resolve('typescript/bin/tsc');
run([prisma, 'generate'], api);
run([prisma, 'migrate', 'deploy'], api);
run([tsc, '-p', 'packages/contracts/tsconfig.json']);
run([tsc, '-p', 'apps/api/tsconfig.json']);
run(['--import', 'tsx', '--test', 'src/inventory.integration.spec.ts'], api);
