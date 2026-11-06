import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it, mock } from 'node:test';
import {
  type ExecutionContext,
  type INestApplication,
  Logger,
  Module,
  ServiceUnavailableException,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { SubscriptionStatus } from '@smartshelf/contracts';
import { JwtPharmacistGuard } from './adapters/jwt-pharmacist.guard';
import { SUBSCRIPTION_STATUS } from './adapters/subscription-status-reader';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PharmacyModule } from './pharmacy.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { PHARMACY_STORE } from './stores/pharmacy.store';
import { InMemoryPharmacyStore } from './testing/in-memory-pharmacy.store';
import { InMemorySubscriptionStatus } from './testing/in-memory-subscription-status';

const PHARMACY_A = '11111111-1111-4111-8111-111111111111';
const PHARMACY_B = '22222222-2222-4222-8222-222222222222';
const MISSING_PHARMACY = '99999999-9999-4999-8999-999999999999';
const USER_ID = '33333333-3333-4333-8333-333333333333';
const TOKEN = 'secret-token-value';

const profileA = {
  id: PHARMACY_A,
  name: 'Central',
  area: 'Downtown',
  address: '12 Main Street',
  phone: '+962 6 555 0100',
  inventoryUpdatedAt: new Date('2026-11-04T18:30:00+03:00'),
};
const profileB = {
  id: PHARMACY_B,
  name: 'Northern',
  area: 'Uptown',
  address: '40 North Road',
  phone: '+962 6 555 0200',
  inventoryUpdatedAt: null,
};
const validChange = {
  area: 'Abdoun',
  address: '77 Garden Street',
  phone: '0791234567',
};

const INACTIVE: SubscriptionStatus[] = ['EXPIRED', 'SUSPENDED', 'NONE'];

// The same setup as main.ts.
function configure(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}

// tsx does not emit decorator metadata, so add the parameter types tsc emits for
// the running API. ValidationPipe needs them to know which DTO to validate against.
Reflect.defineMetadata(
  'design:paramtypes',
  [Object, UpdateProfileDto],
  ProfileController.prototype,
  'updateProfile',
);

