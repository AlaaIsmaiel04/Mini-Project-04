import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import { createPharmacyService } from './pharmacy-api';
import { createDashboardService } from '../dashboard/dashboard-api';
test('profile/duty requests allowlist fields, scope IDs in URLs and handle empty deletes', async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchMock = mock.method(
    globalThis,
    'fetch',
    async (input: unknown, init: RequestInit) => {
      calls.push({ url: String(input), init });
      return new Response(init.method === 'DELETE' ? null : '{}', {
        status: init.method === 'DELETE' ? 204 : 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  );
  try {
    const api = createPharmacyService('test-token', () => {});
    await api.updateProfile({
      area: 'North',
      address: 'Street 1',
      phone: '1234567',
      pharmacyId: 'other',
      name: 'Not editable',
    } as any);
    assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
      area: 'North',
      address: 'Street 1',
      phone: '1234567',
    });
    await api.saveDuty(
      {
        startsAt: '2026-11-05T17:00:00Z',
        endsAt: '2026-11-05T18:00:00Z',
        pharmacyId: 'other',
      } as any,
      'a/b',
    );
    assert.equal(calls[1].url, '/api/pharmacist/duty-periods/a%2Fb');
    assert.equal(calls[1].init.method, 'PATCH');
    assert.deepEqual(
      Object.keys(JSON.parse(String(calls[1].init.body))).sort(),
      ['endsAt', 'startsAt'],
    );
    await api.deleteDuty('id');
    await createDashboardService('test-token', () => {}).get();
    assert.equal(calls[3].url, '/api/pharmacist/dashboard');
    assert.equal(
      new Headers(calls[3].init.headers).get('Authorization'),
      'Bearer test-token',
    );
  } finally {
    fetchMock.mock.restore();
  }
});
