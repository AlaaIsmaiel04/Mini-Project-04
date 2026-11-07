import assert from 'node:assert/strict';

// Test only: helpers for the specs that check what a response may contain.

const ERROR_KEYS = ['error', 'message', 'statusCode'];
const ANY_ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Every key in a JSON value, at any depth, once each and sorted. */
export function keyPaths(value: unknown): string[] {
  const walk = (node: unknown, path: string): string[] => {
    if (Array.isArray(node)) {
      return node.flatMap((item) => walk(item, `${path}[]`));
    }
    if (node === null || typeof node !== 'object') return [];
    return Object.entries(node).flatMap(([key, child]) => {
      const childPath = path ? `${path}.${key}` : key;
      return [childPath, ...walk(child, childPath)];
    });
  };
  return [...new Set(walk(value, ''))].sort();
}

export function assertNoValues(text: string, values: string[]): void {
  for (const value of values) {
    assert.equal(text.includes(value), false, `leaked ${value} in ${text}`);
  }
}

/** The contract's error shape, with no ID and none of the given private values. */
export async function assertCleanError(
  response: Response,
  status: number,
  privateValues: string[],
): Promise<void> {
  const text = await response.text();
  const body = JSON.parse(text);

  assert.equal(response.status, status, text);
  assert.equal(body.statusCode, status);
  assert.deepEqual(
    keyPaths(body).filter((key) => !ERROR_KEYS.includes(key)),
    [],
  );
  assertNoValues(text, privateValues);
  assert.equal(ANY_ID.test(text), false, `leaked an ID in ${text}`);
}