describe('profile endpoints for a signed-in pharmacist', () => {
  let app: INestApplication;
  let url: string;
  let store: InMemoryPharmacyStore;
  let subscriptions: InMemorySubscriptionStatus;
  let signedIn: object | undefined;
  const warnings = mock.method(Logger.prototype, 'warn', () => undefined);

  const pharmacist = {
    userId: USER_ID,
    role: 'PHARMACIST',
    pharmacyId: PHARMACY_A,
  };

  const get = (path = '') => fetch(`${url}/api/pharmacist/profile${path}`);
  const patch = (body: unknown) =>
    fetch(`${url}/api/pharmacist/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify(body),
    });
  const logged = () =>
    warnings.mock.calls.map((call) => String(call.arguments[0])).join('\n');

  before(async () => {
    // Test only: stands in for sign-in so the rules behind the guard can run.
    mock.method(JwtPharmacistGuard.prototype, 'canActivate', ((
      context: ExecutionContext,
    ) => {
      context.switchToHttp().getRequest().actor = signedIn;
      return true;
    }) as never);

    store = new InMemoryPharmacyStore([profileA, profileB]);
    subscriptions = new InMemorySubscriptionStatus();

    class ProfileTestModule {}
    Module({
      controllers: [ProfileController],
      providers: [
        ProfileService,
        { provide: PHARMACY_STORE, useValue: store },
        { provide: SUBSCRIPTION_STATUS, useValue: subscriptions },
      ],
    })(ProfileTestModule);

    app = await NestFactory.create(ProfileTestModule, { logger: false });
    configure(app);
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });

  after(async () => {
    await app.close();
    mock.restoreAll();
  });

  beforeEach(async () => {
    signedIn = pharmacist;
    subscriptions.set(PHARMACY_A, 'ACTIVE');
    subscriptions.set(PHARMACY_B, 'ACTIVE');
    await store.updateProfile(PHARMACY_A, profileA);
    await store.updateProfile(PHARMACY_B, profileB);
    warnings.mock.resetCalls();
  });

  async function assertUnchanged(): Promise<void> {
    const stored = await store.findById(PHARMACY_A);
    assert.equal(stored?.area, profileA.area);
    assert.equal(stored?.address, profileA.address);
    assert.equal(stored?.phone, profileA.phone);
  }

  describe('GET /pharmacist/profile', () => {
    it('returns exactly ProfileResponse with 200', async () => {
      const response = await get();

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        pharmacy: {
          id: PHARMACY_A,
          name: 'Central',
          area: 'Downtown',
          address: '12 Main Street',
          phone: '+962 6 555 0100',
          inventoryUpdatedAt: '2026-11-04T15:30:00.000Z',
        },
        subscriptionStatus: 'ACTIVE',
      });
    });

    it('returns a null inventoryUpdatedAt', async () => {
      signedIn = { ...pharmacist, pharmacyId: PHARMACY_B };

      const body = await (await get()).json();

      assert.equal(body.pharmacy.inventoryUpdatedAt, null);
    });

    for (const status of INACTIVE) {
      it(`can still be read when the subscription is ${status}`, async () => {
        subscriptions.set(PHARMACY_A, status);

        const response = await get();

        assert.equal(response.status, 200);
        assert.equal((await response.json()).subscriptionStatus, status);
      });
    }

    it('takes the pharmacy from the actor, not the request', async () => {
      const response = await get(`?pharmacyId=${PHARMACY_B}&id=${PHARMACY_B}`);

      assert.equal((await response.json()).pharmacy.id, PHARMACY_A);
    });

    it('returns 404 when the pharmacy does not exist', async () => {
      signedIn = { ...pharmacist, pharmacyId: MISSING_PHARMACY };

      assert.equal((await get()).status, 404);
    });

    it('returns 401 without an actor and 403 for an owner', async () => {
      signedIn = undefined;
      assert.equal((await get()).status, 401);

      signedIn = { userId: USER_ID, role: 'OWNER', pharmacyId: null };
      assert.equal((await get()).status, 403);
    });
  });

  describe('PATCH /pharmacist/profile', () => {
    it('updates and returns ProfileResponse with 200', async () => {
      const response = await patch(validChange);

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        pharmacy: {
          id: PHARMACY_A,
          name: 'Central',
          ...validChange,
          inventoryUpdatedAt: '2026-11-04T15:30:00.000Z',
        },
        subscriptionStatus: 'ACTIVE',
      });
    });

    it('trims the stored values', async () => {
      const response = await patch({
        area: '  Abdoun ',
        address: '\t77 Garden Street  ',
        phone: ' 0791234567 ',
      });

      assert.equal(response.status, 200);
      const stored = await store.findById(PHARMACY_A);
      assert.equal(stored?.area, 'Abdoun');
      assert.equal(stored?.address, '77 Garden Street');
      assert.equal(stored?.phone, '0791234567');
    });

    it('changes only the pharmacy of the actor', async () => {
      await patch(validChange);

      const other = await store.findById(PHARMACY_B);
      assert.equal(other?.area, profileB.area);
      assert.equal(other?.phone, profileB.phone);
    });

    it('returns 404 when the pharmacy does not exist', async () => {
      signedIn = { ...pharmacist, pharmacyId: MISSING_PHARMACY };
      subscriptions.set(MISSING_PHARMACY, 'ACTIVE');

      assert.equal((await patch(validChange)).status, 404);
    });

    it('returns 401 without an actor and 403 for an owner', async () => {
      signedIn = undefined;
      assert.equal((await patch(validChange)).status, 401);

      signedIn = { userId: USER_ID, role: 'OWNER', pharmacyId: null };
      assert.equal((await patch(validChange)).status, 403);
      await assertUnchanged();
    });

    for (const status of INACTIVE) {
      it(`returns 403 with the reason when the subscription is ${status}`, async () => {
        subscriptions.set(PHARMACY_A, status);

        const response = await patch(validChange);
        const body = await response.json();

        assert.equal(response.status, 403);
        assert.equal(body.statusCode, 403);
        assert.match(body.message, /Changes are not allowed/);
        await assertUnchanged();
      });

      it(`logs the ${status} rejection without secrets`, async () => {
        subscriptions.set(PHARMACY_A, status);

        await patch(validChange);

        assert.match(logged(), new RegExp(`${PHARMACY_A}.*${status}`));
        for (const secret of [TOKEN, validChange.phone, validChange.address]) {
          assert.equal(logged().includes(secret), false);
        }
      });
    }

    it('gives a different reason for each inactive status', async () => {
      const reasons = new Set<string>();
      for (const status of INACTIVE) {
        subscriptions.set(PHARMACY_A, status);
        reasons.add((await (await patch(validChange)).json()).message);
      }

      assert.equal(reasons.size, INACTIVE.length);
    });

    for (const field of [
      'name',
      'pharmacyId',
      'id',
      'inventoryUpdatedAt',
      'subscriptionStatus',
      'somethingElse',
    ]) {
      it(`returns 400 for ${field} and changes nothing`, async () => {
        const response = await patch({ ...validChange, [field]: PHARMACY_B });
        const body = await response.json();

        assert.equal(response.status, 400);
        assert.deepEqual(body.message, [`property ${field} should not exist`]);
        assert.equal(body.statusCode, 400);
        await assertUnchanged();
      });
    }

    const invalidBodies: [string, unknown][] = [
      ['missing area', { address: 'Long enough', phone: '0791234567' }],
      ['missing address', { area: 'Abdoun', phone: '0791234567' }],
      ['missing phone', { area: 'Abdoun', address: 'Long enough' }],
      ['an empty body', {}],
      ['an array body', [validChange]],
      ['area too short after trimming', { ...validChange, area: ' A ' }],
      ['area too long', { ...validChange, area: 'A'.repeat(81) }],
      ['address too short', { ...validChange, address: 'Road' }],
      ['address too long', { ...validChange, address: 'A'.repeat(201) }],
      ['an invalid phone', { ...validChange, phone: 'call me' }],
      ['a non-string area', { ...validChange, area: 12345 }],
    ];
    for (const [label, body] of invalidBodies) {
      it(`returns 400 for ${label}`, async () => {
        assert.equal((await patch(body)).status, 400);
        await assertUnchanged();
      });
    }

    it('returns 400 for malformed JSON', async () => {
      const response = await fetch(`${url}/api/pharmacist/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: '{not json',
      });

      assert.equal(response.status, 400);
    });

    it('logs a validation rejection without submitted values', async () => {
      await patch({ ...validChange, phone: 'call-me-please', password: 'pw1' });

      assert.match(logged(), new RegExp(`${PHARMACY_A}.*invalid input`));
      for (const secret of [TOKEN, 'call-me-please', 'password', 'pw1']) {
        assert.equal(logged().includes(secret), false);
      }
    });

    it('checks validation before the subscription', async () => {
      subscriptions.set(PHARMACY_A, 'EXPIRED');

      assert.equal((await patch({ ...validChange, name: 'x' })).status, 400);
    });

    it('does not write when the subscription status is unavailable', async () => {
      const reader = mock.method(subscriptions, 'getEffectiveStatus', () =>
        Promise.reject(new ServiceUnavailableException()),
      );

      const response = await patch(validChange);
      reader.mock.restore();

      assert.equal(response.status, 503);
      await assertUnchanged();
    });

    it('does not log a successful change as rejected', async () => {
      await patch(validChange);

      assert.equal(warnings.mock.callCount(), 0);
    });
  });
});

describe('profile endpoints alone, with no database or sign-in bound', () => {
  let app: INestApplication;
  let url: string;

  before(async () => {
    app = await NestFactory.create(PharmacyModule, { logger: false });
    configure(app);
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });

  after(() => app.close());

  it('refuses every request with 401, even with a token or pharmacy header', async () => {
    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      'x-pharmacy-id': PHARMACY_A,
      'Content-Type': 'application/json',
    };

    const read = await fetch(`${url}/api/pharmacist/profile`, { headers });
    const write = await fetch(`${url}/api/pharmacist/profile`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(validChange),
    });

    assert.equal(read.status, 401);
    assert.equal(write.status, 401);
  });
});
