import assert from 'node:assert/strict';
import { after, before, describe, it, mock } from 'node:test';
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
import { InMemoryPharmacyStore } from '../pharmacy/testing/in-memory-pharmacy.store';
import { InMemorySubscriptionStatus } from '../pharmacy/testing/in-memory-subscription-status';
import {
  assertCleanError,
  keyPaths,
} from '../pharmacy/testing/response-allowlist';
import { MedicineSearchQueryDto } from './dto/medicine-search-query.dto';
import { PublicPharmaciesQueryDto } from './dto/public-pharmacies-query.dto';
import {
  PUBLIC_RESULT_EXAMPLE,
  PublicPharmacyDto,
} from './dto/public-pharmacy.dto';
import { PublicController } from './public.controller';
import { toPublicPharmacy } from './public-pharmacy.mapper';
import { PublicService } from './public.service';
import { MEDICINE_AVAILABILITY_STORE } from './stores/medicine-availability.store';

const CENTRAL = '11111111-1111-4111-8111-111111111111';
const NORTHERN = '22222222-2222-4222-8222-222222222222';
const PERIOD_ID = '44444444-4444-4444-8444-444444444444';
const MEDICINE_ID = '55555555-5555-4555-8555-555555555555';
const USER_ID = '66666666-6666-4666-8666-666666666666';
const DATABASE_ERROR = 'connect failed: postgres://admin:secret-password@db';

// Every key a public list may contain, at any depth.
const ALLOWED_KEY_PATHS = [
  'items',
  'items[].address',
  'items[].area',
  'items[].currentDuty',
  'items[].currentDuty.endsAt',
  'items[].currentDuty.startsAt',
  'items[].inventoryUpdatedAt',
  'items[].name',
  'items[].nextDuty',
  'items[].nextDuty.endsAt',
  'items[].nextDuty.startsAt',
  'items[].onDutyNow',
  'items[].phone',
  'total',
];

const WITHOUT_NESTED_DUTY_KEYS = ALLOWED_KEY_PATHS.filter(
  (path) => !path.includes('Duty.'),
);

// Rows carry far more than the public may see, as database rows with relations would.
const privateRelations = {
  pharmacyId: CENTRAL,
  subscriptionStatus: 'ACTIVE',
  subscription: {
    id: 'subscription-id',
    suspended: false,
    endDate: '2027-01-01',
  },
  medicines: [
    {
      id: MEDICINE_ID,
      displayName: 'Amoxil 500',
      scientificName: 'Amoxicillin',
      batches: [
        {
          id: 'batch-id',
          quantity: 137,
          batchNumber: 'B-1',
          unitCost: '2.50',
          storageLocation: 'Shelf 3',
          barcode: '123456',
        },
      ],
    },
  ],
  users: [
    { id: USER_ID, email: 'staff@example.test', passwordHash: 'secret-hash' },
  ],
};

const CENTRAL_ROW = {
  id: CENTRAL,
  name: 'Central',
  area: 'Downtown',
  address: 'Central Street 12',
  phone: '+962 6 555 0100',
  inventoryUpdatedAt: new Date('2026-11-04T18:30:00+03:00'),
  ...privateRelations,
};
const NORTHERN_ROW = {
  id: NORTHERN,
  name: 'Northern',
  area: 'Uptown',
  address: 'Northern Street 12',
  phone: '+962 6 555 0200',
  inventoryUpdatedAt: null,
  ...privateRelations,
};

const period = (startsAt: string, endsAt: string) => ({
  id: PERIOD_ID,
  pharmacyId: CENTRAL,
  startsAt: new Date(startsAt),
  endsAt: new Date(endsAt),
  createdBy: 'staff@example.test',
  pharmacy: { id: CENTRAL, subscription: privateRelations.subscription },
});

// Central is on duty at the clock time and has another period later.
const PERIODS = [
  period('2026-11-04T20:00:00+03:00', '2026-11-05T08:00:00+03:00'),
  period('2026-11-06T20:00:00+03:00', '2026-11-07T08:00:00+03:00'),
];

const stockRow = (pharmacyId: string) => ({
  pharmacyId,
  quantity: 137,
  expiryDate: '2027-06-01',
  id: 'batch-id',
  batchNumber: 'B-1',
  unitCost: '2.50',
  storageLocation: 'Shelf 3',
  barcode: '123456',
  medicine: { id: MEDICINE_ID, displayName: 'Amoxil 500' },
});

const SECRETS = [
  CENTRAL,
  NORTHERN,
  PERIOD_ID,
  MEDICINE_ID,
  USER_ID,
  'pharmacyId',
  'subscription',
  'suspended',
  'medicine',
  'Amoxil',
  'Amoxicillin',
  'batch',
  'B-1',
  'quantity',
  '137',
  'expiryDate',
  'unitCost',
  '2.50',
  'storageLocation',
  'Shelf 3',
  'barcode',
  '123456',
  'createdBy',
  'users',
  'staff@example.test',
  'passwordHash',
  'secret-hash',
  'postgres',
  'secret-password',
];

// tsx does not emit decorator metadata, so add the parameter types tsc emits for
// the running API. ValidationPipe needs them to know which DTO to validate against.
Reflect.defineMetadata(
  'design:paramtypes',
  [PublicPharmaciesQueryDto],
  PublicController.prototype,
  'listPharmacies',
);
Reflect.defineMetadata(
  'design:paramtypes',
  [MedicineSearchQueryDto],
  PublicController.prototype,
  'searchMedicines',
);

