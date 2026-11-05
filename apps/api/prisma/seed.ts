import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';
import {
  addCalendarDays,
  businessDate,
  parseCalendarDate,
} from '../src/common/business-date';

const prisma = new PrismaClient();
const id = (group: number, n: number) =>
  `${String(group).padStart(8, '0')}-0000-4000-8000-${String(n).padStart(12, '0')}`;

async function main() {
  if (process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error(
      'Use only a dedicated demo database; set ALLOW_DEMO_SEED=true explicitly.',
    );
  }
  const today = businessDate();
  const passwordHash = await hash('DemoPass123!', 10);
  // upsert(update: {}) makes re-runs preserve existing demo data and user edits.
  // Calendar-relative examples are fresh on the FIRST run; use a new demo DB for a fresh date set.
  await prisma.$transaction(
    async (tx) => {
      await tx.account.upsert({
        where: { email: 'owner@smartshelf.test' },
        update: {},
        create: {
          id: id(1, 1),
          email: 'owner@smartshelf.test',
          passwordHash,
          role: 'OWNER',
        },
      });
      const labels = ['active', 'expired', 'suspended', 'none'];
      for (let p = 1; p <= 4; p++) {
        const pharmacyId = id(2, p);
        await tx.pharmacy.upsert({
          where: { id: pharmacyId },
          update: {},
          create: {
            id: pharmacyId,
            name: `Demo Pharmacy ${p}`,
            area: p <= 2 ? 'North' : 'South',
            address: `Demo Street ${p}`,
            phone: `090000000${p}`,
            inventoryUpdatedAt: new Date(),
          },
        });
        await tx.account.upsert({
          where: { email: `${labels[p - 1]}@smartshelf.test` },
          update: {},
          create: {
            id: id(1, p + 1),
            email: `${labels[p - 1]}@smartshelf.test`,
            passwordHash,
            role: 'PHARMACIST',
            pharmacyId,
          },
        });
        if (p !== 4)
          await tx.subscription.upsert({
            where: { pharmacyId },
            update: {},
            create: {
              id: id(3, p),
              pharmacyId,
              suspended: p === 3,
              startDate: parseCalendarDate(addCalendarDays(today, -30)),
              endDate: parseCalendarDate(
                addCalendarDays(today, p === 2 ? -1 : 365),
              ),
            },
          });
        for (let m = 1; m <= 4; m++) {
          const n = (p - 1) * 4 + m;
          const medicineId = id(4, n);
          const displayName = [
            'Panadol',
            'Amoxicillin',
            'Vitamin C',
            'Ibuprofen',
          ][m - 1];
          await tx.medicine.upsert({
            where: { id: medicineId },
            update: {},
            create: {
              id: medicineId,
              pharmacyId,
              displayName,
              normalizedName: displayName.toLowerCase(),
              scientificName: m === 1 ? 'Paracetamol' : displayName,
              category: 'Demo',
              reorderThreshold: 10,
            },
          });
          const examples =
            m === 1
              ? [
                  { days: 200, quantity: 30 },
                  { days: -1, quantity: 3 },
                ]
              : m === 2
                ? [{ days: 30, quantity: 8 }]
                : m === 3
                  ? [{ days: 200, quantity: 30 }]
                  : [
                      { days: -1, quantity: 4 },
                      { days: 30, quantity: 0 },
                    ];
          for (let b = 0; b < examples.length; b++) {
            const example = examples[b];
            await tx.batch.upsert({
              where: { id: id(5, n * 10 + b) },
              update: {},
              create: {
                id: id(5, n * 10 + b),
                medicineId,
                batchNumber: `B-${b + 1}`,
                quantity: example.quantity,
                expiryDate: parseCalendarDate(
                  addCalendarDays(today, example.days),
                ),
                storageLocation: `Shelf ${m}`,
                unitCost: new Prisma.Decimal(b === 0 ? '2.50' : '4.00'),
                barcode: null,
              },
            });
          }
        }
      }
      // Anchor overnight demo in the agreed business zone (+03:00 for Asia/Amman).
      await tx.dutyPeriod.upsert({
        where: { id: id(6, 1) },
        update: {},
        create: {
          id: id(6, 1),
          pharmacyId: id(2, 1),
          startsAt: new Date(`${today}T20:00:00+03:00`),
          endsAt: new Date(`${addCalendarDays(today, 1)}T08:00:00+03:00`),
        },
      });
    },
    { timeout: 30000 },
  );
  console.log(
    'Demo seed ready: owner/active/expired/suspended/none@smartshelf.test; password DemoPass123!',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
