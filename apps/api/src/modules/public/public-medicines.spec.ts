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
import { MedicineSearchQueryDto } from './dto/medicine-search-query.dto';
import { PublicController } from './public.controller';
import { PublicModule } from './public.module';
import { PublicService } from './public.service';
import { MEDICINE_AVAILABILITY_STORE } from './stores/medicine-availability.store';
import { InMemoryMedicineAvailabilityStore } from './testing/in-memory-medicine-availability.store';

const CENTRAL = '11111111-1111-4111-8111-111111111111';
const EASTERN = '22222222-2222-4222-8222-222222222222';
const NORTHERN = '33333333-3333-4333-8333-333333333333';
const SPLIT = '44444444-4444-4444-8444-444444444444';
const WESTERN = '55555555-5555-4555-8555-555555555555';
const LAPSED = '66666666-6666-4666-8666-666666666666';

const FRESH = '2027-06-01';
const PAST = '2026-01-01';

const OVERNIGHT_UTC = {
  startsAt: '2026-11-04T17:00:00.000Z',
  endsAt: '2026-11-05T05:00:00.000Z',
};
const LATER_UTC = {
  startsAt: '2026-11-06T17:00:00.000Z',
  endsAt: '2026-11-07T05:00:00.000Z',
};

// 02:00 in Amman on 5 November, when the UTC date is still 4 November.
const AT_2AM = '2026-11-05T02:00:00+03:00';

// Batches also carry private fields, as a database row would.
const batch = (quantity: number, expiryDate: string) => ({
  quantity,
  expiryDate,
  batchNumber: 'B-1',
  unitCost: '2.50',
  storageLocation: 'Shelf 3',
  barcode: '123456',
});

const medicine = (
  pharmacyId: string,
  displayName: string,
  scientificName: string,
  batches: ReturnType<typeof batch>[],
) => ({ pharmacyId, displayName, scientificName, batches });

const MEDICINES = [
  // A good batch beside an expired one and an empty one.
  medicine(CENTRAL, 'Amoxil 500', 'Amoxicillin', [
    batch(9, PAST),
    batch(0, FRESH),
    batch(137, FRESH),
  ]),
  medicine(CENTRAL, 'Panadol', 'Paracetamol', [batch(5, FRESH)]),
  medicine(CENTRAL, 'Tiny', 'Tinycillin', [batch(1, FRESH)]),
  // Expires today in Amman at the default clock.
  medicine(CENTRAL, 'Zinnat', 'Cefuroxime', [batch(7, '2026-11-05')]),
  // Expired yesterday in Amman, though it is still that date in UTC at 02:00.
  medicine(CENTRAL, 'Cipro', 'Ciprofloxacin', [batch(7, '2026-11-04')]),

  // Expired-only amoxicillin, while another medicine is in stock.
  medicine(EASTERN, 'Amoxil 250', 'Amoxicillin', [
    batch(9, PAST),
    batch(4, '2026-11-04'),
  ]),
  medicine(EASTERN, 'Brufen', 'Ibuprofen', [batch(5, FRESH)]),

  // Zero-only.
  medicine(NORTHERN, 'Amoxicillin Forte', 'Amoxicillin', [
    batch(0, FRESH),
    batch(0, '2028-01-01'),
  ]),

  // One batch has units but expired, the other is fresh but empty, so neither counts.
  medicine(SPLIT, 'Amoxil 125', 'Amoxicillin', [
    batch(9, PAST),
    batch(0, FRESH),
  ]),

  // Several medicines and batches of one pharmacy match.
  medicine(WESTERN, 'Amoxil 500', 'Amoxicillin', [
    batch(1, FRESH),
    batch(2, '2027-07-01'),
    batch(3, '2027-08-01'),
  ]),
  medicine(WESTERN, 'Amoxil 250', 'Amoxicillin', [batch(4, FRESH)]),
  medicine(WESTERN, 'Moxclav', 'Amoxicillin Clavulanate', [batch(5, FRESH)]),

  // Good stock, but the subscription is not active by default.
  medicine(LAPSED, 'Amoxil 500', 'Amoxicillin', [batch(50, FRESH)]),
  medicine(LAPSED, 'Rarecin', 'Rarecillin', [batch(50, FRESH)]),
];

// Records also carry private fields, as a database row with relations would.
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
    medicines: [
      { id: 'medicine-id', displayName: 'Amoxil 500', quantity: 137 },
    ],
    subscription: { suspended: false, endDate: '2027-01-01' },
    users: [{ email: 'staff@example.test', passwordHash: 'hash' }],
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
  [MedicineSearchQueryDto],
  PublicController.prototype,
  'searchMedicines',
);