describe('public JSON contains only allowlisted keys', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  let app: INestApplication;
  let url: string;
  let subscriptions: InMemorySubscriptionStatus;

  const getText = async (path: string) => {
    const response = await fetch(`${url}/api/public/${path}`);
    assert.equal(response.status, 200);
    return response.text();
  };

  before(async () => {
    subscriptions = new InMemorySubscriptionStatus();
    subscriptions.set(CENTRAL, 'ACTIVE');
    subscriptions.set(NORTHERN, 'ACTIVE');

    class AllowlistTestModule {}
    Module({
      controllers: [PublicController],
      providers: [
        PublicService,
        {
          provide: PHARMACY_STORE,
          useValue: new InMemoryPharmacyStore([CENTRAL_ROW, NORTHERN_ROW]),
        },
        {
          provide: DUTY_PERIOD_STORE,
          useValue: {
            listEndingAfter: async (pharmacyIds: string[]) =>
              PERIODS.filter((row) => pharmacyIds.includes(row.pharmacyId)),
          },
        },
        { provide: SUBSCRIPTION_STATUS, useValue: subscriptions },
        {
          provide: CLOCK,
          useValue: new FixedClock(new Date('2026-11-05T02:00:00+03:00')),
        },
        {
          provide: MEDICINE_AVAILABILITY_STORE,
          useValue: {
            listBatchesOfMatchingMedicines: async () => [
              stockRow(CENTRAL),
              stockRow(CENTRAL),
              stockRow(NORTHERN),
            ],
          },
        },
      ],
    })(AllowlistTestModule);

    app = await NestFactory.create(AllowlistTestModule, { logger: false });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(pipe);
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });

  after(() => app.close());

  for (const [label, path] of [
    ['GET /public/pharmacies', 'pharmacies'],
    ['GET /public/medicines', 'medicines?q=amox'],
  ]) {
    describe(label, () => {
      it('has exactly the allowlisted keys, including nested duty objects', async () => {
        const body = JSON.parse(await getText(path));

        // The nested paths are only present because Central has both periods.
        assert.deepEqual(keyPaths(body), ALLOWED_KEY_PATHS);
        assert.deepEqual(Object.keys(body.items[0].currentDuty).sort(), [
          'endsAt',
          'startsAt',
        ]);
        assert.deepEqual(Object.keys(body.items[0].nextDuty).sort(), [
          'endsAt',
          'startsAt',
        ]);
      });

      it('has no private key or value anywhere in the text', async () => {
        const text = await getText(path);

        for (const secret of SECRETS) {
          assert.equal(text.includes(secret), false, `leaked ${secret}`);
        }
        assert.equal(/"id"/.test(text), false);
      });

      it('passes the strict public DTO, which rejects any extra field', async () => {
        const body = JSON.parse(await getText(path));

        for (const item of body.items) {
          await pipe.transform(item, {
            type: 'body',
            metatype: PublicPharmacyDto,
          });
        }
      });
    });
  }

  it('has no nested duty keys when both periods are null', async () => {
    const body = JSON.parse(await getText('pharmacies?area=Uptown'));

    assert.equal(body.items[0].currentDuty, null);
    assert.equal(body.items[0].nextDuty, null);
    assert.deepEqual(keyPaths(body), WITHOUT_NESTED_DUTY_KEYS);
  });

  it('has only items and total for an empty result', async () => {
    const text = await getText('pharmacies?area=Nowhere');

    assert.deepEqual(JSON.parse(text), { items: [], total: 0 });
  });

  it('holds for the mapper on its own after serializing', () => {
    const json = JSON.stringify({
      items: [
        toPublicPharmacy(
          CENTRAL_ROW,
          PERIODS,
          new Date('2026-11-05T02:00:00+03:00'),
        ),
      ],
      total: 1,
    });

    assert.deepEqual(keyPaths(JSON.parse(json)), ALLOWED_KEY_PATHS);
  });

  it('holds for the privacy example shown in Swagger', () => {
    assert.deepEqual(
      keyPaths(JSON.parse(JSON.stringify(PUBLIC_RESULT_EXAMPLE))),
      ALLOWED_KEY_PATHS,
    );
  });

  describe('error responses', () => {
    const whileStatusFails = async (
      failure: () => Promise<never>,
      path: string,
    ) => {
      const reader = mock.method(subscriptions, 'getEffectiveStatus', failure);
      try {
        return await fetch(`${url}/api/public/${path}`);
      } finally {
        reader.mock.restore();
      }
    };

    for (const [label, path] of [
      ['pharmacies with an invalid filter', 'pharmacies?onDutyNow=maybe'],
      ['medicines without q', 'medicines'],
    ]) {
      it(`400 for ${label} has only the error keys, no ID and no private value`, async () => {
        await assertCleanError(
          await fetch(`${url}/api/public/${path}`),
          400,
          SECRETS,
        );
      });
    }

    for (const path of ['pharmacies', 'medicines?q=amox']) {
      it(`503 for ${path} has only the error keys, no ID and no private value`, async () => {
        const response = await whileStatusFails(
          () =>
            Promise.reject(
              new ServiceUnavailableException(
                'Subscription status is not available yet',
              ),
            ),
          path,
        );

        await assertCleanError(response, 503, SECRETS);
      });

      it(`500 for ${path} reveals nothing about an unexpected error`, async () => {
        const response = await whileStatusFails(
          () => Promise.reject(new Error(DATABASE_ERROR)),
          path,
        );

        await assertCleanError(response, 500, SECRETS);
      });
    }
  });

  it('would notice a leaked key: the check itself', () => {
    const leaked = {
      items: [{ name: 'Central', currentDuty: { startsAt: 'x', id: 'y' } }],
      total: 1,
    };

    assert.deepEqual(keyPaths(leaked), [
      'items',
      'items[].currentDuty',
      'items[].currentDuty.id',
      'items[].currentDuty.startsAt',
      'items[].name',
      'total',
    ]);
  });
});
