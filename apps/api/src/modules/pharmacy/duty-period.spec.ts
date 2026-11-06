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
import { DutyInputDto } from './dto/duty-input.dto';
import { DutyPeriodController } from './duty-period.controller';
import { DutyPeriodService } from './duty-period.service';
import { PharmacyLock } from './pharmacy-lock';
import { PharmacyModule } from './pharmacy.module';
import { DUTY_PERIOD_STORE } from './stores/duty-period.store';
import { InMemoryDutyPeriodStore } from './testing/in-memory-duty-period.store';
import { InMemorySubscriptionStatus } from './testing/in-memory-subscription-status';

const PHARMACY_A = '11111111-1111-4111-8111-111111111111';
const PHARMACY_B = '22222222-2222-4222-8222-222222222222';
const USER_ID = '33333333-3333-4333-8333-333333333333';
const MISSING_ID = '99999999-9999-4999-8999-999999999999';
const TOKEN = 'secret-token-value';

// 20:00 -> 08:00 the next day in Amman, crossing midnight.
const OVERNIGHT = {
  startsAt: '2026-11-04T20:00:00+03:00',
  endsAt: '2026-11-05T08:00:00+03:00',
};
const OVERNIGHT_UTC = {
  startsAt: '2026-11-04T17:00:00.000Z',
  endsAt: '2026-11-05T05:00:00.000Z',
};
const LATER = {
  startsAt: '2026-11-06T20:00:00+03:00',
  endsAt: '2026-11-07T08:00:00+03:00',
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
  [Object, DutyInputDto],
  DutyPeriodController.prototype,
  'create',
);
Reflect.defineMetadata(
  'design:paramtypes',
  [Object, String, DutyInputDto],
  DutyPeriodController.prototype,
  'update',
);

