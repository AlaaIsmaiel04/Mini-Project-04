import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  readPharmacistActor,
  TemporaryPharmacistGuard,
} from './temporary-auth.adapter';
import { TemporarySubscriptionStatusAdapter } from './temporary-subscription-status.adapter';
import {
  TemporaryUnavailableDutyPeriodStore,
  TemporaryUnavailablePharmacyStore,
} from './temporary-unavailable-stores';

const PHARMACY_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '33333333-3333-4333-8333-333333333333';

describe('temporary adapters fail closed', () => {
  it('guard refuses every request', () => {
    assert.throws(
      () => new TemporaryPharmacistGuard().canActivate(),
      UnauthorizedException,
    );
  });

  it('subscription adapter never reports a status', async () => {
    await assert.rejects(
      new TemporarySubscriptionStatusAdapter().getEffectiveStatus(),
      ServiceUnavailableException,
    );
  });

  it('stores refuse instead of returning empty results', async () => {
    const pharmacies = new TemporaryUnavailablePharmacyStore();
    const duties = new TemporaryUnavailableDutyPeriodStore();

    await assert.rejects(pharmacies.list(), ServiceUnavailableException);
    await assert.rejects(pharmacies.findById(), ServiceUnavailableException);
    await assert.rejects(duties.listForPharmacy(), ServiceUnavailableException);
    await assert.rejects(
      duties.createIfNoOverlap(),
      ServiceUnavailableException,
    );
  });
});

describe('readPharmacistActor', () => {
  it('returns a complete pharmacist actor', () => {
    const actor = {
      userId: USER_ID,
      role: 'PHARMACIST' as const,
      pharmacyId: PHARMACY_ID,
    };

    assert.deepEqual(readPharmacistActor({ actor }), actor);
  });

  it('rejects a missing actor and a pharmacist without a pharmacy as 401', () => {
    const requests = [{}, { actor: { userId: USER_ID, role: 'PHARMACIST' } }];

    for (const request of requests) {
      assert.throws(() => readPharmacistActor(request), UnauthorizedException);
    }
  });

  it('rejects an owner as 403', () => {
    assert.throws(
      () =>
        readPharmacistActor({
          actor: { userId: USER_ID, role: 'OWNER', pharmacyId: null },
        }),
      ForbiddenException,
    );
  });
});
