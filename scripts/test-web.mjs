import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function discover(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory()
      ? discover(path)
      : entry.name.endsWith('.test.ts')
        ? [path]
        : [];
  });
}

const result = spawnSync(
  process.execPath,
  ['--import', 'tsx', '--test', ...discover('src')],
  {
    stdio: 'inherit',
    windowsHide: true,
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