describe('duty period endpoints for a signed-in pharmacist', () => {
  let app: INestApplication;
  let path: string;
  let store: InMemoryDutyPeriodStore;
  let subscriptions: InMemorySubscriptionStatus;
  let signedIn: object | undefined;
  let readDelayMs = 0;
  const warnings = mock.method(Logger.prototype, 'warn', () => undefined);

  const pharmacist = {
    userId: USER_ID,
    role: 'PHARMACIST',
    pharmacyId: PHARMACY_A,
  };

  const send = (method: string, suffix: string, body?: unknown) =>
    fetch(`${path}${suffix}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const list = () => send('GET', '');
  const post = (body: unknown) => send('POST', '', body);
  const patch = (id: string, body: unknown) => send('PATCH', `/${id}`, body);
  const remove = (id: string) => send('DELETE', `/${id}`);

  const logged = () =>
    warnings.mock.calls.map((call) => String(call.arguments[0])).join('\n');
  const storedFor = (pharmacyId: string) => store.listForPharmacy(pharmacyId);

  async function seed(pharmacyId: string, times = OVERNIGHT): Promise<string> {
    const period = await store.create(pharmacyId, {
      startsAt: new Date(times.startsAt),
      endsAt: new Date(times.endsAt),
    });
    return period.id;
  }

  before(async () => {
    // Test only: stands in for sign-in so the rules behind the guard can run.
    mock.method(JwtPharmacistGuard.prototype, 'canActivate', ((
      context: ExecutionContext,
    ) => {
      context.switchToHttp().getRequest().actor = signedIn;
      return true;
    }) as never);

    store = new InMemoryDutyPeriodStore(
      () => new Promise((resolve) => setTimeout(resolve, readDelayMs)),
    );
    subscriptions = new InMemorySubscriptionStatus();

    class DutyTestModule {}
    Module({
      controllers: [DutyPeriodController],
      providers: [
        DutyPeriodService,
        PharmacyLock,
        { provide: DUTY_PERIOD_STORE, useValue: store },
        { provide: SUBSCRIPTION_STATUS, useValue: subscriptions },
      ],
    })(DutyTestModule);

    app = await NestFactory.create(DutyTestModule, { logger: false });
    configure(app);
    await app.listen(0, '127.0.0.1');
    path = `${await app.getUrl()}/api/pharmacist/duty-periods`;
  });

  after(async () => {
    await app.close();
    mock.restoreAll();
  });

  beforeEach(async () => {
    readDelayMs = 0;
    for (const pharmacyId of [PHARMACY_A, PHARMACY_B]) {
      for (const { id } of await storedFor(pharmacyId)) {
        await store.delete(pharmacyId, id);
      }
    }
    signedIn = pharmacist;
    subscriptions.set(PHARMACY_A, 'ACTIVE');
    subscriptions.set(PHARMACY_B, 'ACTIVE');
    warnings.mock.resetCalls();
  });

  describe('GET /pharmacist/duty-periods', () => {
    it('returns an empty list normally', async () => {
      const response = await list();

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { items: [], total: 0 });
    });

    it('returns own periods in UTC, ordered by start, with exact fields', async () => {
      const laterId = await seed(PHARMACY_A, LATER);
      const overnightId = await seed(PHARMACY_A);

      const response = await list();

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        items: [
          { id: overnightId, ...OVERNIGHT_UTC },
          {
            id: laterId,
            startsAt: '2026-11-06T17:00:00.000Z',
            endsAt: '2026-11-07T05:00:00.000Z',
          },
        ],
        total: 2,
      });
    });

    it('does not include another pharmacy', async () => {
      await seed(PHARMACY_B);

      assert.deepEqual(await (await list()).json(), { items: [], total: 0 });
    });

    it('ignores a pharmacyId in the query', async () => {
      await seed(PHARMACY_B);

      const response = await send('GET', `?pharmacyId=${PHARMACY_B}`);

      assert.deepEqual(await response.json(), { items: [], total: 0 });
    });

    for (const status of INACTIVE) {
      it(`can still be read when the subscription is ${status}`, async () => {
        await seed(PHARMACY_A);
        subscriptions.set(PHARMACY_A, status);

        const response = await list();

        assert.equal(response.status, 200);
        assert.equal((await response.json()).total, 1);
      });
    }

    it('returns 401 without an actor and 403 for an owner', async () => {
      signedIn = undefined;
      assert.equal((await list()).status, 401);

      signedIn = { userId: USER_ID, role: 'OWNER', pharmacyId: null };
      assert.equal((await list()).status, 403);
    });
  });

  describe('POST /pharmacist/duty-periods', () => {
    it('creates with 201 and responds in UTC', async () => {
      const response = await post(OVERNIGHT);
      const body = await response.json();

      assert.equal(response.status, 201);
      assert.deepEqual(Object.keys(body).sort(), ['endsAt', 'id', 'startsAt']);
      assert.equal(body.startsAt, OVERNIGHT_UTC.startsAt);
      assert.equal(body.endsAt, OVERNIGHT_UTC.endsAt);
    });

    it('stores the period under the actor pharmacy', async () => {
      await post(OVERNIGHT);

      assert.equal((await storedFor(PHARMACY_A)).length, 1);
      assert.equal((await storedFor(PHARMACY_B)).length, 0);
    });

    it('accepts Z and negative offsets', async () => {
      const response = await post({
        startsAt: '2026-11-04T17:00:00Z',
        endsAt: '2026-11-04T20:00:00-05:00',
      });
      const body = await response.json();

      assert.equal(response.status, 201);
      assert.equal(body.endsAt, '2026-11-05T01:00:00.000Z');
    });

    it('compares instants, not the text of the local times', async () => {
      // 01:00+03:00 is 22:00Z the day before, so this is a one-hour period.
      const response = await post({
        startsAt: '2026-11-05T01:00:00+03:00',
        endsAt: '2026-11-04T23:00:00Z',
      });

      assert.equal(response.status, 201);
    });

    it('accepts exactly 24 hours', async () => {
      const response = await post({
        startsAt: '2026-11-04T20:00:00+03:00',
        endsAt: '2026-11-05T20:00:00+03:00',
      });

      assert.equal(response.status, 201);
    });

    const rejected: [string, unknown, RegExp | null][] = [
      [
        'one millisecond over 24 hours',
        {
          startsAt: '2026-11-04T20:00:00.000+03:00',
          endsAt: '2026-11-05T20:00:00.001+03:00',
        },
        /24 hours/,
      ],
      [
        'an end equal to the start',
        { startsAt: OVERNIGHT.startsAt, endsAt: OVERNIGHT.startsAt },
        /after startsAt/,
      ],
      [
        'the same instant written with different offsets',
        {
          startsAt: '2026-11-04T20:00:00+03:00',
          endsAt: '2026-11-04T17:00:00Z',
        },
        /after startsAt/,
      ],
      [
        'an end before the start',
        { startsAt: OVERNIGHT.endsAt, endsAt: OVERNIGHT.startsAt },
        /after startsAt/,
      ],
      [
        'a start without an offset',
        { ...OVERNIGHT, startsAt: '2026-11-04T20:00:00' },
        null,
      ],
      [
        'an end without an offset',
        { ...OVERNIGHT, endsAt: '2026-11-05T08:00:00' },
        null,
      ],
      ['a date only', { ...OVERNIGHT, startsAt: '2026-11-04' }, null],
      [
        'an impossible date',
        { ...OVERNIGHT, endsAt: '2026-02-30T08:00:00Z' },
        null,
      ],
      ['a numeric time', { ...OVERNIGHT, startsAt: 1762275600000 }, null],
      ['a missing start', { endsAt: OVERNIGHT.endsAt }, null],
      ['a missing end', { startsAt: OVERNIGHT.startsAt }, null],
      ['an empty body', {}, null],
      [
        'pharmacyId in the body',
        { ...OVERNIGHT, pharmacyId: PHARMACY_B },
        null,
      ],
      ['id in the body', { ...OVERNIGHT, id: MISSING_ID }, null],
    ];
    for (const [label, body, message] of rejected) {
      it(`returns 400 for ${label} and stores nothing`, async () => {
        const response = await post(body);
        const json = await response.json();

        assert.equal(response.status, 400);
        assert.equal(json.statusCode, 400);
        if (message) assert.match(String(json.message), message);
        assert.equal((await storedFor(PHARMACY_A)).length, 0);
      });
    }

    it('logs an invalid request without the submitted values', async () => {
      await post({ ...OVERNIGHT, endsAt: 'bad-value', pharmacyId: PHARMACY_B });

      assert.match(logged(), new RegExp(`${PHARMACY_A}.*invalid input`));
      for (const secret of [TOKEN, 'bad-value', PHARMACY_B]) {
        assert.equal(logged().includes(secret), false);
      }
    });

    it('returns 409 for an overlap and allows an adjacent period', async () => {
      await post(OVERNIGHT);

      const overlap = await post({
        startsAt: '2026-11-05T07:00:00+03:00',
        endsAt: '2026-11-05T10:00:00+03:00',
      });
      const adjacent = await post({
        startsAt: OVERNIGHT.endsAt,
        endsAt: '2026-11-05T10:00:00+03:00',
      });

      assert.equal(overlap.status, 409);
      assert.equal(adjacent.status, 201);
    });

    it('allows the same times at another pharmacy', async () => {
      await seed(PHARMACY_B);

      assert.equal((await post(OVERNIGHT)).status, 201);
    });

    for (const status of INACTIVE) {
      it(`returns 403 with the reason when the subscription is ${status}`, async () => {
        subscriptions.set(PHARMACY_A, status);

        const response = await post(OVERNIGHT);

        assert.equal(response.status, 403);
        assert.match(
          (await response.json()).message,
          /Changes are not allowed/,
        );
        assert.match(logged(), new RegExp(`${PHARMACY_A}.*${status}`));
        assert.equal(logged().includes(TOKEN), false);
        assert.equal((await storedFor(PHARMACY_A)).length, 0);
      });
    }

    it('does not write when the subscription status is unavailable', async () => {
      const reader = mock.method(subscriptions, 'getEffectiveStatus', () =>
        Promise.reject(new ServiceUnavailableException()),
      );

      const response = await post(OVERNIGHT);
      reader.mock.restore();

      assert.equal(response.status, 503);
      assert.equal((await storedFor(PHARMACY_A)).length, 0);
    });

    it('returns 401 without an actor and 403 for an owner', async () => {
      signedIn = undefined;
      assert.equal((await post(OVERNIGHT)).status, 401);

      signedIn = { userId: USER_ID, role: 'OWNER', pharmacyId: null };
      assert.equal((await post(OVERNIGHT)).status, 403);
    });
  });

  describe('PATCH /pharmacist/duty-periods/:id', () => {
    it('updates with 200 and responds in UTC', async () => {
      const id = await seed(PHARMACY_A);

      const response = await patch(id, LATER);

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        id,
        startsAt: '2026-11-06T17:00:00.000Z',
        endsAt: '2026-11-07T05:00:00.000Z',
      });
    });

    it('may overlap its own previous times', async () => {
      const id = await seed(PHARMACY_A);

      const response = await patch(id, {
        startsAt: '2026-11-04T21:00:00+03:00',
        endsAt: '2026-11-05T09:00:00+03:00',
      });

      assert.equal(response.status, 200);
    });

    it('returns 409 when it would overlap another period', async () => {
      await seed(PHARMACY_A);
      const id = await seed(PHARMACY_A, LATER);

      assert.equal((await patch(id, OVERNIGHT)).status, 409);
    });

    it('returns 404 and logs a guessed id from another pharmacy', async () => {
      const id = await seed(PHARMACY_B);

      const response = await patch(id, LATER);

      assert.equal(response.status, 404);
      assert.match(logged(), new RegExp(`${PHARMACY_A}.*${id}`));
      const [stored] = await storedFor(PHARMACY_B);
      assert.equal(stored.startsAt.toISOString(), OVERNIGHT_UTC.startsAt);
    });

    it('answers the same for another pharmacy and a missing id', async () => {
      const id = await seed(PHARMACY_B);

      const guessed = await (await patch(id, LATER)).json();
      const missing = await (await patch(MISSING_ID, LATER)).json();

      assert.deepEqual(guessed, missing);
    });

    it('returns 400 for an invalid UUID', async () => {
      assert.equal((await patch('not-a-uuid', LATER)).status, 400);
    });

    it('returns 400 for invalid times and keeps the period', async () => {
      const id = await seed(PHARMACY_A);

      const reversed = await patch(id, {
        startsAt: OVERNIGHT.endsAt,
        endsAt: OVERNIGHT.startsAt,
      });
      const tooLong = await patch(id, {
        startsAt: '2026-11-04T20:00:00+03:00',
        endsAt: '2026-11-05T20:00:01+03:00',
      });
      const noOffset = await patch(id, {
        ...OVERNIGHT,
        endsAt: '2026-11-05T08:00:00',
      });
      const partial = await patch(id, { startsAt: OVERNIGHT.startsAt });

      for (const response of [reversed, tooLong, noOffset, partial]) {
        assert.equal(response.status, 400);
      }
      const [stored] = await storedFor(PHARMACY_A);
      assert.equal(stored.startsAt.toISOString(), OVERNIGHT_UTC.startsAt);
    });

    for (const status of INACTIVE) {
      it(`returns 403 when the subscription is ${status}`, async () => {
        const id = await seed(PHARMACY_A);
        subscriptions.set(PHARMACY_A, status);

        assert.equal((await patch(id, LATER)).status, 403);
        const [stored] = await storedFor(PHARMACY_A);
        assert.equal(stored.startsAt.toISOString(), OVERNIGHT_UTC.startsAt);
      });
    }
  });

  describe('overlaps against an overnight period 20:00 -> 08:00', () => {
    const allowed: [string, { startsAt: string; endsAt: string }][] = [
      [
        'one ending exactly at its start',
        {
          startsAt: '2026-11-04T19:00:00+03:00',
          endsAt: OVERNIGHT.startsAt,
        },
      ],
      [
        'one starting exactly at its end',
        {
          startsAt: OVERNIGHT.endsAt,
          endsAt: '2026-11-05T10:00:00+03:00',
        },
      ],
      [
        'one starting at its end, written in UTC',
        {
          startsAt: OVERNIGHT_UTC.endsAt,
          endsAt: '2026-11-05T07:00:00Z',
        },
      ],
      ['the next night', LATER],
    ];
    for (const [label, times] of allowed) {
      it(`POST allows ${label}`, async () => {
        await seed(PHARMACY_A);

        assert.equal((await post(times)).status, 201);
        assert.equal((await storedFor(PHARMACY_A)).length, 2);
      });
    }

    const overlapping: [string, { startsAt: string; endsAt: string }][] = [
      ['identical times', OVERNIGHT],
      [
        'a period at 02:00, after midnight',
        {
          startsAt: '2026-11-05T02:00:00+03:00',
          endsAt: '2026-11-05T03:00:00+03:00',
        },
      ],
      [
        'a period crossing its midnight',
        {
          startsAt: '2026-11-04T23:00:00+03:00',
          endsAt: '2026-11-05T01:00:00+03:00',
        },
      ],
      [
        'a period ending one millisecond after its start',
        {
          startsAt: '2026-11-04T19:00:00+03:00',
          endsAt: '2026-11-04T20:00:00.001+03:00',
        },
      ],
      [
        'a period starting one millisecond before its end',
        {
          startsAt: '2026-11-05T07:59:59.999+03:00',
          endsAt: '2026-11-05T10:00:00+03:00',
        },
      ],
      [
        'a period containing it',
        {
          startsAt: '2026-11-04T19:00:00+03:00',
          endsAt: '2026-11-05T09:00:00+03:00',
        },
      ],
      [
        'an overlap written in UTC',
        {
          startsAt: '2026-11-04T23:00:00Z',
          endsAt: '2026-11-05T01:00:00Z',
        },
      ],
    ];
    for (const [label, times] of overlapping) {
      it(`POST returns 409 for ${label} and stores nothing`, async () => {
        await seed(PHARMACY_A);

        const response = await post(times);
        const body = await response.json();

        assert.equal(response.status, 409);
        assert.equal(body.statusCode, 409);
        assert.equal(body.error, 'Conflict');
        assert.match(body.message, /overlaps an existing duty period/);
        assert.equal((await storedFor(PHARMACY_A)).length, 1);
      });
    }

    it('POST allows a day and night chain with exact handovers', async () => {
      assert.equal((await post(OVERNIGHT)).status, 201);
      const day = {
        startsAt: OVERNIGHT.endsAt,
        endsAt: '2026-11-05T20:00:00+03:00',
      };
      const nextNight = {
        startsAt: day.endsAt,
        endsAt: '2026-11-06T08:00:00+03:00',
      };

      assert.equal((await post(day)).status, 201);
      assert.equal((await post(nextNight)).status, 201);
      assert.equal((await (await list()).json()).total, 3);
    });

    it('POST does not compare with another pharmacy', async () => {
      await seed(PHARMACY_B);

      assert.equal((await post(OVERNIGHT)).status, 201);
    });

    it('PATCH may keep exactly its own times', async () => {
      const id = await seed(PHARMACY_A);

      assert.equal((await patch(id, OVERNIGHT)).status, 200);
    });

    it('PATCH may move or shrink within its own times', async () => {
      const id = await seed(PHARMACY_A);

      const shrunk = await patch(id, {
        startsAt: '2026-11-04T22:00:00+03:00',
        endsAt: '2026-11-05T02:00:00+03:00',
      });
      const moved = await patch(id, {
        startsAt: '2026-11-05T01:00:00+03:00',
        endsAt: '2026-11-05T09:00:00+03:00',
      });

      assert.equal(shrunk.status, 200);
      assert.equal(moved.status, 200);
    });

    it('PATCH may become adjacent to another period', async () => {
      await seed(PHARMACY_A);
      const id = await seed(PHARMACY_A, LATER);

      const response = await patch(id, {
        startsAt: OVERNIGHT.endsAt,
        endsAt: '2026-11-05T10:00:00+03:00',
      });

      assert.equal(response.status, 200);
    });

    it('PATCH returns 409 for one millisecond of overlap and keeps its times', async () => {
      await seed(PHARMACY_A);
      const id = await seed(PHARMACY_A, LATER);

      const response = await patch(id, {
        startsAt: '2026-11-05T07:59:59.999+03:00',
        endsAt: '2026-11-05T10:00:00+03:00',
      });

      assert.equal(response.status, 409);
      const stored = await store.findForPharmacy(PHARMACY_A, id);
      assert.equal(stored?.startsAt.toISOString(), '2026-11-06T17:00:00.000Z');
    });

    it('PATCH does not compare with another pharmacy', async () => {
      await seed(PHARMACY_B);
      const id = await seed(PHARMACY_A, LATER);

      assert.equal((await patch(id, OVERNIGHT)).status, 200);
    });

    it('PATCH answers 404, not 409, for a guessed id with overlapping times', async () => {
      await seed(PHARMACY_A);
      const guessed = await seed(PHARMACY_B, LATER);

      assert.equal((await patch(guessed, OVERNIGHT)).status, 404);
      assert.equal((await patch(MISSING_ID, OVERNIGHT)).status, 404);
    });
  });

  describe('two simultaneous requests through the API', () => {
    // Long enough for both requests to read before either one could write.
    beforeEach(() => {
      readDelayMs = 25;
    });

    it('POST: one gets 201, the other 409, and one period is stored', async () => {
      const responses = await Promise.all([post(OVERNIGHT), post(OVERNIGHT)]);

      assert.deepEqual(
        responses.map((response) => response.status).sort(),
        [201, 409],
      );
      assert.equal((await storedFor(PHARMACY_A)).length, 1);
    });

    it('POST: partly overlapping times also give one 201 and one 409', async () => {
      const responses = await Promise.all([
        post(OVERNIGHT),
        post({
          startsAt: '2026-11-05T02:00:00+03:00',
          endsAt: '2026-11-05T10:00:00+03:00',
        }),
      ]);

      assert.deepEqual(
        responses.map((response) => response.status).sort(),
        [201, 409],
      );
      assert.equal((await storedFor(PHARMACY_A)).length, 1);
    });

    it('POST: adjacent times both get 201', async () => {
      const responses = await Promise.all([
        post(OVERNIGHT),
        post({
          startsAt: OVERNIGHT.endsAt,
          endsAt: '2026-11-05T10:00:00+03:00',
        }),
      ]);

      assert.deepEqual(
        responses.map((response) => response.status),
        [201, 201],
      );
    });

    it('PATCH: two edits into one free slot give one 200 and one 409', async () => {
      const first = await seed(PHARMACY_A);
      const second = await seed(PHARMACY_A, LATER);
      const freeSlot = {
        startsAt: '2026-11-10T20:00:00+03:00',
        endsAt: '2026-11-11T08:00:00+03:00',
      };

      const responses = await Promise.all([
        patch(first, freeSlot),
        patch(second, freeSlot),
      ]);

      assert.deepEqual(
        responses.map((response) => response.status).sort(),
        [200, 409],
      );
    });
  });

  describe('DELETE /pharmacist/duty-periods/:id', () => {
    it('deletes with 204 and no body', async () => {
      const id = await seed(PHARMACY_A);

      const response = await remove(id);

      assert.equal(response.status, 204);
      assert.equal(await response.text(), '');
      assert.equal((await storedFor(PHARMACY_A)).length, 0);
    });

    it('returns 404 the second time', async () => {
      const id = await seed(PHARMACY_A);
      await remove(id);

      assert.equal((await remove(id)).status, 404);
    });

    it('returns 404, logs and keeps a guessed id from another pharmacy', async () => {
      const id = await seed(PHARMACY_B);

      const response = await remove(id);

      assert.equal(response.status, 404);
      assert.match(logged(), new RegExp(`${PHARMACY_A}.*${id}`));
      assert.equal((await storedFor(PHARMACY_B)).length, 1);
    });

    it('returns 400 for an invalid UUID', async () => {
      assert.equal((await remove('not-a-uuid')).status, 400);
    });

    for (const status of INACTIVE) {
      it(`returns 403 and keeps the period when the subscription is ${status}`, async () => {
        const id = await seed(PHARMACY_A);
        subscriptions.set(PHARMACY_A, status);

        assert.equal((await remove(id)).status, 403);
        assert.equal((await storedFor(PHARMACY_A)).length, 1);
      });
    }

    it('returns 401 without an actor and 403 for an owner', async () => {
      const id = await seed(PHARMACY_A);

      signedIn = undefined;
      assert.equal((await remove(id)).status, 401);

      signedIn = { userId: USER_ID, role: 'OWNER', pharmacyId: null };
      assert.equal((await remove(id)).status, 403);
      assert.equal((await storedFor(PHARMACY_A)).length, 1);
    });
  });
});

describe('duty period endpoints alone, with no database or sign-in bound', () => {
  let app: INestApplication;
  let path: string;

  before(async () => {
    app = await NestFactory.create(PharmacyModule, { logger: false });
    configure(app);
    await app.listen(0, '127.0.0.1');
    path = `${await app.getUrl()}/api/pharmacist/duty-periods`;
  });

  after(() => app.close());

  it('refuses every method with 401, even with a token or pharmacy header', async () => {
    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      'x-pharmacy-id': PHARMACY_A,
      'Content-Type': 'application/json',
    };
    const body = JSON.stringify(OVERNIGHT);

    const responses = await Promise.all([
      fetch(path, { headers }),
      fetch(path, { method: 'POST', headers, body }),
      fetch(`${path}/${MISSING_ID}`, { method: 'PATCH', headers, body }),
      fetch(`${path}/${MISSING_ID}`, { method: 'DELETE', headers }),
    ]);

    assert.deepEqual(
      responses.map((response) => response.status),
      [401, 401, 401, 401],
    );
  });
});
