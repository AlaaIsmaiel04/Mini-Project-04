import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
function discover(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? discover(path) : entry.name.endsWith('.spec.ts') ? [path] : [];
  });
}
const files = discover('src');
if (!files.length) { console.log('No API feature tests yet. Members must add tests alongside their implementation.'); process.exit(0); }
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files], { stdio: 'inherit', windowsHide: true });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
