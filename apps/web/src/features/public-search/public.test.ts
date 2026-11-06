import test from 'node:test';
import assert from 'node:assert/strict';
import type { PublicPharmacy } from '@smartshelf/contracts';
import { createPublicService, publicPharmacy, jordanTime } from './public-api';

test('public requests encode filters, require medicine text and do not send staff credentials', async () => {
  const original = globalThis.fetch;
  const calls: { url: string; init?: RequestInit }[] = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ items: [], total: 0 }));
  };
  try {
    const api = createPublicService();
    await assert.rejects(api.searchMedicines({ q: '   ' }));
    assert.equal(calls.length, 0);
    await api.searchMedicines({
      q: '  amox & test ',
      area: ' North ',
      onDutyNow: false,
    });
    const url = new URL(calls[0].url, 'http://test');
    assert.equal(url.searchParams.get('q'), 'amox & test');
    assert.equal(url.searchParams.get('area'), 'North');
    assert.equal(url.searchParams.get('onDutyNow'), 'false');
    assert.equal(
      new Headers(calls[0].init?.headers).has('Authorization'),
      false,
    );
    const controller = new AbortController();
    await api.listPublicPharmacies(
      { onDutyNow: true, q: 'must not be sent' } as { onDutyNow: boolean },
      controller.signal,
    );
    assert.equal(calls[1].init?.signal, controller.signal);
    assert.equal(
      new URL(calls[1].url, 'http://test').searchParams.has('q'),
      false,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test('public allowlist strips private and nested fields and handles nullable dates', () => {
  const row = publicPharmacy({
    name: 'A',
    area: 'B',
    address: 'C',
    phone: '123',
    onDutyNow: true,
    currentDuty: {
      startsAt: '2026-11-06T00:00:00Z',
      endsAt: '2026-11-06T05:00:00Z',
      id: 'private',
    },
    nextDuty: null,
    inventoryUpdatedAt: null,
    quantity: 42,
    unitCost: '99',
    passwordHash: 'private',
  } as unknown as PublicPharmacy);
  assert.deepEqual(
    Object.keys(row).sort(),
    [
      'name',
      'area',
      'address',
      'phone',
      'onDutyNow',
      'currentDuty',
      'nextDuty',
      'inventoryUpdatedAt',
    ].sort(),
  );
  assert.deepEqual(Object.keys(row.currentDuty!).sort(), [
    'endsAt',
    'startsAt',
  ]);
  assert.equal(jordanTime('invalid', 'en'), null);
  assert.match(jordanTime('2026-11-06T00:00:00Z', 'en')!, /03:00/);
});

test('public 503 and network errors reject without a sample fallback', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ message: 'Unavailable' }), { status: 503 });
    await assert.rejects(createPublicService().searchMedicines({ q: 'test' }), {
      status: 503,
    });
    globalThis.fetch = async () => {
      throw new TypeError('offline');
    };
    await assert.rejects(
      createPublicService().listPublicPharmacies({}),
      /offline/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
