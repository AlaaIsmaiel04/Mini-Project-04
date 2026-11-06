import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mock, test } from 'node:test';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { parseCalendarDate } from '../../common/business-date';

// Public routes through the real AppModule, Prisma stores and PostgreSQL. Fixtures carry a
// unique tag, because other integration specs may share this database at the same time.

const AT_2AM = '2026-11-05T02:00:00+03:00';
const TODAY = '2026-11-05';
const YESTERDAY = '2026-11-04';
const FRESH = '2027-06-01';

const OVERNIGHT_UTC = {
  startsAt: '2026-11-04T17:00:00.000Z',
  endsAt: '2026-11-05T05:00:00.000Z',
};
const LATER_UTC = {
  startsAt: '2026-11-06T17:00:00.000Z',
  endsAt: '2026-11-07T05:00:00.000Z',
};

const IN_DATE = { start: '2026-01-01', end: '2027-01-01', suspended: false };
const SUSPENDED = { ...IN_DATE, suspended: true };
const FUTURE_START = {
  start: '2026-12-01',
  end: '2027-12-01',
  suspended: false,
};
const ENDED = { start: '2026-01-01', end: YESTERDAY, suspended: false };

const PUBLIC_KEY_PATHS = [
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

function keyPaths(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) {
    return [
      ...new Set(value.flatMap((item) => keyPaths(item, `${path}[]`))),
    ].sort();
  }
  if (value === null || typeof value !== 'object') return [];
  const paths = Object.entries(value).flatMap(([key, child]) => {
    const next = path ? `${path}.${key}` : key;
    return [next, ...keyPaths(child, next)];
  });
  return [...new Set(paths)].sort();
}

interface SubscriptionFixture {
  start: string;
  end: string;
  suspended: boolean;
}

