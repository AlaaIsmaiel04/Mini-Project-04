// Start/stop the optional local cluster prepared for this checkout.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const data = join(root, '.local', 'postgres');
const action = process.argv[2] ?? 'start';
if (!['start', 'stop', 'status'].includes(action))
  throw new Error('Use start, stop or status.');
if (!existsSync(join(data, 'PG_VERSION'))) {
  throw new Error(
    'This checkout has no .local/postgres cluster. Follow docs/LOCAL-SETUP.md to configure PostgreSQL.',
  );
}
const bin =
  process.env.PG_BIN ??
  (process.platform === 'win32' ? 'C:/Program Files/PostgreSQL/18/bin' : '');
const pgCtl = bin
  ? join(bin, process.platform === 'win32' ? 'pg_ctl.exe' : 'pg_ctl')
  : 'pg_ctl';
const status = spawnSync(pgCtl, ['-D', data, 'status'], {
  windowsHide: true,
  encoding: 'utf8',
});
if (status.error) throw status.error;
if (action === 'status') {
  process.stdout.write(status.stdout ?? '');
  process.exit(status.status ?? 1);
}
if (
  (action === 'start' && status.status === 0) ||
  (action === 'stop' && status.status === 3)
) {
  console.log(
    action === 'start'
      ? 'Local PostgreSQL is already running.'
      : 'Local PostgreSQL is already stopped.',
  );
  process.exit(0);
}
const args =
  action === 'start'
    ? [
        '-D',
        data,
        '-l',
        join(root, '.local', 'postgres.log'),
        '-o',
        '-p 55433 -h 127.0.0.1',
        '-w',
        'start',
      ]
    : ['-D', data, '-m', 'fast', '-w', 'stop'];
const result = spawnSync(pgCtl, args, { windowsHide: true, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