describe('GET /public/medicines', () => {
  let app: INestApplication;
  let url: string;
  let clock: FixedClock;
  let subscriptions: InMemorySubscriptionStatus;
  const availability = new InMemoryMedicineAvailabilityStore(MEDICINES);
  const periods = new InMemoryDutyPeriodStore();
  const periodIds: string[] = [];

  const get = (query = '') => fetch(`${url}/api/public/medicines${query}`);
  const names = async (query: string) => {
    const response = await get(query);
    assert.equal(response.status, 200);
    const body = await response.json();
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
      pharmacy(WESTERN, 'Western', 'Uptown'),
      pharmacy(
        CENTRAL,
        'Central',
        'Downtown',
        new Date('2026-11-04T18:30:00+03:00'),
      ),
      pharmacy(EASTERN, 'Eastern', 'Downtown'),
      pharmacy(NORTHERN, 'Northern', 'Uptown'),
      pharmacy(SPLIT, 'Split', 'Uptown'),
      pharmacy(LAPSED, 'Lapsed', 'Downtown'),
    ]);
    subscriptions = new InMemorySubscriptionStatus();

    await addPeriod(CENTRAL, OVERNIGHT_UTC);
    await addPeriod(WESTERN, LATER_UTC);
    // On duty at the same time as Central, but without eligible amoxicillin.
    await addPeriod(EASTERN, OVERNIGHT_UTC);
    await addPeriod(NORTHERN, OVERNIGHT_UTC);
    // On duty at the same time as Central, but hidden unless its status is ACTIVE.
    await addPeriod(LAPSED, OVERNIGHT_UTC);

    class SearchTestModule {}
    Module({
      controllers: [PublicController],
      providers: [
        PublicService,
        { provide: PHARMACY_STORE, useValue: pharmacies },
        { provide: DUTY_PERIOD_STORE, useValue: periods },
        { provide: SUBSCRIPTION_STATUS, useValue: subscriptions },
        { provide: CLOCK, useValue: { now: () => clock.now() } },
        { provide: MEDICINE_AVAILABILITY_STORE, useValue: availability },
      ],
    })(SearchTestModule);

    app = await NestFactory.create(SearchTestModule, { logger: false });
    configure(app);
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });

  after(() => app.close());

  beforeEach(() => {
    at(AT_2AM);
    for (const id of [CENTRAL, EASTERN, NORTHERN, SPLIT, WESTERN]) {
      subscriptions.set(id, 'ACTIVE');
    }
    subscriptions.set(LAPSED, 'EXPIRED');
  });

  describe('response', () => {
    it('returns exactly the public pharmacy fields, in UTC, sorted by name', async () => {
      const response = await get('?q=amox');

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
            nextDuty: null,
            inventoryUpdatedAt: '2026-11-04T15:30:00.000Z',
          },
          {
            name: 'Western',
            area: 'Uptown',
            address: 'Western Street 12',
            phone: '+962 6 555 0100',
            onDutyNow: false,
            currentDuty: null,
            nextDuty: LATER_UTC,
            inventoryUpdatedAt: null,
          },
        ],
        total: 2,
      });
    });

    it('leaks no quantity, medicine data or ID anywhere in the JSON', async () => {
      const text = await (await get('?q=amox')).text();

      const secrets = [
        CENTRAL,
        WESTERN,
        ...periodIds,
        'pharmacyId',
        'medicine',
        'Amoxil',
        'Amoxicillin',
        'quantity',
        '137',
        'batchNumber',
        'B-1',
        'expiryDate',
        FRESH,
        'unitCost',
        '2.50',
        'storageLocation',
        'Shelf 3',
        'barcode',
        '123456',
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

    it('needs no sign-in', async () => {
      assert.equal((await get('?q=amox')).status, 200);
    });

    it('returns an empty list normally when no medicine matches', async () => {
      const response = await get('?q=nothing-like-this');

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { items: [], total: 0 });
    });

    it('returns an empty list normally when the filters remove every result', async () => {
      const response = await get('?q=amox&area=Nowhere');

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { items: [], total: 0 });
    });
  });

  describe('q', () => {
    const invalid: [string, string][] = [
      ['missing', ''],
      ['missing with other filters', '?area=Downtown&onDutyNow=true'],
      ['empty', '?q='],
      ['only spaces', '?q=%20%20%20'],
      ['only a tab', '?q=%09'],
      ['repeated', '?q=amox&q=panadol'],
    ];
    for (const [label, query] of invalid) {
      it(`returns 400 when it is ${label}`, async () => {
        const response = await get(query);
        const body = await response.json();

        assert.equal(response.status, 400);
        assert.equal(body.statusCode, 400);
        assert.deepEqual(body.message, ['q is required and cannot be empty']);
      });
    }

    const displayMatches = ['panad', 'PANADOL', 'pAnAdOl', 'nado', 'dol'];
    for (const q of displayMatches) {
      it(`matches the display name with ${q}`, async () => {
        assert.deepEqual(await names(`?q=${q}`), ['Central']);
      });
    }

    const scientificMatches = ['paracet', 'PARACETAMOL', 'cetam', 'mol'];
    for (const q of scientificMatches) {
      it(`matches the scientific name with ${q}`, async () => {
        assert.deepEqual(await names(`?q=${q}`), ['Central']);
      });
    }

    it('trims surrounding spaces', async () => {
      assert.deepEqual(await names('?q=%20%20panadol%09'), ['Central']);
    });

    it('keeps spaces inside the search text', async () => {
      assert.deepEqual(await names('?q=amoxil%20250'), ['Western']);
    });

    it('does not match text that is in neither name', async () => {
      assert.deepEqual(await names('?q=panadol%20extra'), []);
    });
  });

  describe('eligible stock', () => {
    it('expired-only: not listed for that medicine', async () => {
      assert.equal((await names('?q=amox')).includes('Eastern'), false);
    });

    it('expired-only: another medicine in stock does not make it available', async () => {
      // The same pharmacy is listed for the medicine it really has.
      assert.deepEqual(await names('?q=brufen'), ['Eastern']);
      assert.equal((await names('?q=amoxil%20250')).includes('Eastern'), false);
    });

    it('zero-only: not listed', async () => {
      assert.deepEqual(await names('?q=forte'), []);
    });

    it('expired units plus a fresh empty batch: not listed, because neither counts', async () => {
      assert.deepEqual(await names('?q=amoxil%20125'), []);
    });

    it('a good batch beside expired and empty ones: listed', async () => {
      assert.equal((await names('?q=amoxil%20500')).includes('Central'), true);
    });

    it('a single unit is enough', async () => {
      assert.deepEqual(await names('?q=tiny'), ['Central']);
    });
  });

  describe('expiry date in Asia/Amman', () => {
    it('the default clock really has a different date in UTC', () => {
      assert.equal(new Date(AT_2AM).toISOString().slice(0, 10), '2026-11-04');
      assert.equal(AT_2AM.slice(0, 10), '2026-11-05');
    });

    it('a batch expiring today is listed', async () => {
      assert.deepEqual(await names('?q=zinnat'), ['Central']);
    });

    it('it is still listed in the last millisecond of its expiry day', async () => {
      at('2026-11-05T23:59:59.999+03:00');

      assert.deepEqual(await names('?q=zinnat'), ['Central']);
    });

    it('it is gone at midnight in Amman, while it is still that date in UTC', async () => {
      at('2026-11-06T00:00:00+03:00');
      assert.equal(clock.now().toISOString().slice(0, 10), '2026-11-05');

      assert.deepEqual(await names('?q=zinnat'), []);
    });

    it('a batch that expired yesterday in Amman is gone, though it is today in UTC', async () => {
      assert.equal(clock.now().toISOString().slice(0, 10), '2026-11-04');

      assert.deepEqual(await names('?q=cipro'), []);
    });

    it('that batch was still listed one millisecond before midnight in Amman', async () => {
      at('2026-11-04T23:59:59.999+03:00');

      assert.deepEqual(await names('?q=cipro'), ['Central']);
    });
  });

  describe('subscriptions', () => {
    for (const status of ['EXPIRED', 'SUSPENDED', 'NONE'] as const) {
      it(`hides a stocked pharmacy that is ${status}, even when on duty`, async () => {
        subscriptions.set(LAPSED, status);

        assert.deepEqual(await names('?q=rarecin'), []);
        assert.deepEqual(await names('?q=rarecin&onDutyNow=true'), []);
        assert.equal((await names('?q=amox')).includes('Lapsed'), false);
      });

      it(`removes a listed pharmacy as soon as it is ${status}`, async () => {
        subscriptions.set(CENTRAL, status);

        assert.deepEqual(await names('?q=amox'), ['Western']);
      });
    }

    it('lists the same stocked pharmacy once it is ACTIVE', async () => {
      subscriptions.set(LAPSED, 'ACTIVE');

      assert.deepEqual(await names('?q=rarecin'), ['Lapsed']);
      assert.deepEqual(await names('?q=amox'), [
        'Central',
        'Lapsed',
        'Western',
      ]);
    });

    it('returns an empty list when every match is inactive', async () => {
      subscriptions.set(CENTRAL, 'SUSPENDED');
      subscriptions.set(WESTERN, 'NONE');

      const response = await get('?q=amox');

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { items: [], total: 0 });
    });
  });

  describe('duplicates', () => {
    it('the store really returns several rows for one pharmacy', async () => {
      const rows = await availability.listBatchesOfMatchingMedicines('amox');

      assert.equal(rows.filter((row) => row.pharmacyId === WESTERN).length, 5);
    });

    it('returns a pharmacy once across several batches and medicines', async () => {
      const body = await (await get('?q=amox&area=Uptown')).json();

      assert.deepEqual(
        body.items.map((item: { name: string }) => item.name),
        ['Western'],
      );
      assert.equal(body.total, 1);
    });

    it('returns a pharmacy once when display and scientific names both match', async () => {
      assert.deepEqual(await names('?q=mox&area=Uptown'), ['Western']);
    });

    it('counts pharmacies, not batches, in total', async () => {
      assert.equal((await (await get('?q=amox')).json()).total, 2);
    });
  });

  describe('area and duty filters', () => {
    it('combines with an exact area, ignoring case and spaces', async () => {
      assert.deepEqual(await names('?q=amox&area=%20dOWNTOWN%20'), ['Central']);
      assert.deepEqual(await names('?q=amox&area=uptown'), ['Western']);
    });

    it('does not partially match the area', async () => {
      assert.deepEqual(await names('?q=amox&area=Down'), []);
    });

    it('treats a blank area as no filter', async () => {
      assert.deepEqual(await names('?q=amox&area=%20'), ['Central', 'Western']);
    });

    it('onDutyNow=true keeps only pharmacies on duty at the clock time', async () => {
      assert.deepEqual(await names('?q=amox&onDutyNow=true'), ['Central']);
    });

    it('onDutyNow=true excludes the exact end of the duty period', async () => {
      at('2026-11-05T07:59:59.999+03:00');
      assert.deepEqual(await names('?q=amox&onDutyNow=true'), ['Central']);

      at('2026-11-05T08:00:00+03:00');
      assert.deepEqual(await names('?q=amox&onDutyNow=true'), []);
    });

    it('onDutyNow=false adds no restriction', async () => {
      assert.deepEqual(await names('?q=amox&onDutyNow=false'), [
        'Central',
        'Western',
      ]);
    });

    it('combines q, area and onDutyNow', async () => {
      assert.deepEqual(await names('?q=amox&area=downtown&onDutyNow=true'), [
        'Central',
      ]);
      assert.deepEqual(await names('?q=amox&area=uptown&onDutyNow=true'), []);
      assert.deepEqual(await names('?q=amox&area=uptown&onDutyNow=false'), [
        'Western',
      ]);
    });

    it('a pharmacy on duty without eligible stock stays out', async () => {
      assert.deepEqual(await names('?q=forte&onDutyNow=true'), []);
      assert.deepEqual(await names('?q=amoxil%20250&onDutyNow=true'), []);
      // The same on-duty pharmacy is listed for the medicine it really has.
      assert.deepEqual(await names('?q=brufen&onDutyNow=true'), ['Eastern']);
    });

    for (const value of ['TRUE', '1', 'yes', '']) {
      it(`returns 400 for onDutyNow=${value}`, async () => {
        const response = await get(`?q=amox&onDutyNow=${value}`);

        assert.equal(response.status, 400);
        assert.deepEqual((await response.json()).message, [
          'onDutyNow must be true or false',
        ]);
      });
    }

    it('returns 400 for a repeated area or an unknown field', async () => {
      assert.equal((await get('?q=amox&area=a&area=b')).status, 400);
      assert.equal((await get('?q=amox&pharmacyId=x')).status, 400);
      assert.equal((await get('?q=amox&quantity=1')).status, 400);
    });
  });

  describe('unavailable data', () => {
    it('returns 503, not a partial list, when a status is unavailable', async () => {
      const reader = mock.method(subscriptions, 'getEffectiveStatus', () =>
        Promise.reject(new ServiceUnavailableException()),
      );

      const response = await get('?q=amox');
      reader.mock.restore();

      assert.equal(response.status, 503);
      assert.equal((await response.json()).items, undefined);
    });

    it('returns 503, not an empty list, when stock is unavailable', async () => {
      const reader = mock.method(
        availability,
        'listBatchesOfMatchingMedicines',
        () => Promise.reject(new ServiceUnavailableException()),
      );

      const response = await get('?q=amox');
      reader.mock.restore();

      assert.equal(response.status, 503);
      assert.equal((await response.json()).items, undefined);
    });
  });
});

describe('GET /public/medicines alone, with no database or sign-in bound', () => {
  let app: INestApplication;
  let url: string;

  before(async () => {
    app = await NestFactory.create(PublicModule, { logger: false });
    configure(app);
    await app.listen(0, '127.0.0.1');
    url = `${await app.getUrl()}/api/public/medicines`;
  });

  after(() => app.close());

  it('returns 503 instead of empty or sample data', async () => {
    const response = await fetch(`${url}?q=amox`);
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.equal(body.items, undefined);
  });

  it('still rejects a missing q with 400', async () => {
    assert.equal((await fetch(url)).status, 400);
  });
});