test(
  'public directory and medicine search on real PostgreSQL',
  { skip: process.env.RUN_DB_TESTS !== 'true' },
  async (t) => {
    assert.match(
      new URL(process.env.DATABASE_URL!).pathname,
      /^\/smartshelf_test(?:_[a-z0-9_]+)?$/,
    );
    const { AppModule } = require('../../../dist/app.module');
    const { CLOCK } = require('../../../dist/modules/pharmacy/clock');

    const db = new PrismaClient();
    const tag = randomUUID().slice(0, 8);
    const token = `zq${tag}`;
    const literal = `lit${tag}`;
    const AREA = `Area${tag}`;
    const OTHER_AREA = `Other${tag}`;
    const LITERAL_AREA = `Literal${tag}`;
    const created: string[] = [];
    const secrets: string[] = [];
    let current = AT_2AM;
    let url = '';
    let app: any;

    const nameOf = (label: string) => `${tag} ${label}`;

    async function addPharmacy(
      label: string,
      area: string,
      subscription: SubscriptionFixture | null,
    ): Promise<string> {
      const id = randomUUID();
      created.push(id);
      secrets.push(id);
      await db.pharmacy.create({
        data: {
          id,
          name: nameOf(label),
          area,
          address: `${label} Street 12`,
          phone: '+962 6 555 0100',
          inventoryUpdatedAt: new Date('2026-11-04T18:30:00+03:00'),
        },
      });
      if (subscription) {
        await db.subscription.create({
          data: {
            pharmacyId: id,
            startDate: parseCalendarDate(subscription.start),
            endDate: parseCalendarDate(subscription.end),
            suspended: subscription.suspended,
          },
        });
      }
      return id;
    }

    async function addMedicine(
      pharmacyId: string,
      displayName: string,
      scientificName: string,
      batches: [quantity: number, expiry: string][],
    ): Promise<void> {
      await db.medicine.create({
        data: {
          pharmacyId,
          displayName,
          normalizedName: displayName.trim().toLowerCase(),
          scientificName,
          category: 'Test',
          reorderThreshold: 10,
          batches: {
            create: batches.map(([quantity, expiry], index) => ({
              batchNumber: `BN-${tag}-${index}`,
              quantity,
              unitCost: '7.25',
              expiryDate: parseCalendarDate(expiry),
              storageLocation: `Shelf-${tag}`,
              barcode: `BAR-${tag}`,
            })),
          },
        },
      });
    }

    const addPeriod = (
      pharmacyId: string,
      { startsAt, endsAt }: { startsAt: string; endsAt: string },
    ) =>
      db.dutyPeriod.create({
        data: {
          pharmacyId,
          startsAt: new Date(startsAt),
          endsAt: new Date(endsAt),
        },
      });

    const get = (path: string) => fetch(`${url}/api/public/${path}`);
    const bodyOf = async (path: string) => {
      const response = await get(path);
      assert.equal(response.status, 200, path);
      const body = await response.json();
      assert.equal(body.total, body.items.length, path);
      return body;
    };
    const names = async (path: string) =>
      (await bodyOf(path)).items.map((item: { name: string }) => item.name);
    const search = (q: string, filters = '') =>
      `medicines?q=${encodeURIComponent(q)}${filters}`;

    try {
      const alpha = await addPharmacy('Alpha', AREA, IN_DATE);
      const bravo = await addPharmacy('Bravo', OTHER_AREA, IN_DATE);
      const charlie = await addPharmacy('Charlie', AREA, IN_DATE);
      const delta = await addPharmacy('Delta', AREA, IN_DATE);
      const echo = await addPharmacy('Echo', AREA, SUSPENDED);
      const foxtrot = await addPharmacy('Foxtrot', AREA, FUTURE_START);
      const golf = await addPharmacy('Golf', AREA, ENDED);
      const hotel = await addPharmacy('Hotel', AREA, null);
      await addPharmacy('India', AREA, IN_DATE);
      const juliet = await addPharmacy('Juliet', LITERAL_AREA, IN_DATE);
      const kilo = await addPharmacy('Kilo', LITERAL_AREA, IN_DATE);
      const lima = await addPharmacy('Lima', LITERAL_AREA, IN_DATE);
      const mike = await addPharmacy('Mike', LITERAL_AREA, IN_DATE);

      // Two good batches, an expired one and an empty one, plus a second matching medicine.
      await addMedicine(alpha, `Zolvax ${token} 500`, `Zolvacillin${token}`, [
        [5, FRESH],
        [3, FRESH],
        [9, YESTERDAY],
        [0, FRESH],
      ]);
      await addMedicine(alpha, `Zolvax ${token} Forte`, 'Other compound', [
        [2, FRESH],
      ]);
      // Listed today only: the batch expires today.
      await addMedicine(bravo, `Zolvax ${token} 500`, 'Other compound', [
        [1, TODAY],
      ]);
      await addMedicine(charlie, `Zolvax ${token} 500`, 'Other compound', [
        [9, YESTERDAY],
      ]);
      await addMedicine(delta, `Zolvax ${token} 500`, 'Other compound', [
        [0, FRESH],
      ]);
      for (const inactive of [echo, foxtrot, golf, hotel]) {
        await addMedicine(inactive, `Zolvax ${token} 500`, 'Other compound', [
          [5, FRESH],
        ]);
      }
      await addMedicine(juliet, `Cream100%${literal}`, 'Other compound', [
        [5, FRESH],
      ]);
      await addMedicine(kilo, `A_B${literal}`, 'Other compound', [[5, FRESH]]);
      await addMedicine(lima, `AxB${literal}`, 'Other compound', [[5, FRESH]]);
      await addMedicine(mike, `Back\\slash${literal}`, 'Other compound', [
        [5, FRESH],
      ]);

      await addPeriod(alpha, OVERNIGHT_UTC);
      await addPeriod(alpha, LATER_UTC);
      await addPeriod(echo, OVERNIGHT_UTC);
      await addPeriod(hotel, OVERNIGHT_UTC);

      app = await NestFactory.create(AppModule, { logger: false });
      app.setGlobalPrefix('api');
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      // The real clock instance, frozen, so date and duty boundaries can be tested exactly.
      mock.method(
        app.get(CLOCK, { strict: false }),
        'now',
        () => new Date(current),
      );
      await app.listen(0, '127.0.0.1');
      url = await app.getUrl();

      await t.test(
        'directory lists ACTIVE pharmacies only, with or without stock, with exact fields',
        async () => {
          const body = await bodyOf(`pharmacies?area=${AREA}`);

          assert.deepEqual(
            body.items.map((item: { name: string }) => item.name),
            [
              nameOf('Alpha'),
              nameOf('Charlie'),
              nameOf('Delta'),
              nameOf('India'),
            ],
          );
          assert.deepEqual(body.items[0], {
            name: nameOf('Alpha'),
            area: AREA,
            address: 'Alpha Street 12',
            phone: '+962 6 555 0100',
            onDutyNow: true,
            currentDuty: OVERNIGHT_UTC,
            nextDuty: LATER_UTC,
            inventoryUpdatedAt: '2026-11-04T15:30:00.000Z',
          });
          assert.deepEqual(body.items[3], {
            name: nameOf('India'),
            area: AREA,
            address: 'India Street 12',
            phone: '+962 6 555 0100',
            onDutyNow: false,
            currentDuty: null,
            nextDuty: null,
            inventoryUpdatedAt: '2026-11-04T15:30:00.000Z',
          });
        },
      );

      await t.test(
        'duty is half-open at the exact start and end, overnight included',
        async () => {
          const alphaAt = async (instant: string) => {
            current = instant;
            return (await bodyOf(`pharmacies?area=${AREA}`)).items[0];
          };
          try {
            assert.equal(
              (await alphaAt('2026-11-04T19:59:59.999+03:00')).onDutyNow,
              false,
            );
            assert.deepEqual(
              (await alphaAt('2026-11-04T20:00:00+03:00')).currentDuty,
              OVERNIGHT_UTC,
            );
            assert.equal(
              (await alphaAt('2026-11-05T07:59:59.999+03:00')).onDutyNow,
              true,
            );

            const atEnd = await alphaAt('2026-11-05T08:00:00+03:00');
            assert.equal(atEnd.onDutyNow, false);
            assert.equal(atEnd.currentDuty, null);
            assert.deepEqual(atEnd.nextDuty, LATER_UTC);
            assert.deepEqual(
              await names(`pharmacies?area=${AREA}&onDutyNow=true`),
              [],
            );
          } finally {
            current = AT_2AM;
          }
        },
      );

      await t.test(
        'area ignores case and spaces but needs the whole name',
        async () => {
          const whole = [nameOf('Bravo')];

          assert.deepEqual(await names(`pharmacies?area=${OTHER_AREA}`), whole);
          assert.deepEqual(
            await names(`pharmacies?area=%20%20${OTHER_AREA.toUpperCase()}%20`),
            whole,
          );
          assert.deepEqual(
            await names(`pharmacies?area=${OTHER_AREA.slice(0, -1)}`),
            [],
          );
        },
      );

      await t.test(
        'search needs an ACTIVE subscription and one unexpired batch with units, once per pharmacy',
        async () => {
          assert.deepEqual(await names(search(token)), [
            nameOf('Alpha'),
            nameOf('Bravo'),
          ]);
        },
      );

      await t.test(
        'search matches part of a display or scientific name, ignoring case',
        async () => {
          assert.deepEqual(
            await names(search(`ZOLVAX ${token.toUpperCase()}`)),
            [nameOf('Alpha'), nameOf('Bravo')],
          );
          assert.deepEqual(await names(search(`vacillin${token}`)), [
            nameOf('Alpha'),
          ]);
          assert.deepEqual(
            await names(search(`VACILLIN${token.toUpperCase()}`)),
            [nameOf('Alpha')],
          );
        },
      );

      await t.test(
        'expiry follows the date in Asia/Amman, not in UTC',
        async () => {
          try {
            current = '2026-11-05T23:59:59.999+03:00';
            assert.deepEqual(await names(search(token)), [
              nameOf('Alpha'),
              nameOf('Bravo'),
            ]);

            // 21:00 on 5 November in UTC, but already the 6th in Amman.
            current = '2026-11-06T00:00:00+03:00';
            assert.deepEqual(await names(search(token)), [nameOf('Alpha')]);
          } finally {
            current = AT_2AM;
          }
        },
      );

      await t.test('search combines q, area and onDutyNow', async () => {
        assert.deepEqual(await names(search(token, `&area=${OTHER_AREA}`)), [
          nameOf('Bravo'),
        ]);
        assert.deepEqual(await names(search(token, '&onDutyNow=true')), [
          nameOf('Alpha'),
        ]);
        assert.deepEqual(
          await names(search(token, `&area=${AREA}&onDutyNow=true`)),
          [nameOf('Alpha')],
        );
        assert.deepEqual(
          await names(search(token, `&area=${OTHER_AREA}&onDutyNow=true`)),
          [],
        );
      });

      await t.test(
        'an unmatched search is 200 with an empty list; an empty q is 400',
        async () => {
          const response = await get(search(`nothing${tag}`));

          assert.equal(response.status, 200);
          assert.deepEqual(await response.json(), { items: [], total: 0 });
          assert.equal((await get('medicines')).status, 400);
          assert.equal((await get('medicines?q=%20%20')).status, 400);
        },
      );

      await t.test('%, _ and \\ in q match literally', async () => {
        assert.deepEqual(await names(search(`100%${literal}`)), [
          nameOf('Juliet'),
        ]);
        assert.deepEqual(await names(search(`%${literal}`)), [
          nameOf('Juliet'),
        ]);
        assert.deepEqual(await names(search(`A_B${literal}`)), [
          nameOf('Kilo'),
        ]);
        assert.deepEqual(await names(search(`_B${literal}`)), [nameOf('Kilo')]);
        assert.deepEqual(await names(search(`Back\\slash${literal}`)), [
          nameOf('Mike'),
        ]);

        for (const pattern of ['%', '_', '\\']) {
          const found = await names(search(pattern));
          assert.equal(found.includes(nameOf('Alpha')), false, pattern);
          assert.equal(found.includes(nameOf('Lima')), false, pattern);
        }
      });

      await t.test(
        'public JSON has exactly the allowlisted keys and no private value',
        async () => {
          for (const path of [`pharmacies?area=${AREA}`, search(token)]) {
            const response = await get(path);
            const text = await response.text();

            assert.equal(response.status, 200);
            assert.deepEqual(keyPaths(JSON.parse(text)), PUBLIC_KEY_PATHS);
            for (const secret of [
              ...secrets,
              token,
              'Zolvax',
              'Zolvacillin',
              `BN-${tag}`,
              `Shelf-${tag}`,
              `BAR-${tag}`,
              '7.25',
              '"id"',
              'pharmacyId',
              'quantity',
              'subscription',
              'suspended',
            ]) {
              assert.equal(text.includes(secret), false, `leaked ${secret}`);
            }
          }
        },
      );
    } finally {
      mock.restoreAll();
      if (app) await app.close();
      const where = { pharmacyId: { in: created } };
      await db.batch.deleteMany({ where: { medicine: where } });
      await db.medicine.deleteMany({ where });
      await db.dutyPeriod.deleteMany({ where });
      await db.subscription.deleteMany({ where });
      await db.pharmacy.deleteMany({ where: { id: { in: created } } });
      await db.$disconnect();
    }
  },
);
