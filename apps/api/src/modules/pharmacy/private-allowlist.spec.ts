import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it, mock } from 'node:test';
import {
  type ExecutionContext,
  type INestApplication,
  Module,
  ServiceUnavailableException,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { JwtPharmacistGuard } from './adapters/jwt-pharmacist.guard';
import { SUBSCRIPTION_STATUS } from './adapters/subscription-status-reader';
import { DutyInputDto } from './dto/duty-input.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { DutyPeriodController } from './duty-period.controller';
import { DutyPeriodService } from './duty-period.service';
import { PharmacyLock } from './pharmacy-lock';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import {
  DUTY_PERIOD_STORE,
  type DutyPeriodRecord,
  type DutyTimes,
} from './stores/duty-period.store';
import { PHARMACY_STORE } from './stores/pharmacy.store';
import { InMemoryDutyPeriodStore } from './testing/in-memory-duty-period.store';
import { InMemoryPharmacyStore } from './testing/in-memory-pharmacy.store';
import { InMemorySubscriptionStatus } from './testing/in-memory-subscription-status';
import {
  assertCleanError,
  assertNoValues,
  keyPaths,
} from './testing/response-allowlist';

const CENTRAL = '11111111-1111-4111-8111-111111111111';
const NORTHERN = '22222222-2222-4222-8222-222222222222';
const USER_ID = '33333333-3333-4333-8333-333333333333';
const MEDICINE_ID = '55555555-5555-4555-8555-555555555555';
const MISSING_PHARMACY = '99999999-9999-4999-8999-999999999999';
const MISSING_PERIOD = '88888888-8888-4888-8888-888888888888';
const TOKEN = 'secret-token-value';
const DATABASE_ERROR = 'connect failed: postgres://admin:secret-password@db';

// Every key each response may contain, at any depth.
const PROFILE_KEYS = [
  'pharmacy',
  'pharmacy.address',
  'pharmacy.area',
  'pharmacy.id',
  'pharmacy.inventoryUpdatedAt',
  'pharmacy.name',
  'pharmacy.phone',
  'subscriptionStatus',
];
const DUTY_KEYS = ['endsAt', 'id', 'startsAt'];
const DUTY_LIST_KEYS = [
  'items',
  'items[].endsAt',
  'items[].id',
  'items[].startsAt',
  'total',
];

// Rows carry far more than a response may show, as database rows with relations would.
const privateRelations = {
  pharmacyId: CENTRAL,
  subscription: {
    id: 'subscription-id',
    suspended: false,
    startDate: '2026-01-01',
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

const withRelations = (period: DutyPeriodRecord) => ({
  ...period,
  createdBy: 'staff@example.test',
  pharmacy: { id: period.pharmacyId, ...privateRelations },
});

class DutyRowsWithRelations extends InMemoryDutyPeriodStore {
  override async listForPharmacy(pharmacyId: string) {
    return (await super.listForPharmacy(pharmacyId)).map(withRelations);
  }

  override async listEndingAfter(pharmacyIds: string[], at: Date) {
    return (await super.listEndingAfter(pharmacyIds, at)).map(withRelations);
  }

  override async create(pharmacyId: string, times: DutyTimes) {
    return withRelations(await super.create(pharmacyId, times));
  }

  override async update(pharmacyId: string, id: string, times: DutyTimes) {
    return withRelations(await super.update(pharmacyId, id, times));
  }
}

// No private response may contain these values, under any key.
const PRIVATE_VALUES = [
  NORTHERN,
  'Northern',
  '+962 6 555 0200',
  USER_ID,
  MEDICINE_ID,
  TOKEN,
  'subscription-id',
  '2027-01-01',
  'Amoxil',
  'Amoxicillin',
  'batch-id',
  'B-1',
  '2.50',
  'Shelf 3',
  '123456',
  'staff@example.test',
  'secret-hash',
  'postgres',
  'secret-password',
];
// A duty period does not name its pharmacy. Only the profile shows that ID.
const NOT_IN_A_DUTY_PERIOD = [...PRIVATE_VALUES, CENTRAL];

const OVERNIGHT = {
  startsAt: '2026-11-04T20:00:00+03:00',
  endsAt: '2026-11-05T08:00:00+03:00',
};
const FREE_TIMES = {
  startsAt: '2026-11-06T20:00:00+03:00',
  endsAt: '2026-11-07T08:00:00+03:00',
};
const VALID_PROFILE = {
  area: 'Abdoun',
  address: '77 Garden Street',
  phone: '0795550199',
};

const pharmacist = (pharmacyId: string) => ({
  userId: USER_ID,
  role: 'PHARMACIST',
  pharmacyId,
});

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

describe('private JSON contains only the contract keys', () => {
  let app: INestApplication;
  let url: string;
  let pharmacies: InMemoryPharmacyStore;
  let periods: DutyRowsWithRelations;
  let subscriptions: InMemorySubscriptionStatus;
  let signedIn: object | undefined;
  let ownPeriodId: string;
  let northernPeriodId: string;

  const send = (method: string, path: string, body?: unknown) =>
    fetch(`${url}/api/pharmacist/${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  const whileInactive = (
    status: 'EXPIRED' | 'SUSPENDED' | 'NONE',
    request: () => Promise<Response>,
  ) => {
    subscriptions.set(CENTRAL, status);
    return request();
  };

  const signedInAs = (actor: object | undefined) => {
    signedIn = actor;
    return send('GET', 'profile');
  };

  before(async () => {
    // Test only: stands in for sign-in so the rules behind the guard can run.
    mock.method(JwtPharmacistGuard.prototype, 'canActivate', ((
      context: ExecutionContext,
    ) => {
      context.switchToHttp().getRequest().actor = signedIn;
      return true;
    }) as never);

    let created = 0;
    pharmacies = new InMemoryPharmacyStore([CENTRAL_ROW, NORTHERN_ROW]);
    // Fixed IDs, so no generated ID can happen to contain a private value.
    periods = new DutyRowsWithRelations(
      undefined,
      () => `44444444-4444-4444-8444-${String(++created).padStart(12, '4')}`,
    );
    subscriptions = new InMemorySubscriptionStatus();

    class PrivateAllowlistTestModule {}
    Module({
      controllers: [ProfileController, DutyPeriodController],
      providers: [
        ProfileService,
        DutyPeriodService,
        PharmacyLock,
        { provide: PHARMACY_STORE, useValue: pharmacies },
        { provide: DUTY_PERIOD_STORE, useValue: periods },
        { provide: SUBSCRIPTION_STATUS, useValue: subscriptions },
      ],
    })(PrivateAllowlistTestModule);

    app = await NestFactory.create(PrivateAllowlistTestModule, {
      logger: false,
    });
    configure(app);
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });

  after(async () => {
    await app.close();
    mock.restoreAll();
  });

  beforeEach(async () => {
    signedIn = pharmacist(CENTRAL);
    subscriptions.set(CENTRAL, 'ACTIVE');
    subscriptions.set(NORTHERN, 'ACTIVE');
    for (const pharmacyId of [CENTRAL, NORTHERN]) {
      for (const { id } of await periods.listForPharmacy(pharmacyId)) {
        await periods.delete(pharmacyId, id);
      }
    }
    const times = {
      startsAt: new Date(OVERNIGHT.startsAt),
      endsAt: new Date(OVERNIGHT.endsAt),
    };
    ownPeriodId = (await periods.create(CENTRAL, times)).id;
    northernPeriodId = (await periods.create(NORTHERN, times)).id;
  });

  describe('success responses', () => {
    const successes: [
      string,
      number,
      string[],
      string[],
      () => Promise<Response>,
    ][] = [
      [
        'GET profile',
        200,
        PROFILE_KEYS,
        PRIVATE_VALUES,
        () => send('GET', 'profile'),
      ],
      [
        'GET profile with no subscription',
        200,
        PROFILE_KEYS,
        PRIVATE_VALUES,
        () => whileInactive('NONE', () => send('GET', 'profile')),
      ],
      [
        'PATCH profile',
        200,
        PROFILE_KEYS,
        PRIVATE_VALUES,
        () => send('PATCH', 'profile', VALID_PROFILE),
      ],
      [
        'GET duty periods',
        200,
        DUTY_LIST_KEYS,
        NOT_IN_A_DUTY_PERIOD,
        () => send('GET', 'duty-periods'),
      ],
      [
        'POST duty period',
        201,
        DUTY_KEYS,
        NOT_IN_A_DUTY_PERIOD,
        () => send('POST', 'duty-periods', FREE_TIMES),
      ],
      [
        'PATCH duty period',
        200,
        DUTY_KEYS,
        NOT_IN_A_DUTY_PERIOD,
        () => send('PATCH', `duty-periods/${ownPeriodId}`, FREE_TIMES),
      ],
    ];

    for (const [label, status, keys, privateValues, request] of successes) {
      it(`${label} has exactly the contract keys and no private value`, async () => {
        const response = await request();
        const text = await response.text();

        assert.equal(response.status, status, text);
        assert.deepEqual(keyPaths(JSON.parse(text)), keys);
        assertNoValues(text, privateValues);
      });
    }
  });

  describe('error responses', () => {
    const whileFailing = async (
      target: object,
      method: string,
      failure: () => Promise<never>,
      request: () => Promise<Response>,
    ) => {
      const failing = mock.method(target as never, method as never, failure);
      try {
        return await request();
      } finally {
        failing.mock.restore();
      }
    };

    const errors: [string, number, () => Promise<Response>][] = [
      [
        'PATCH profile with an unknown field',
        400,
        () =>
          send('PATCH', 'profile', { ...VALID_PROFILE, pharmacyId: NORTHERN }),
      ],
      [
        'PATCH profile with invalid values',
        400,
        () =>
          send('PATCH', 'profile', {
            area: 'A',
            address: 'Road',
            phone: 'call me',
          }),
      ],
      [
        'POST duty period without an offset',
        400,
        () =>
          send('POST', 'duty-periods', {
            startsAt: '2026-11-06T20:00',
            endsAt: '2026-11-07T08:00',
          }),
      ],
      [
        'POST duty period with the end before the start',
        400,
        () =>
          send('POST', 'duty-periods', {
            startsAt: FREE_TIMES.endsAt,
            endsAt: FREE_TIMES.startsAt,
          }),
      ],
      [
        'DELETE duty period with an invalid ID',
        400,
        () => send('DELETE', 'duty-periods/not-a-uuid'),
      ],
      ['GET profile without a sign-in', 401, () => signedInAs(undefined)],
      [
        'GET profile as an owner',
        403,
        () => signedInAs({ userId: USER_ID, role: 'OWNER', pharmacyId: null }),
      ],
      [
        'PATCH profile when EXPIRED',
        403,
        () =>
          whileInactive('EXPIRED', () =>
            send('PATCH', 'profile', VALID_PROFILE),
          ),
      ],
      [
        'POST duty period when SUSPENDED',
        403,
        () =>
          whileInactive('SUSPENDED', () =>
            send('POST', 'duty-periods', FREE_TIMES),
          ),
      ],
      [
        'DELETE duty period with no subscription',
        403,
        () =>
          whileInactive('NONE', () =>
            send('DELETE', `duty-periods/${ownPeriodId}`),
          ),
      ],
      [
        'GET profile when the pharmacy no longer exists',
        404,
        () => signedInAs(pharmacist(MISSING_PHARMACY)),
      ],
      [
        'PATCH duty period with an ID of another pharmacy',
        404,
        () => send('PATCH', `duty-periods/${northernPeriodId}`, FREE_TIMES),
      ],
      [
        'DELETE duty period with an unknown ID',
        404,
        () => send('DELETE', `duty-periods/${MISSING_PERIOD}`),
      ],
      [
        'POST duty period overlapping an existing one',
        409,
        () => send('POST', 'duty-periods', OVERNIGHT),
      ],
      [
        'GET profile with the database unavailable',
        503,
        () =>
          whileFailing(
            pharmacies,
            'findById',
            () =>
              Promise.reject(
                new ServiceUnavailableException(
                  'The database is not available yet',
                ),
              ),
            () => send('GET', 'profile'),
          ),
      ],
      [
        'POST duty period with the subscription status unavailable',
        503,
        () =>
          whileFailing(
            subscriptions,
            'getEffectiveStatus',
            () =>
              Promise.reject(
                new ServiceUnavailableException(
                  'Subscription status is not available yet',
                ),
              ),
            () => send('POST', 'duty-periods', FREE_TIMES),
          ),
      ],
      [
        'GET profile with an unexpected database error',
        500,
        () =>
          whileFailing(
            pharmacies,
            'findById',
            () => Promise.reject(new Error(DATABASE_ERROR)),
            () => send('GET', 'profile'),
          ),
      ],
      [
        'GET duty periods with an unexpected database error',
        500,
        () =>
          whileFailing(
            periods,
            'listForPharmacy',
            () => Promise.reject(new Error(DATABASE_ERROR)),
            () => send('GET', 'duty-periods'),
          ),
      ],
    ];

    for (const [label, status, request] of errors) {
      it(`${label}: ${status} with only the error keys, no ID and no private value`, async () => {
        await assertCleanError(await request(), status, NOT_IN_A_DUTY_PERIOD);
      });
    }
  });
});
