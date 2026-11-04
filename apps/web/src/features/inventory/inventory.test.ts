import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import type { UpdateBatchInput } from '@smartshelf/contracts';
import { createInventoryService } from './inventory-api';
import { ApiRequestError } from '../../lib/api';
import {
  calendarDate,
  decimalCost,
  nonNegativeNumber,
  requiredText,
  wholeNumber,
} from './inventory-validation';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('batch PATCH excludes immutable fields even when the caller supplies extra runtime fields', async () => {
  let request: RequestInit | undefined;
  let url: string | undefined;
  globalThis.fetch = async (input, init) => {
    url = String(input);
    request = init;
    return Response.json({ id: 'batch-1' });
  };
  const service = createInventoryService('test-token', () => {});
  await service.updateBatch('batch/1', {
    quantity: 0,
    expiryDate: '2026-10-01',
    storageLocation: 'Shelf A',
    batchNumber: 'DO-NOT-SEND',
    unitCost: '99.00',
    barcode: 'DO-NOT-SEND',
  } as UpdateBatchInput);
  assert.equal(url, '/api/pharmacist/batches/batch%2F1');
  assert.equal(request?.method, 'PATCH');
  assert.equal(
    new Headers(request?.headers).get('Authorization'),
    'Bearer test-token',
  );
  assert.deepEqual(JSON.parse(String(request?.body)), {
    quantity: 0,
    expiryDate: '2026-10-01',
    storageLocation: 'Shelf A',
  });
});

test('create medicine and batch use agreed endpoints and preserve decimal costs as strings', async () => {
  const calls: { url: string; method?: string; body: unknown }[] = [];
  globalThis.fetch = async (url, init) => {
    calls.push({
      url: String(url),
      method: init?.method,
      body: JSON.parse(String(init?.body)),
    });
    return Response.json({ id: 'created' }, { status: 201 });
  };
  const service = createInventoryService('token', () => {});
  await service.createMedicine({
    displayName: 'Medicine',
    scientificName: 'Scientific',
    category: 'Category',
    reorderThreshold: 0,
  });
  await service.createBatch('med/1', {
    batchNumber: 'B1',
    quantity: 0,
    expiryDate: '2026-10-01',
    storageLocation: 'A',
    unitCost: '2.50',
  });
  assert.equal(calls[0].url, '/api/pharmacist/medicines');
  assert.equal(calls[1].url, '/api/pharmacist/medicines/med%2F1/batches');
  assert.ok(calls.every((call) => call.method === 'POST'));
  assert.equal((calls[1].body as { unitCost: string }).unitCost, '2.50');
  assert.equal('pharmacyId' in (calls[0].body as object), false);
});

test('401 clears stale session; 403 and validation arrays preserve server reasons', async () => {
  let expired = 0;
  const service = createInventoryService('token', () => {
    expired += 1;
  });
  globalThis.fetch = async () =>
    Response.json({ message: 'Expired' }, { status: 401 });
  await assert.rejects(
    service.list({}),
    (error) =>
      error instanceof ApiRequestError &&
      error.status === 401 &&
      /session has expired/.test(error.message),
  );
  assert.equal(expired, 1);
  globalThis.fetch = async () =>
    Response.json(
      { message: 'Subscription is SUSPENDED. Changes are forbidden.' },
      { status: 403 },
    );
  await assert.rejects(
    service.createMedicine({
      displayName: 'A',
      scientificName: 'B',
      category: 'C',
      reorderThreshold: 1,
    }),
    /SUSPENDED/,
  );
  assert.equal(expired, 1);
  globalThis.fetch = async () =>
    Response.json(
      { message: ['Invalid date.', 'Quantity must be an integer.'] },
      { status: 400 },
    );
  await assert.rejects(
    service.list({}),
    /Invalid date\. Quantity must be an integer\./,
  );
});

test('filters are encoded and failed requests never return synthetic inventory', async () => {
  globalThis.fetch = async (url) => {
    assert.equal(
      String(url),
      '/api/pharmacist/medicines?q=A%26B&status=LOW_STOCK',
    );
    return Response.json({ message: 'Medicine not found.' }, { status: 404 });
  };
  await assert.rejects(
    createInventoryService('token', () => {}).list({
      q: ' A&B ',
      status: 'LOW_STOCK',
    }),
    /Medicine not found/,
  );
  globalThis.fetch = async () => {
    throw new TypeError('Network unavailable');
  };
  await assert.rejects(
    createInventoryService('token', () => {}).list({}),
    /Network unavailable/,
  );
});

test('stock form validation accepts zero and historical dates but rejects invalid inputs', () => {
  assert.equal(nonNegativeNumber('1.5', 'Threshold'), 1.5);
  for (const value of ['', '-1', 'Infinity'])
    assert.throws(() => nonNegativeNumber(value, 'Threshold'));
  assert.equal(wholeNumber('0', 'Quantity'), 0);
  for (const value of ['', ' ', '-1', '1.5', 'Infinity', '9007199254740992'])
    assert.throws(() => wholeNumber(value, 'Quantity'));
  assert.equal(calendarDate('2024-02-29'), '2024-02-29');
  assert.equal(calendarDate('2020-01-01'), '2020-01-01');
  for (const value of [
    '2026-02-29',
    '2026-02-30',
    '2026-13-01',
    '2026-1-1',
    'invalid',
  ])
    assert.throws(() => calendarDate(value));
  assert.equal(decimalCost(' 2.50 '), '2.50');
  assert.equal(decimalCost('0'), '0');
  for (const value of ['', '-1', '1.001', 'NaN', '1e3'])
    assert.throws(() => decimalCost(value));
  assert.equal(requiredText(' Name ', 'Display name'), 'Name');
  assert.throws(
    () => requiredText('  ', 'Display name'),
    /Display name is required/,
  );
});
