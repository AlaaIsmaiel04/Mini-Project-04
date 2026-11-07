import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it, mock } from 'node:test';
import {
  type INestApplication,
  Module,
  ServiceUnavailableException,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SUBSCRIPTION_STATUS } from '../pharmacy/adapters/subscription-status-reader';
import { CLOCK } from '../pharmacy/clock';
import { DUTY_PERIOD_STORE } from '../pharmacy/stores/duty-period.store';
import { PHARMACY_STORE } from '../pharmacy/stores/pharmacy.store';
import { FixedClock } from '../pharmacy/testing/fixed-clock';
import { InMemoryDutyPeriodStore } from '../pharmacy/testing/in-memory-duty-period.store';
import { InMemoryPharmacyStore } from '../pharmacy/testing/in-memory-pharmacy.store';
import { InMemorySubscriptionStatus } from '../pharmacy/testing/in-memory-subscription-status';
import { PublicPharmaciesQueryDto } from './dto/public-pharmacies-query.dto';
import { PublicController } from './public.controller';
import { PublicModule } from './public.module';
import { PublicService } from './public.service';
import { MEDICINE_AVAILABILITY_STORE } from './stores/medicine-availability.store';
import { InMemoryMedicineAvailabilityStore } from './testing/in-memory-medicine-availability.store';

const CENTRAL = '11111111-1111-4111-8111-111111111111';
const EASTERN = '22222222-2222-4222-8222-222222222222';
const NORTHERN = '33333333-3333-4333-8333-333333333333';
const EXPIRED = '44444444-4444-4444-8444-444444444444';
const SUSPENDED = '55555555-5555-4555-8555-555555555555';
const NO_SUBSCRIPTION = '66666666-6666-4666-8666-666666666666';

// Central is on duty 20:00 -> 08:00 overnight in Amman, and again two nights later.
const OVERNIGHT_UTC = {
  startsAt: '2026-11-04T17:00:00.000Z',
  endsAt: '2026-11-05T05:00:00.000Z',
};
const LATER_UTC = {
  startsAt: '2026-11-06T17:00:00.000Z',
  endsAt: '2026-11-07T05:00:00.000Z',
};
const EASTERN_DAY_UTC = {
  startsAt: '2026-11-05T09:00:00.000Z',
  endsAt: '2026-11-05T15:00:00.000Z',
};

const AT_2AM = '2026-11-05T02:00:00+03:00';
const AT_9AM = '2026-11-05T09:00:00+03:00';

// Records also carry private fields, as a database row with relations would.
const privateFields = {
  quantity: 120,
  batchNumber: 'B-1',
  unitCost: '2.50',
  storageLocation: 'Shelf 3',
  barcode: '123456',
  subscription: { suspended: false, endDate: '2027-01-01' },
  users: [{ email: 'staff@example.test', passwordHash: 'hash' }],
};

function pharmacy(
  id: string,
  name: string,
  area: string,
  inventoryUpdatedAt: Date | null = null,
) {
  return {
    id,
    name,
    area,
    address: `${name} Street 12`,
    phone: '+962 6 555 0100',
    inventoryUpdatedAt,
    ...privateFields,
  };
}

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
  [PublicPharmaciesQueryDto],
  PublicController.prototype,
  'listPharmacies',
);

