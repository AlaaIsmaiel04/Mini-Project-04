import 'reflect-metadata';
import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import {
  addCalendarDays,
  businessDate,
  parseCalendarDate,
} from './common/business-date';

test(
  'persisted dashboard, profile and duty HTTP acceptance',
  { skip: process.env.RUN_DB_TESTS !== 'true' },
  async (t) => {
    assert.match(
      new URL(process.env.DATABASE_URL!).pathname,
      /^\/smartshelf_test(?:_[a-z0-9_]+)?$/,
    );
    const { AppModule } = require('../dist/app.module');
    const db = new PrismaClient();
    const p = [randomUUID(), randomUUID(), randomUUID()],
      accounts = [randomUUID(), randomUUID(), randomUUID(), randomUUID()],
      today = businessDate();
    const passwordHash = await hash('TestPassword123!', 10);
    let app: any, second: any;
    async function boot() {
      const a = await NestFactory.create(AppModule, { logger: false });
      a.setGlobalPrefix('api');
      a.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      await a.listen(0, '127.0.0.1');
      return a;
    }
    let base = '';
    async function call(
      method: string,
      path: string,
      token?: string,
      body?: unknown,
      url = base,
    ) {
      const r = await fetch(url + path, {
        method,
        headers: {
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return {
        status: r.status,
        body: r.status === 204 ? null : await r.json(),
      };
    }
    try {
      await db.pharmacy.createMany({
        data: p.map((id, i) => ({
          id,
          name: 'Review ' + i,
          area: 'North',
          address: 'Test Street',
          phone: '0791234567',
        })),
      });
      await db.subscription.createMany({
        data: p.map((pharmacyId, i) => ({
          pharmacyId,
          startDate: parseCalendarDate(addCalendarDays(today, -5)),
          endDate: parseCalendarDate(addCalendarDays(today, 365)),
          suspended: i === 2,
        })),
      });
      await db.account.createMany({
        data: accounts.map((id, i) => ({
          id,
          email: id + '@test.local',
          passwordHash,
          role: i === 3 ? 'OWNER' : 'PHARMACIST',
          pharmacyId: i === 3 ? null : p[i],
        })),
      });
      const medicine = await db.medicine.create({
        data: {
          pharmacyId: p[0],
          displayName: 'Review medicine',
          normalizedName: 'review medicine',
          scientificName: 'Compound',
          category: 'Test',
          reorderThreshold: 10,
          batches: {
            create: [
              {
                batchNumber: 'A',
                quantity: 10,
                unitCost: '2.50',
                expiryDate: parseCalendarDate(addCalendarDays(today, 30)),
                storageLocation: 'A',
              },
              {
                batchNumber: 'B',
                quantity: 3,
                unitCost: '4.00',
                expiryDate: parseCalendarDate(addCalendarDays(today, -1)),
                storageLocation: 'B',
              },
            ],
          },
        },
      });
      await db.medicine.create({
        data: {
          pharmacyId: p[1],
          displayName: 'Other pharmacy',
          normalizedName: 'other pharmacy',
          scientificName: 'Other',
          category: 'Test',
          reorderThreshold: 1,
        },
      });
      app = await boot();
      base = (await app.getUrl()) + '/api';
      const tokens = [];
      for (const id of accounts) {
        const login = await call('POST', '/auth/login', undefined, {
          email: id + '@test.local',
          password: 'TestPassword123!',
        });
        assert.equal(login.status, 200);
        tokens.push(login.body.accessToken);
      }
      const [active, other, inactive, owner] = tokens;
      await t.test(
        'dashboard contract, decimal arithmetic, all badges, own scope and inactive empty reads',
        async () => {
          assert.equal(
            (await call('GET', '/pharmacist/dashboard')).status,
            401,
          );
          assert.equal(
            (await call('GET', '/pharmacist/dashboard', owner)).status,
            403,
          );
          const r = await call('GET', '/pharmacist/dashboard', active);
          assert.equal(r.status, 200);
          assert.deepEqual(
            Object.keys(r.body).sort(),
            [
              'pharmacyName',
              'subscriptionStatus',
              'totalMedicines',
              'totalUnits',
              'inventoryValue',
              'expiringSoonBatchCount',
              'lowStockMedicineCount',
              'expiredBatchCount',
              'expectedWaste',
              'attentionItems',
            ].sort(),
          );
          assert.equal(r.body.pharmacyName, 'Review 0');
          assert.equal(r.body.totalUnits, 10);
          assert.equal(r.body.inventoryValue, '25.00');
          assert.equal(r.body.expectedWaste, '12.00');
          assert.equal(r.body.expiringSoonBatchCount, 1);
          assert.equal(r.body.expiredBatchCount, 1);
          assert.equal(r.body.lowStockMedicineCount, 1);
          assert.deepEqual(r.body.attentionItems, [
            {
              medicineId: medicine.id,
              displayName: medicine.displayName,
              indicators: ['LOW_STOCK', 'EXPIRED', 'EXPIRING_SOON'],
            },
          ]);
          const empty = await call('GET', '/pharmacist/dashboard', inactive);
          assert.equal(empty.status, 200);
          assert.equal(empty.body.subscriptionStatus, 'SUSPENDED');
          assert.equal(empty.body.inventoryValue, '0.00');
          assert.deepEqual(empty.body.attentionItems, []);
          const doc = SwaggerModule.createDocument(
            app,
            new DocumentBuilder().addBearerAuth().build(),
          );
          assert.ok(doc.paths['/api/pharmacist/dashboard'].get?.security);
          assert.ok(doc.components?.schemas?.DashboardResponseDto);
        },
      );
      await t.test(
        'Day 10 inventory writes update dashboard totals and simultaneous indicators',
        async () => {
          const created = await call('POST', '/pharmacist/medicines', other, {
            displayName: 'Day 10 medicine',
            scientificName: 'Day 10 compound',
            category: 'Test',
            reorderThreshold: 10,
          });
          assert.equal(created.status, 201);
          const id = created.body.id;
          const soon = await call(
            'POST',
            `/pharmacist/medicines/${id}/batches`,
            other,
            {
              batchNumber: 'SOON',
              quantity: 10,
              unitCost: '2.50',
              expiryDate: addCalendarDays(today, 30),
              storageLocation: 'A',
            },
          );
          const expired = await call(
            'POST',
            `/pharmacist/medicines/${id}/batches`,
            other,
            {
              batchNumber: 'EXPIRED',
              quantity: 3,
              unitCost: '4.00',
              expiryDate: addCalendarDays(today, -1),
              storageLocation: 'B',
            },
          );
          assert.equal(soon.status, 201);
          assert.equal(expired.status, 201);
          async function verify(
            units: number,
            value: string,
            waste: string,
            soonCount: number,
            flags: string[],
          ) {
            const dashboard = await call('GET', '/pharmacist/dashboard', other);
            const inventory = await call('GET', '/pharmacist/medicines', other);
            assert.equal(dashboard.status, 200);
            assert.equal(inventory.status, 200);
            const row = inventory.body.items.find(
              (m: { id: string }) => m.id === id,
            );
            assert.equal(dashboard.body.totalMedicines, 2);
            assert.equal(dashboard.body.totalUnits, units);
            assert.equal(dashboard.body.inventoryValue, value);
            assert.equal(dashboard.body.expectedWaste, waste);
            assert.equal(dashboard.body.expiringSoonBatchCount, soonCount);
            assert.equal(dashboard.body.expiredBatchCount, 1);
            assert.equal(
              dashboard.body.lowStockMedicineCount,
              flags.includes('LOW_STOCK') ? 2 : 1,
            );
            assert.equal(row.availableQuantity, units);
            assert.deepEqual(row.indicators, flags);
            const attention = dashboard.body.attentionItems.find(
              (m: { medicineId: string }) => m.medicineId === id,
            );
            if (flags.includes('HEALTHY')) assert.equal(attention, undefined);
            else assert.deepEqual(attention.indicators, flags);
          }
          await verify(10, '25.00', '12.00', 1, [
            'LOW_STOCK',
            'EXPIRED',
            'EXPIRING_SOON',
          ]);
          assert.equal(
            (
              await call(
                'PATCH',
                `/pharmacist/batches/${soon.body.id}`,
                other,
                {
                  quantity: 11,
                  expiryDate: addCalendarDays(today, 91),
                  storageLocation: 'A',
                },
              )
            ).status,
            200,
          );
          await verify(11, '27.50', '12.00', 0, ['EXPIRED']);
          assert.equal(
            (
              await call(
                'PATCH',
                `/pharmacist/batches/${expired.body.id}`,
                other,
                {
                  quantity: 0,
                  expiryDate: addCalendarDays(today, -1),
                  storageLocation: 'B',
                },
              )
            ).status,
            200,
          );
          await verify(11, '27.50', '0.00', 0, ['HEALTHY']);
          assert.equal(
            (
              await call('PATCH', `/pharmacist/medicines/${id}`, other, {
                displayName: 'Day 10 renamed',
                scientificName: 'Day 10 compound',
                category: 'Test',
                reorderThreshold: 11,
              })
            ).status,
            200,
          );
          assert.equal(
            (
              await call(
                'PATCH',
                `/pharmacist/batches/${soon.body.id}`,
                other,
                {
                  quantity: 11,
                  expiryDate: addCalendarDays(today, 30),
                  storageLocation: 'A',
                },
              )
            ).status,
            200,
          );
          await verify(11, '27.50', '0.00', 1, ['LOW_STOCK', 'EXPIRING_SOON']);
          const filtered = await call(
            'GET',
            '/pharmacist/medicines?status=EXPIRING_SOON',
            other,
          );
          assert.equal(filtered.body.total, 1);
          assert.equal(filtered.body.items[0].id, id);
        },
      );
      await t.test(
        'live profile uses current actor and subscription; immutable fields reject; saves persist',
        async () => {
          assert.equal((await call('GET', '/pharmacist/profile')).status, 401);
          assert.equal(
            (await call('GET', '/pharmacist/profile', owner)).status,
            403,
          );
          const profile = await call('GET', '/pharmacist/profile', active);
          assert.equal(profile.body.pharmacy.id, p[0]);
          const input = {
            area: 'Changed area',
            address: 'Changed street 123',
            phone: '+962 6 555 0100',
          };
          assert.equal(
            (
              await call('PATCH', '/pharmacist/profile', active, {
                ...input,
                name: 'Forbidden',
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await call('PATCH', '/pharmacist/profile', active, {
                ...input,
                phone: 'bad',
              })
            ).status,
            400,
          );
          const saved = await call(
            'PATCH',
            '/pharmacist/profile',
            active,
            input,
          );
          assert.equal(saved.status, 200);
          assert.equal(saved.body.pharmacy.name, 'Review 0');
          assert.equal(
            (await db.pharmacy.findUniqueOrThrow({ where: { id: p[0] } })).area,
            input.area,
          );
          assert.equal(
            (await call('GET', '/pharmacist/profile', inactive)).status,
            200,
          );
          assert.equal(
            (await call('PATCH', '/pharmacist/profile', inactive, input))
              .status,
            403,
          );
        },
      );
      await t.test(
        'live duty create/update/delete, overnight/adjacent/overlap validation and ownership',
        async () => {
          const input = {
            startsAt: addCalendarDays(today, 5) + 'T20:00:00+03:00',
            endsAt: addCalendarDays(today, 6) + 'T08:00:00+03:00',
          };
          const created = await call(
            'POST',
            '/pharmacist/duty-periods',
            active,
            input,
          );
          assert.equal(created.status, 201);
          const id = created.body.id;
          assert.match(created.body.startsAt, /Z$/);
          assert.equal(
            (await call('POST', '/pharmacist/duty-periods', active, input))
              .status,
            409,
          );
          assert.equal(
            (
              await call(
                'PATCH',
                '/pharmacist/duty-periods/' + id,
                other,
                input,
              )
            ).status,
            404,
          );
          assert.equal(
            (await call('DELETE', '/pharmacist/duty-periods/' + id, other))
              .status,
            404,
          );
          assert.equal(
            (
              await call(
                'PATCH',
                '/pharmacist/duty-periods/' + id,
                active,
                input,
              )
            ).status,
            200,
          );
          const adjacent = {
            startsAt: created.body.endsAt,
            endsAt: new Date(
              Date.parse(created.body.endsAt) + 3600000,
            ).toISOString(),
          };
          assert.equal(
            (await call('POST', '/pharmacist/duty-periods', active, adjacent))
              .status,
            201,
          );
          assert.equal(
            (
              await call('POST', '/pharmacist/duty-periods', active, {
                ...input,
                startsAt: today + 'T10:00',
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await call('POST', '/pharmacist/duty-periods', active, {
                ...input,
                endsAt: input.startsAt,
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await call('POST', '/pharmacist/duty-periods', active, {
                ...input,
                endsAt: addCalendarDays(today, 7) + 'T08:00:00+03:00',
              })
            ).status,
            400,
          );
          assert.equal(
            (await call('GET', '/pharmacist/duty-periods', inactive)).status,
            200,
          );
          assert.equal(
            (await call('POST', '/pharmacist/duty-periods', inactive, input))
              .status,
            403,
          );
          const inactivePeriod = await db.dutyPeriod.create({
            data: {
              pharmacyId: p[2],
              startsAt: new Date(input.startsAt),
              endsAt: new Date(input.endsAt),
            },
          });
          assert.equal(
            (
              await call(
                'PATCH',
                '/pharmacist/duty-periods/' + inactivePeriod.id,
                inactive,
                input,
              )
            ).status,
            403,
          );
          assert.equal(
            (
              await call(
                'DELETE',
                '/pharmacist/duty-periods/' + inactivePeriod.id,
                inactive,
              )
            ).status,
            403,
          );
          assert.equal(
            (await call('DELETE', '/pharmacist/duty-periods/' + id, active))
              .status,
            204,
          );
          assert.equal(await db.dutyPeriod.count({ where: { id } }), 0);
        },
      );
      await t.test(
        'database lock prevents simultaneous overlaps across independent app instances',
        async () => {
          second = await boot();
          const otherBase = (await second.getUrl()) + '/api';
          const input = {
            startsAt: addCalendarDays(today, 10) + 'T20:00:00+03:00',
            endsAt: addCalendarDays(today, 11) + 'T08:00:00+03:00',
          };
          const result = await Promise.all([
            call('POST', '/pharmacist/duty-periods', active, input),
            call('POST', '/pharmacist/duty-periods', active, input, otherBase),
          ]);
          assert.deepEqual(result.map((r) => r.status).sort(), [201, 409]);
        },
      );
    } finally {
      if (second) await second.close();
      if (app) await app.close();
      await db.batch.deleteMany({
        where: { medicine: { pharmacyId: { in: p } } },
      });
      await db.medicine.deleteMany({ where: { pharmacyId: { in: p } } });
      await db.dutyPeriod.deleteMany({ where: { pharmacyId: { in: p } } });
      await db.subscription.deleteMany({ where: { pharmacyId: { in: p } } });
      await db.account.deleteMany({ where: { id: { in: accounts } } });
      await db.pharmacy.deleteMany({ where: { id: { in: p } } });
      await db.$disconnect();
    }
  },
);
