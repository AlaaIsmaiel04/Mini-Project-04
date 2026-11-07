import assert from 'node:assert/strict';
import { after, before, describe, it, mock } from 'node:test';
import {
  type ExecutionContext,
  ForbiddenException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  JwtPharmacistGuard,
  readPharmacistActor,
} from './jwt-pharmacist.guard';

const PHARMACY_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '33333333-3333-4333-8333-333333333333';

describe('JwtPharmacistGuard', () => {
  const contextFor = (request: object) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  // Stands in for Mustafa's guard, which sets the actor from the database account.
  const sharedGuardSigningIn = (account: object) =>
    ({
      canActivate: async ({ switchToHttp }: ExecutionContext) => {
        switchToHttp().getRequest<{ actor: object }>().actor = account;
        return true;
      },
    }) as never;

  before(() => {
    mock.method(Logger.prototype, 'warn', () => undefined);
  });

  after(() => mock.restoreAll());

  it('refuses every request when the shared JWT guard is not bound', () => {
    assert.throws(
      () => new JwtPharmacistGuard().canActivate(),
      UnauthorizedException,
    );
  });

  it('takes the actor from the shared guard, not from the caller', async () => {
    const request = {
      actor: { userId: 'forged', role: 'PHARMACIST', pharmacyId: 'forged' },
    };
    const guard = new JwtPharmacistGuard(
      sharedGuardSigningIn({
        id: USER_ID,
        role: 'PHARMACIST',
        pharmacyId: PHARMACY_ID,
      }),
    );

    assert.equal(await guard.canActivate(contextFor(request)), true);
    assert.deepEqual(readPharmacistActor(request), {
      userId: USER_ID,
      role: 'PHARMACIST',
      pharmacyId: PHARMACY_ID,
    });
  });

  it('refuses an owner with 403', async () => {
    const guard = new JwtPharmacistGuard(
      sharedGuardSigningIn({ id: USER_ID, role: 'OWNER', pharmacyId: null }),
    );

    await assert.rejects(
      async () => guard.canActivate(contextFor({})),
      ForbiddenException,
    );
  });

  it('passes on the 401 of the shared guard', async () => {
    const guard = new JwtPharmacistGuard({
      canActivate: () =>
        Promise.reject(new UnauthorizedException('Missing or invalid token.')),
    } as never);

    await assert.rejects(
      async () => guard.canActivate(contextFor({})),
      UnauthorizedException,
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