describe('GET /public/pharmacies', () => {
  let app: INestApplication;
  let url: string;
  let clock: FixedClock;
  let subscriptions: InMemorySubscriptionStatus;
  const periods = new InMemoryDutyPeriodStore();
  const periodIds: string[] = [];

  const get = (query = '') => fetch(`${url}/api/public/pharmacies${query}`);
  const names = async (query = '') => {
    const body = await (await get(query)).json();
    return body.items.map((item: { name: string }) => item.name);
  };
  const at = (instant: string) => {
    clock = new FixedClock(new Date(instant));
  };

  async function addPeriod(
    pharmacyId: string,
    { startsAt, endsAt }: { startsAt: string; endsAt: string },
  ): Promise<void> {
    const period = await periods.create(pharmacyId, {
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
    });
    periodIds.push(period.id);
  }

  before(async () => {
    const pharmacies = new InMemoryPharmacyStore([
      pharmacy(NORTHERN, 'Northern', 'Uptown'),
      pharmacy(
        CENTRAL,
        'Central',
        'Downtown',
        new Date('2026-11-04T18:30:00+03:00'),
      ),
      pharmacy(EASTERN, 'Eastern', 'Downtown'),
      pharmacy(EXPIRED, 'Expired', 'Downtown'),
      pharmacy(SUSPENDED, 'Suspended', 'Downtown'),
      pharmacy(NO_SUBSCRIPTION, 'Unsubscribed', 'Downtown'),
    ]);
    subscriptions = new InMemorySubscriptionStatus();

    await addPeriod(CENTRAL, {
      startsAt: '2026-11-01T20:00:00+03:00',
      endsAt: '2026-11-02T08:00:00+03:00',
    });
    await addPeriod(CENTRAL, OVERNIGHT_UTC);
    await addPeriod(CENTRAL, LATER_UTC);
    await addPeriod(EASTERN, EASTERN_DAY_UTC);
    // On duty at the same time as Central, but must stay hidden.
    await addPeriod(EXPIRED, OVERNIGHT_UTC);
    await addPeriod(SUSPENDED, OVERNIGHT_UTC);
    await addPeriod(NO_SUBSCRIPTION, OVERNIGHT_UTC);

    class DirectoryTestModule {}
    Module({
      controllers: [PublicController],
      providers: [
        PublicService,
        { provide: PHARMACY_STORE, useValue: pharmacies },
        { provide: DUTY_PERIOD_STORE, useValue: periods },
        { provide: SUBSCRIPTION_STATUS, useValue: subscriptions },
        { provide: CLOCK, useValue: { now: () => clock.now() } },
        // No pharmacy has any stock: the directory must list them anyway.
        {
          provide: MEDICINE_AVAILABILITY_STORE,
          useValue: new InMemoryMedicineAvailabilityStore([]),
        },
      ],
    })(DirectoryTestModule);

    app = await NestFactory.create(DirectoryTestModule, { logger: false });
    configure(app);
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });

  after(() => app.close());

  beforeEach(() => {
    at(AT_2AM);
    subscriptions.set(CENTRAL, 'ACTIVE');
    subscriptions.set(EASTERN, 'ACTIVE');
    subscriptions.set(NORTHERN, 'ACTIVE');
    subscriptions.set(EXPIRED, 'EXPIRED');
    subscriptions.set(SUSPENDED, 'SUSPENDED');
    subscriptions.set(NO_SUBSCRIPTION, 'NONE');
  });

  describe('response shape', () => {
    it('returns exactly the contract fields, in UTC, sorted by name', async () => {
      const response = await get();

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        items: [
          {
            name: 'Central',
            area: 'Downtown',
            address: 'Central Street 12',
            phone: '+962 6 555 0100',
            onDutyNow: true,
            currentDuty: OVERNIGHT_UTC,
            nextDuty: LATER_UTC,
            inventoryUpdatedAt: '2026-11-04T15:30:00.000Z',
          },
          {
            name: 'Eastern',
            area: 'Downtown',
            address: 'Eastern Street 12',
            phone: '+962 6 555 0100',
            onDutyNow: false,
            currentDuty: null,
            nextDuty: EASTERN_DAY_UTC,
            inventoryUpdatedAt: null,
          },
          {
            name: 'Northern',
            area: 'Uptown',
            address: 'Northern Street 12',
            phone: '+962 6 555 0100',
            onDutyNow: false,
            currentDuty: null,
            nextDuty: null,
            inventoryUpdatedAt: null,
          },
        ],
        total: 3,
      });
    });

    it('leaks no ID or private value anywhere in the JSON', async () => {
      const text = await (await get()).text();

      const secrets = [
        CENTRAL,
        EASTERN,
        NORTHERN,
        ...periodIds,
        'pharmacyId',
        'quantity',
        'batchNumber',
        'B-1',
        'unitCost',
        'Shelf 3',
        'barcode',
        'subscription',
        'suspended',
        'staff@example.test',
        'passwordHash',
      ];
      for (const secret of secrets) {
        assert.equal(text.includes(secret), false, `leaked ${secret}`);
      }
      assert.equal(/"id"/.test(text), false);
    });

    it('keeps only the two timestamps in nested duty periods', async () => {
      const body = await (await get()).json();

      assert.deepEqual(Object.keys(body.items[0].currentDuty), [
        'startsAt',
        'endsAt',
      ]);
      assert.deepEqual(Object.keys(body.items[0].nextDuty), [
        'startsAt',
        'endsAt',
      ]);
    });

    it('needs no sign-in', async () => {
      assert.equal((await get()).status, 200);
    });

    it('returns an empty list normally', async () => {
      const response = await get('?area=Nowhere');

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { items: [], total: 0 });
    });
  });

  describe('subscriptions', () => {
    it('lists ACTIVE pharmacies only, even when the hidden ones are on duty', async () => {
      assert.deepEqual(await names(), ['Central', 'Eastern', 'Northern']);
      assert.deepEqual(await names('?onDutyNow=true'), ['Central']);
    });

    it('lists an ACTIVE pharmacy with no stock and no inventory update', async () => {
      const body = await (await get('?area=Uptown')).json();

      assert.equal(body.items[0].name, 'Northern');
      assert.equal(body.items[0].inventoryUpdatedAt, null);
    });

    for (const status of ['EXPIRED', 'SUSPENDED', 'NONE'] as const) {
      it(`hides a pharmacy as soon as its status is ${status}`, async () => {
        subscriptions.set(CENTRAL, status);

        assert.deepEqual(await names(), ['Eastern', 'Northern']);
      });
    }

    it('counts only listed pharmacies in total', async () => {
      subscriptions.set(EASTERN, 'EXPIRED');

      assert.equal((await (await get()).json()).total, 2);
    });

    it('returns 503, not a partial list, when a status is unavailable', async () => {
      const reader = mock.method(subscriptions, 'getEffectiveStatus', () =>
        Promise.reject(new ServiceUnavailableException()),
      );

      const response = await get();
      reader.mock.restore();

      assert.equal(response.status, 503);
      assert.equal((await response.json()).items, undefined);
    });
  });

  describe('area filter', () => {
    const matching = [
      ['the exact area', 'Downtown'],
      ['different case', 'dOWNTOWN'],
      ['surrounding spaces', '%20%20Downtown%20'],
    ];
    for (const [label, area] of matching) {
      it(`matches ${label}`, async () => {
        assert.deepEqual(await names(`?area=${area}`), ['Central', 'Eastern']);
      });
    }

    for (const area of ['Down', 'town', 'Downtown2']) {
      it(`does not partially match ${area}`, async () => {
        assert.deepEqual(await names(`?area=${area}`), []);
      });
    }

    for (const query of ['?area=', '?area=%20%20']) {
      it(`treats a blank area as no filter: ${query}`, async () => {
        assert.deepEqual(await names(query), [
          'Central',
          'Eastern',
          'Northern',
        ]);
      });
    }

    it('rejects a repeated area', async () => {
      assert.equal((await get('?area=Downtown&area=Uptown')).status, 400);
    });
  });

  describe('onDutyNow filter', () => {
    it('true lists only pharmacies on duty at the clock time', async () => {
      assert.deepEqual(await names('?onDutyNow=true'), ['Central']);

      at('2026-11-05T13:00:00+03:00');
      assert.deepEqual(await names('?onDutyNow=true'), ['Eastern']);
    });

    it('true returns an empty list when nobody is on duty', async () => {
      at(AT_9AM);

      const response = await get('?onDutyNow=true');

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { items: [], total: 0 });
    });

    it('false adds no restriction', async () => {
      assert.deepEqual(await names('?onDutyNow=false'), [
        'Central',
        'Eastern',
        'Northern',
      ]);
    });

    it('leaving it out adds no restriction', async () => {
      assert.deepEqual(await names(), ['Central', 'Eastern', 'Northern']);
    });

    const invalid = [
      'TRUE',
      'True',
      'FALSE',
      '1',
      '0',
      'yes',
      'no',
      'null',
      'undefined',
      '',
      '%20true',
      'true%20',
    ];
    for (const value of invalid) {
      it(`returns 400 for onDutyNow=${value}`, async () => {
        const response = await get(`?onDutyNow=${value}`);
        const body = await response.json();

        assert.equal(response.status, 400);
        assert.deepEqual(body.message, ['onDutyNow must be true or false']);
      });
    }

    it('returns 400 for a repeated onDutyNow', async () => {
      const response = await get('?onDutyNow=true&onDutyNow=false');

      assert.equal(response.status, 400);
    });

    it('combines with the area filter', async () => {
      assert.deepEqual(await names('?area=downtown&onDutyNow=true'), [
        'Central',
      ]);
      assert.deepEqual(await names('?area=uptown&onDutyNow=true'), []);
      assert.deepEqual(await names('?area=uptown&onDutyNow=false'), [
        'Northern',
      ]);
    });

    it('returns 400 for an unknown query field', async () => {
      assert.equal((await get('?pharmacyId=x')).status, 400);
      assert.equal((await get('?q=amoxicillin')).status, 400);
    });
  });

  describe('duty periods at a fixed clock time', () => {
    const central = async () =>
      (await (await get('?area=Downtown')).json()).items[0];

    it('02:00 is on duty inside the overnight period', async () => {
      const result = await central();

      assert.equal(result.onDutyNow, true);
      assert.deepEqual(result.currentDuty, OVERNIGHT_UTC);
      assert.deepEqual(result.nextDuty, LATER_UTC);
    });

    it('the exact start instant is on duty', async () => {
      at('2026-11-04T20:00:00+03:00');
      const result = await central();

      assert.equal(result.onDutyNow, true);
      assert.deepEqual(result.currentDuty, OVERNIGHT_UTC);
    });

    it('one millisecond before the start is not on duty and shows it as next', async () => {
      at('2026-11-04T19:59:59.999+03:00');
      const result = await central();

      assert.equal(result.onDutyNow, false);
      assert.equal(result.currentDuty, null);
      assert.deepEqual(result.nextDuty, OVERNIGHT_UTC);
    });

    it('one millisecond before the end is still on duty', async () => {
      at('2026-11-05T07:59:59.999+03:00');

      assert.equal((await central()).onDutyNow, true);
    });

    it('the exact end instant is not on duty', async () => {
      at('2026-11-05T08:00:00+03:00');
      const result = await central();

      assert.equal(result.onDutyNow, false);
      assert.equal(result.currentDuty, null);
      assert.deepEqual(result.nextDuty, LATER_UTC);
    });

    it('09:00 is not on duty', async () => {
      at(AT_9AM);

      assert.equal((await central()).onDutyNow, false);
    });

    it('after the last period both are null', async () => {
      at('2026-11-20T12:00:00+03:00');
      const result = await central();

      assert.equal(result.onDutyNow, false);
      assert.equal(result.currentDuty, null);
      assert.equal(result.nextDuty, null);
    });

    it('never shows a finished period', async () => {
      at('2026-11-03T12:00:00+03:00');

      assert.deepEqual((await central()).nextDuty, OVERNIGHT_UTC);
    });

    it('does not mix up the periods of different pharmacies', async () => {
      const body = await (await get('?area=Downtown')).json();
      const eastern = body.items[1];

      assert.equal(eastern.name, 'Eastern');
      assert.equal(eastern.currentDuty, null);
      assert.deepEqual(eastern.nextDuty, EASTERN_DAY_UTC);
    });
  });
});

describe('GET /public/pharmacies alone, with no database or sign-in bound', () => {
  let app: INestApplication;
  let url: string;

  before(async () => {
    app = await NestFactory.create(PublicModule, { logger: false });
    configure(app);
    await app.listen(0, '127.0.0.1');
    url = `${await app.getUrl()}/api/public/pharmacies`;
  });

  after(() => app.close());

  it('returns 503 instead of empty or sample data', async () => {
    const response = await fetch(url);
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.equal(body.items, undefined);
  });

  it('still rejects an invalid filter with 400', async () => {
    assert.equal((await fetch(`${url}?onDutyNow=maybe`)).status, 400);
  });
});
