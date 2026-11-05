// اختبارات بواسطة Codex — HTTP وPostgreSQL والصلاحيات والحفظ والتكامل.
import 'reflect-metadata';
import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import {
  addCalendarDays,
  businessDate,
  parseCalendarDate,
} from './common/business-date';

// npm test runs pure tests by default. Integration requires an explicit dedicated DB.
test(
  'real PostgreSQL + HTTP inventory acceptance',
  { skip: process.env.RUN_DB_TESTS !== 'true' },
  async (t) => {
    const dbName = new URL(process.env.DATABASE_URL!).pathname;
    assert.match(
      dbName,
      /^\/smartshelf_test(?:_[a-z0-9_]+)?$/,
      'Use a dedicated database named smartshelf_test...',
    );
    // Load tsc output, so Nest constructor metadata is preserved (tsx does not emit it).
    const { AppModule } = require('../dist/app.module');
    const prisma = new PrismaClient();
    let app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    const pharmacyIds = [randomUUID(), randomUUID(), randomUUID()];
    const accountIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    const today = businessDate();
    const passwordHash = await hash('DemoPass123!', 10);
    let base = '';
    async function call(
      method: string,
      path: string,
      token?: string,
      body?: unknown,
    ) {
      const response = await fetch(base + path, {
        method,
        headers: {
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      return { status: response.status, body: await response.json() };
    }
    const medicineInput = {
      displayName: 'Test Drug',
      scientificName: 'Test Scientific',
      category: 'Demo',
      reorderThreshold: 10,
    };
    const batchInput = {
      batchNumber: 'B1',
      quantity: 10,
      expiryDate: addCalendarDays(today, 30),
      storageLocation: 'A',
      unitCost: '2.50',
    };
    try {
      await prisma.pharmacy.createMany({
        data: pharmacyIds.map((id) => ({
          id,
          name: 'Test',
          area: 'Test',
          address: 'Test',
          phone: '000',
        })),
      });
      await prisma.subscription.createMany({
        data: pharmacyIds.map((pharmacyId, i) => ({
          pharmacyId,
          startDate: parseCalendarDate(addCalendarDays(today, -30)),
          endDate: parseCalendarDate(addCalendarDays(today, 30)),
          suspended: i === 2,
        })),
      });
      await prisma.account.createMany({
        data: accountIds.map((id, i) => ({
          id,
          email: `${id}@test.local`,
          passwordHash,
          role: i === 3 ? 'OWNER' : 'PHARMACIST',
          pharmacyId: i === 3 ? null : pharmacyIds[i],
        })),
      });
      await app.listen(0, '127.0.0.1');
      base = (await app.getUrl()) + '/api';
      const tokens: string[] = [];
      for (const id of accountIds) {
        const login = await call('POST', '/auth/login', undefined, {
          email: ` ${id.toUpperCase()}@TEST.LOCAL `,
          password: 'DemoPass123!',
        });
        assert.equal(login.status, 200);
        assert.deepEqual(Object.keys(login.body.user).sort(), [
          'email',
          'id',
          'pharmacyId',
          'role',
        ]);
        tokens.push(login.body.accessToken);
      }
      const [a, b, inactive, owner] = tokens;
      let medicineId = '';
      let batchId = '';
      await t.test(
        'A01 missing/wrong/expired tokens, owner denied, current account reloaded',
        async () => {
          for (const email of [
            `${accountIds[0]}@test.local`,
            'missing@test.local',
          ]) {
            const denied = await call('POST', '/auth/login', undefined, {
              email,
              password: 'WrongPass123!',
            });
            assert.equal(denied.status, 401);
            assert.equal(denied.body.message, 'Invalid email or password.');
          }
          assert.equal(
            (
              await call('POST', '/auth/login', undefined, {
                email: 'invalid',
                password: 'DemoPass123!',
              })
            ).status,
            400,
          );
          assert.equal(
            (await call('GET', '/pharmacist/medicines')).status,
            401,
          );
          assert.equal(
            (await call('GET', '/pharmacist/medicines', 'broken')).status,
            401,
          );
          assert.equal(
            (await call('POST', '/pharmacist/medicines', owner, medicineInput))
              .status,
            403,
          );
          const expired = await app.get(JwtService).signAsync(
            {
              sub: accountIds[0],
              role: 'PHARMACIST',
              pharmacyId: pharmacyIds[0],
            },
            { expiresIn: -1 },
          );
          assert.equal((await call('GET', '/auth/me', expired)).status, 401);
          const me = await call('GET', '/auth/me', a);
          assert.equal(me.body.id, accountIds[0]);
          assert.deepEqual(Object.keys(me.body).sort(), [
            'email',
            'id',
            'pharmacyId',
            'role',
          ]);
          await prisma.account.update({
            where: { id: accountIds[0] },
            data: { role: 'OWNER', pharmacyId: null },
          });
          assert.equal(
            (await call('GET', '/pharmacist/medicines', a)).status,
            403,
          );
          await prisma.account.update({
            where: { id: accountIds[0] },
            data: { role: 'PHARMACIST', pharmacyId: pharmacyIds[0] },
          });
        },
      );
      await t.test(
        'A07 create, normalized conflict, separate pharmacies and timestamp',
        async () => {
          const created = await call('POST', '/pharmacist/medicines', a, {
            ...medicineInput,
            displayName: ' Test Drug ',
          });
          assert.equal(created.status, 201);
          medicineId = created.body.id;
          assert.equal(created.body.displayName, 'Test Drug');
          const before = (
            await prisma.pharmacy.findUniqueOrThrow({
              where: { id: pharmacyIds[0] },
            })
          ).inventoryUpdatedAt;
          assert.ok(before);
          assert.equal(
            (
              await call('POST', '/pharmacist/medicines', a, {
                ...medicineInput,
                displayName: ' tEsT DRUG ',
              })
            ).status,
            409,
          );
          assert.equal(
            (
              await prisma.pharmacy.findUniqueOrThrow({
                where: { id: pharmacyIds[0] },
              })
            ).inventoryUpdatedAt!.getTime(),
            before.getTime(),
          );
          assert.equal(
            (await call('POST', '/pharmacist/medicines', b, medicineInput))
              .status,
            201,
          );
          const listB = await call('GET', '/pharmacist/medicines', b);
          assert.ok(
            !listB.body.items.some((m: { id: string }) => m.id === medicineId),
          );
        },
      );
      await t.test(
        'A02 guessed medicine/batch IDs, valid writes and immutable fields',
        async () => {
          assert.equal(
            (
              await call(
                'PATCH',
                `/pharmacist/medicines/${medicineId}`,
                b,
                medicineInput,
              )
            ).status,
            404,
          );
          assert.equal(
            (
              await call(
                'POST',
                `/pharmacist/medicines/${medicineId}/batches`,
                b,
                batchInput,
              )
            ).status,
            404,
          );
          const created = await call(
            'POST',
            `/pharmacist/medicines/${medicineId}/batches`,
            a,
            batchInput,
          );
          assert.equal(created.status, 201);
          batchId = created.body.id;
          assert.equal(created.body.unitCost, '2.50');
          const update = {
            quantity: 5,
            expiryDate: batchInput.expiryDate,
            storageLocation: 'B',
          };
          assert.equal(
            (await call('PATCH', `/pharmacist/batches/${batchId}`, b, update))
              .status,
            404,
          );
          for (const extra of [
            { unitCost: '9.00' },
            { batchNumber: 'NEW' },
            { barcode: '999' },
          ]) {
            assert.equal(
              (
                await call('PATCH', `/pharmacist/batches/${batchId}`, a, {
                  ...update,
                  ...extra,
                })
              ).status,
              400,
            );
          }
          assert.equal(
            (await call('PATCH', `/pharmacist/batches/${batchId}`, a, update))
              .status,
            200,
          );
          assert.equal(
            (
              await call('PATCH', `/pharmacist/medicines/${medicineId}`, a, {
                ...medicineInput,
                category: 'Updated',
              })
            ).status,
            200,
          );
        },
      );
      await t.test(
        'A08 invalid dates/numbers/unknown fields, expired registration and duplicate batch',
        async () => {
          const timestampBefore = (
            await prisma.pharmacy.findUniqueOrThrow({
              where: { id: pharmacyIds[0] },
            })
          ).inventoryUpdatedAt!.getTime();
          const countBefore = await prisma.batch.count({
            where: { medicineId },
          });
          for (const bad of [
            { quantity: -1 },
            { quantity: 1.5 },
            { quantity: '10' },
            { quantity: 2147483648 },
            { unitCost: '-1.00' },
            { unitCost: 2.5 },
            { unitCost: '2.505' },
            { unitCost: '10000000000.00' },
            { expiryDate: '2026-02-30' },
            { expiryDate: '2026-13-01' },
            { pharmacyId: pharmacyIds[1] },
          ]) {
            assert.equal(
              (
                await call(
                  'POST',
                  `/pharmacist/medicines/${medicineId}/batches`,
                  a,
                  { ...batchInput, batchNumber: randomUUID(), ...bad },
                )
              ).status,
              400,
            );
          }
          assert.equal(
            (
              await prisma.pharmacy.findUniqueOrThrow({
                where: { id: pharmacyIds[0] },
              })
            ).inventoryUpdatedAt!.getTime(),
            timestampBefore,
          );
          assert.equal(
            await prisma.batch.count({ where: { medicineId } }),
            countBefore,
          );
          assert.equal(
            (
              await call(
                'POST',
                `/pharmacist/medicines/${medicineId}/batches`,
                a,
                batchInput,
              )
            ).status,
            409,
          );
          assert.equal(
            (
              await call(
                'POST',
                `/pharmacist/medicines/${medicineId}/batches`,
                a,
                {
                  ...batchInput,
                  batchNumber: 'OLD',
                  expiryDate: addCalendarDays(today, -1),
                },
              )
            ).status,
            201,
          );
          for (const bad of [
            { reorderThreshold: -1 },
            { displayName: '   ' },
            { pharmacyId: pharmacyIds[1] },
          ]) {
            assert.equal(
              (
                await call('POST', '/pharmacist/medicines', a, {
                  ...medicineInput,
                  displayName: 'Invalid',
                  ...bad,
                })
              ).status,
              400,
            );
          }
          assert.equal(
            (await call('GET', '/pharmacist/medicines?status=INVALID', a))
              .status,
            400,
          );
          assert.equal(
            (await call('PATCH', '/pharmacist/batches/not-a-uuid', a, {}))
              .status,
            400,
          );
          assert.equal(
            (
              await call('PATCH', `/pharmacist/batches/${batchId}`, a, {
                quantity: 2,
              })
            ).status,
            400,
          );
        },
      );
      await t.test(
        'A05 every inventory mutation denied for suspended/expired/future/missing subscriptions; reads allowed',
        async () => {
          const suspendedMedicine = await prisma.medicine.create({
            data: {
              ...medicineInput,
              normalizedName: 'test drug',
              pharmacyId: pharmacyIds[2],
            },
          });
          const suspendedBatch = await prisma.batch.create({
            data: {
              medicineId: suspendedMedicine.id,
              ...batchInput,
              expiryDate: parseCalendarDate(batchInput.expiryDate),
            },
          });
          for (const state of ['SUSPENDED', 'EXPIRED', 'FUTURE', 'NONE']) {
            if (state === 'EXPIRED')
              await prisma.subscription.update({
                where: { pharmacyId: pharmacyIds[2] },
                data: {
                  suspended: false,
                  endDate: parseCalendarDate(addCalendarDays(today, -1)),
                },
              });
            if (state === 'FUTURE')
              await prisma.subscription.update({
                where: { pharmacyId: pharmacyIds[2] },
                data: {
                  startDate: parseCalendarDate(addCalendarDays(today, 1)),
                  endDate: parseCalendarDate(addCalendarDays(today, 10)),
                },
              });
            if (state === 'NONE')
              await prisma.subscription.delete({
                where: { pharmacyId: pharmacyIds[2] },
              });
            const read = await call('GET', '/pharmacist/medicines', inactive);
            assert.equal(read.status, 200);
            assert.equal(
              read.body.subscriptionStatus,
              state === 'FUTURE' ? 'NONE' : state,
            );
            for (const [method, path, body] of [
              ['POST', '/pharmacist/medicines', medicineInput],
              [
                'PATCH',
                `/pharmacist/medicines/${suspendedMedicine.id}`,
                medicineInput,
              ],
              [
                'POST',
                `/pharmacist/medicines/${suspendedMedicine.id}/batches`,
                batchInput,
              ],
              [
                'PATCH',
                `/pharmacist/batches/${suspendedBatch.id}`,
                {
                  quantity: 1,
                  expiryDate: batchInput.expiryDate,
                  storageLocation: 'C',
                },
              ],
            ] as const) {
              const denied = await call(method, path, inactive, body);
              assert.equal(denied.status, 403);
              assert.match(denied.body.message, /read-only/);
            }
            assert.equal(
              (
                await prisma.pharmacy.findUniqueOrThrow({
                  where: { id: pharmacyIds[2] },
                })
              ).inventoryUpdatedAt,
              null,
            );
          }
        },
      );
      await t.test(
        'A10 both name fields, multi-indicator filters and filtered count',
        async () => {
          const byDisplay = await call(
            'GET',
            '/pharmacist/medicines?q=%20TeSt%20DrUg%20',
            a,
          );
          assert.equal(byDisplay.body.total, 1);
          assert.equal(byDisplay.body.items[0].id, medicineId);
          for (const status of ['LOW_STOCK', 'EXPIRING_SOON', 'EXPIRED']) {
            const list = await call(
              'GET',
              `/pharmacist/medicines?q=SCIENTIFIC&status=${status}`,
              a,
            );
            assert.equal(list.status, 200);
            assert.equal(list.body.total, 1);
            assert.equal(list.body.items[0].id, medicineId);
          }
          assert.equal(
            (await call('GET', '/pharmacist/medicines?status=HEALTHY', a)).body
              .total,
            0,
          );
          assert.equal(
            (await call('GET', '/pharmacist/medicines?q=no-match', a)).body
              .total,
            0,
          );
        },
      );
      await t.test(
        'A12 every HTTP mutation rolls back if the timestamp write fails; another connection sees committed data',
        async () => {
          const before = await prisma.pharmacy.findUniqueOrThrow({
            where: { id: pharmacyIds[0] },
          });
          const snapshot = await prisma.medicine.findMany({
            where: { pharmacyId: pharmacyIds[0] },
            include: { batches: true },
          });
          // Test-only PostgreSQL fault after the business write, on this fixture pharmacy only.
          const trigger = `test_timestamp_${randomUUID().replaceAll('-', '')}`;
          await prisma.$executeRawUnsafe(
            `CREATE FUNCTION "${trigger}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Intentional test timestamp failure'; END $$`,
          );
          try {
            await prisma.$executeRawUnsafe(
              `CREATE TRIGGER "${trigger}" BEFORE UPDATE OF "inventoryUpdatedAt" ON "Pharmacy" FOR EACH ROW WHEN (NEW.id = '${pharmacyIds[0]}'::uuid) EXECUTE FUNCTION "${trigger}"()`,
            );
            for (const [method, path, body] of [
              [
                'POST',
                '/pharmacist/medicines',
                { ...medicineInput, displayName: 'Rollback only' },
              ],
              [
                'PATCH',
                `/pharmacist/medicines/${medicineId}`,
                { ...medicineInput, category: 'Rollback only' },
              ],
              [
                'POST',
                `/pharmacist/medicines/${medicineId}/batches`,
                { ...batchInput, batchNumber: 'ROLLBACK' },
              ],
              [
                'PATCH',
                `/pharmacist/batches/${batchId}`,
                {
                  quantity: 999,
                  expiryDate: batchInput.expiryDate,
                  storageLocation: 'Rollback only',
                },
              ],
            ] as const) {
              assert.equal((await call(method, path, a, body)).status, 500);
              assert.deepEqual(
                await prisma.medicine.findMany({
                  where: { pharmacyId: pharmacyIds[0] },
                  include: { batches: true },
                }),
                snapshot,
              );
            }
          } finally {
            await prisma.$executeRawUnsafe(
              `DROP TRIGGER IF EXISTS "${trigger}" ON "Pharmacy"`,
            );
            await prisma.$executeRawUnsafe(
              `DROP FUNCTION IF EXISTS "${trigger}"()`,
            );
          }
          assert.equal(
            (await prisma.batch.findUniqueOrThrow({ where: { id: batchId } }))
              .quantity,
            5,
          );
          assert.equal(
            (
              await prisma.pharmacy.findUniqueOrThrow({
                where: { id: pharmacyIds[0] },
              })
            ).inventoryUpdatedAt!.getTime(),
            before.inventoryUpdatedAt!.getTime(),
          );
          const secondClient = new PrismaClient();
          try {
            assert.equal(
              (
                await secondClient.batch.findUniqueOrThrow({
                  where: { id: batchId },
                })
              ).quantity,
              5,
            );
          } finally {
            await secondClient.$disconnect();
          }
        },
      );
      await t.test(
        'A17 HTTP data survives a full Nest application restart',
        async () => {
          await app.close();
          app = await NestFactory.create(AppModule, { logger: false });
          app.setGlobalPrefix('api');
          app.useGlobalPipes(
            new ValidationPipe({
              whitelist: true,
              forbidNonWhitelisted: true,
              transform: true,
            }),
          );
          await app.listen(0, '127.0.0.1');
          base = (await app.getUrl()) + '/api';
          const result = await call('GET', '/pharmacist/medicines', a);
          assert.equal(result.status, 200);
          const saved = result.body.items.find(
            (item: { id: string }) => item.id === medicineId,
          );
          assert.equal(
            saved.batches.find((item: { id: string }) => item.id === batchId)
              .quantity,
            5,
          );
          assert.equal(saved.category, 'Updated');
        },
      );
      await t.test(
        'Alaa real request client: login, me, list, create and edit medicine/batch',
        async () => {
          const { createInventoryService } =
            await import('../../web/src/features/inventory/inventory-api');
          const { createApiClient } = await import('../../web/src/lib/api');
          const realFetch = globalThis.fetch;
          // Resolve the browser-relative /api URL to the real ephemeral HTTP server.
          const mocked = t.mock.method(
            globalThis,
            'fetch',
            (input: string | URL | Request, init?: RequestInit) => {
              return realFetch(
                typeof input === 'string' && input.startsWith('/api/')
                  ? base + input.slice(4)
                  : input,
                init,
              );
            },
          );
          try {
            const login = await createApiClient()<{ accessToken: string }>(
              '/auth/login',
              {
                method: 'POST',
                body: JSON.stringify({
                  email: `${accountIds[0]}@test.local`,
                  password: 'DemoPass123!',
                }),
              },
            );
            const user = await createApiClient(login.accessToken)<{
              id: string;
            }>('/auth/me');
            assert.equal(user.id, accountIds[0]);
            let unauthorized = false;
            const client = createInventoryService(login.accessToken, () => {
              unauthorized = true;
            });
            const created = await client.createMedicine({
              ...medicineInput,
              displayName: 'Frontend client',
            });
            const updated = await client.updateMedicine(created.id, {
              ...medicineInput,
              displayName: 'Frontend client',
              category: 'Client edit',
            });
            assert.equal(updated.category, 'Client edit');
            const batch = await client.createBatch(created.id, batchInput);
            const edited = await client.updateBatch(batch.id, {
              quantity: 4,
              expiryDate: batchInput.expiryDate,
              storageLocation: 'Client shelf',
            });
            assert.equal(edited.quantity, 4);
            assert.equal(edited.unitCost, '2.50');
            const list = await client.list({
              q: 'Frontend',
              status: 'LOW_STOCK',
            });
            assert.equal(list.total, 1);
            assert.equal(list.items[0].id, created.id);
            assert.equal(unauthorized, false);
            await assert.rejects(
              createInventoryService('invalid-token', () => {
                unauthorized = true;
              }).list({}),
            );
            assert.equal(unauthorized, true);
          } finally {
            mocked.mock.restore();
          }
        },
      );
    } finally {
      await app.close();
      await prisma.$transaction(async (tx) => {
        await tx.batch.deleteMany({
          where: { medicine: { pharmacyId: { in: pharmacyIds } } },
        });
        await tx.medicine.deleteMany({
          where: { pharmacyId: { in: pharmacyIds } },
        });
        await tx.subscription.deleteMany({
          where: { pharmacyId: { in: pharmacyIds } },
        });
        await tx.account.deleteMany({ where: { id: { in: accountIds } } });
        await tx.pharmacy.deleteMany({ where: { id: { in: pharmacyIds } } });
      });
      await prisma.$disconnect();
    }
  },
);
