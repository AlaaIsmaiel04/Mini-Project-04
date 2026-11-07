import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it, mock } from 'node:test';
import {
  type ExecutionContext,
  type INestApplication,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { JwtPharmacistGuard } from '../pharmacy/adapters/jwt-pharmacist.guard';
import { SUBSCRIPTION_STATUS } from '../pharmacy/adapters/subscription-status-reader';
import { CLOCK } from '../pharmacy/clock';
import { DutyPeriodController } from '../pharmacy/duty-period.controller';
import { DutyPeriodService } from '../pharmacy/duty-period.service';
import { PharmacyLock } from '../pharmacy/pharmacy-lock';
import { ProfileController } from '../pharmacy/profile.controller';
import { ProfileService } from '../pharmacy/profile.service';
import { DUTY_PERIOD_STORE } from '../pharmacy/stores/duty-period.store';
import { PHARMACY_STORE } from '../pharmacy/stores/pharmacy.store';
import { FixedClock } from '../pharmacy/testing/fixed-clock';
import { InMemoryDutyPeriodStore } from '../pharmacy/testing/in-memory-duty-period.store';
import { InMemoryPharmacyStore } from '../pharmacy/testing/in-memory-pharmacy.store';
import { InMemorySubscriptions } from '../pharmacy/testing/in-memory-subscriptions';
import { MedicineSearchQueryDto } from './dto/medicine-search-query.dto';
import { PublicPharmaciesQueryDto } from './dto/public-pharmacies-query.dto';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { MEDICINE_AVAILABILITY_STORE } from './stores/medicine-availability.store';
import { InMemoryMedicineAvailabilityStore } from './testing/in-memory-medicine-availability.store';

const CENTRAL = '11111111-1111-4111-8111-111111111111';
const WESTERN = '22222222-2222-4222-8222-222222222222';
const USER_ID = '33333333-3333-4333-8333-333333333333';

const AT_2AM = '2026-11-05T02:00:00+03:00';

const IN_DATE = {
  startDate: '2026-01-01',
  endDate: '2027-01-01',
  suspended: false,
};
const STARTS_TOMORROW = {
  startDate: '2026-11-06',
  endDate: '2027-11-06',
  suspended: false,
};

// Both pharmacies are in this area, on duty and in stock at every time used below, so
// only the subscription can keep one of them out of these results.
const LISTING = [
  'pharmacies',
  'pharmacies?area=Downtown',
  'pharmacies?onDutyNow=true',
];
const SEARCH = [
  'medicines?q=amox',
  'medicines?q=amox&area=Downtown',
  'medicines?q=amox&onDutyNow=true',
];
const EVERYWHERE = [...LISTING, ...SEARCH];

const pharmacy = (id: string, name: string) => ({
  id,
  name,
  area: 'Downtown',
  address: `${name} Street 12`,
  phone: '+962 6 555 0100',
  inventoryUpdatedAt: new Date('2026-11-04T18:30:00+03:00'),
});

const amoxil = (pharmacyId: string) => ({
  pharmacyId,
  displayName: 'Amoxil 500',
  scientificName: 'Amoxicillin',
  batches: [{ quantity: 5, expiryDate: '2027-06-01' }],
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

describe('a subscription change across the public and pharmacist routes', () => {
  let app: INestApplication;
  let url: string;
  let clock: FixedClock;
  let subscriptions: InMemorySubscriptions;

  const at = (instant: string) => {
    clock = new FixedClock(new Date(instant));
  };

  const publicItems = async (path: string) => {
    const response = await fetch(`${url}/api/public/${path}`);
    assert.equal(response.status, 200, path);
    const body = await response.json();
    assert.equal(body.total, body.items.length, path);
    return body.items;
  };

  async function assertListed(paths: string[], names: string[]): Promise<void> {
    for (const path of paths) {
      const items = await publicItems(path);
      assert.deepEqual(
        items.map((item: { name: string }) => item.name),
        names,
        path,
      );
    }
  }

  // Central's pharmacist, the only one signed in.
  const readOwn = async (path: string) => {
    const response = await fetch(`${url}/api/pharmacist/${path}`);
    assert.equal(response.status, 200, path);
    return response.json();
  };

  before(async () => {
    // Test only: stands in for sign-in so the rules behind the guard can run.
    mock.method(JwtPharmacistGuard.prototype, 'canActivate', ((
      context: ExecutionContext,
    ) => {
      context.switchToHttp().getRequest().actor = {
        userId: USER_ID,
        role: 'PHARMACIST',
        pharmacyId: CENTRAL,
      };
      return true;
    }) as never);

    const liveClock = { now: () => clock.now() };
    subscriptions = new InMemorySubscriptions(liveClock);

    // Two overnight periods each, so both are on duty at every time used below.
    const periods = new InMemoryDutyPeriodStore();
    for (const pharmacyId of [CENTRAL, WESTERN]) {
      await periods.create(pharmacyId, {
        startsAt: new Date('2026-11-04T20:00:00+03:00'),
        endsAt: new Date('2026-11-05T08:00:00+03:00'),
      });
      await periods.create(pharmacyId, {
        startsAt: new Date('2026-11-05T20:00:00+03:00'),
        endsAt: new Date('2026-11-06T08:00:00+03:00'),
      });
    }

    class VisibilityTestModule {}
    Module({
      controllers: [ProfileController, DutyPeriodController, PublicController],
      providers: [
        ProfileService,
        DutyPeriodService,
        PublicService,
        PharmacyLock,
        {
          provide: PHARMACY_STORE,
          useValue: new InMemoryPharmacyStore([
            pharmacy(CENTRAL, 'Central'),
            pharmacy(WESTERN, 'Western'),
          ]),
        },
        { provide: DUTY_PERIOD_STORE, useValue: periods },
        { provide: SUBSCRIPTION_STATUS, useValue: subscriptions },
        { provide: CLOCK, useValue: liveClock },
        {
          provide: MEDICINE_AVAILABILITY_STORE,
          useValue: new InMemoryMedicineAvailabilityStore([
            amoxil(CENTRAL),
            amoxil(WESTERN),
          ]),
        },
      ],
    })(VisibilityTestModule);

    app = await NestFactory.create(VisibilityTestModule, { logger: false });
    configure(app);
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });

  after(async () => {
    await app.close();
    mock.restoreAll();
  });

  beforeEach(() => {
    at(AT_2AM);
    subscriptions.save(CENTRAL, IN_DATE);
    subscriptions.save(WESTERN, IN_DATE);
  });

  it('lists an in-date pharmacy everywhere, so below only its subscription can hide it', async () => {
    await assertListed(EVERYWHERE, ['Central', 'Western']);
  });

  describe('deleting a subscription', () => {
    it('removes the pharmacy from the public listing', async () => {
      await assertListed(LISTING, ['Central', 'Western']);

      subscriptions.delete(CENTRAL);

      await assertListed(LISTING, ['Western']);
    });

    it('removes the pharmacy from medicine search', async () => {
      await assertListed(SEARCH, ['Central', 'Western']);

      subscriptions.delete(CENTRAL);

      await assertListed(SEARCH, ['Western']);
    });

    it('leaves the profile readable, now reporting NONE', async () => {
      const whileActive = await readOwn('profile');

      subscriptions.delete(CENTRAL);
      const afterDelete = await readOwn('profile');

      assert.equal(whileActive.subscriptionStatus, 'ACTIVE');
      assert.equal(afterDelete.subscriptionStatus, 'NONE');
      assert.equal(afterDelete.pharmacy.name, 'Central');
      assert.deepEqual(afterDelete.pharmacy, whileActive.pharmacy);
    });

    it('leaves the duty periods readable and unchanged', async () => {
      const whileActive = await readOwn('duty-periods');

      subscriptions.delete(CENTRAL);
      const afterDelete = await readOwn('duty-periods');

      assert.equal(whileActive.total, 2);
      assert.deepEqual(afterDelete, whileActive);
    });

    it('removes only the subscription: a new one restores the same public entries', async () => {
      const listing = await publicItems('pharmacies');
      const search = await publicItems('medicines?q=amox');

      subscriptions.delete(CENTRAL);
      await assertListed(EVERYWHERE, ['Western']);
      subscriptions.save(CENTRAL, IN_DATE);

      assert.deepEqual(await publicItems('pharmacies'), listing);
      assert.deepEqual(await publicItems('medicines?q=amox'), search);
    });
  });

  describe('a subscription that starts in the future', () => {
    beforeEach(() => {
      subscriptions.save(CENTRAL, STARTS_TOMORROW);
    });

    it('is hidden from the public listing', async () => {
      await assertListed(LISTING, ['Western']);
    });

    it('is hidden from medicine search', async () => {
      await assertListed(SEARCH, ['Western']);
    });

    it('counts as NONE, and its pharmacist can still read', async () => {
      const profile = await readOwn('profile');
      const periods = await readOwn('duty-periods');

      assert.equal(profile.subscriptionStatus, 'NONE');
      assert.equal(periods.total, 2);
    });

    it('stays hidden in the last millisecond before its start date in Amman', async () => {
      at('2026-11-05T23:59:59.999+03:00');

      await assertListed(EVERYWHERE, ['Western']);
    });

    it('is listed from midnight on its start date in Amman, while it is still the day before in UTC', async () => {
      at('2026-11-06T00:00:00+03:00');

      await assertListed(EVERYWHERE, ['Central', 'Western']);
    });
  });

  describe('a suspended subscription inside its dates', () => {
    beforeEach(() => {
      subscriptions.save(CENTRAL, { ...IN_DATE, suspended: true });
    });

    it('is hidden from the public listing', async () => {
      await assertListed(LISTING, ['Western']);
    });

    it('is hidden from medicine search', async () => {
      await assertListed(SEARCH, ['Western']);
    });

    it('counts as SUSPENDED, and its pharmacist can still read', async () => {
      const profile = await readOwn('profile');
      const periods = await readOwn('duty-periods');

      assert.equal(profile.subscriptionStatus, 'SUSPENDED');
      assert.equal(periods.total, 2);
    });

    it('is listed again once reactivated', async () => {
      await assertListed(EVERYWHERE, ['Western']);

      subscriptions.save(CENTRAL, IN_DATE);

      await assertListed(EVERYWHERE, ['Central', 'Western']);
    });
  });
});
