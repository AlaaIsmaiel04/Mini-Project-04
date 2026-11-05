import assert from 'node:assert/strict';
import { join } from 'node:path';
import { before, describe, it } from 'node:test';
import { Module } from '@nestjs/common';
import { SUBSCRIPTION_STATUS } from '../pharmacy/adapters/temporary-subscription-status.adapter';
import { CLOCK } from '../pharmacy/clock';
import { DUTY_PERIOD_STORE } from '../pharmacy/stores/duty-period.store';
import { PHARMACY_STORE } from '../pharmacy/stores/pharmacy.store';
import { FixedClock } from '../pharmacy/testing/fixed-clock';
import { InMemoryDutyPeriodStore } from '../pharmacy/testing/in-memory-duty-period.store';
import { InMemoryPharmacyStore } from '../pharmacy/testing/in-memory-pharmacy.store';
import { InMemorySubscriptionStatus } from '../pharmacy/testing/in-memory-subscription-status';
import {
  assertGuideIsCurrent,
  codeBlock,
  type Exchange,
  renderExchange,
  responseJson,
  withRunningApp,
} from '../pharmacy/testing/integration-docs';
import { MedicineSearchQueryDto } from './dto/medicine-search-query.dto';
import { PublicPharmaciesQueryDto } from './dto/public-pharmacies-query.dto';
import { PublicController } from './public.controller';
import { PublicModule } from './public.module';
import { PublicService } from './public.service';
import { MEDICINE_AVAILABILITY_STORE } from './stores/medicine-availability.store';
import { InMemoryMedicineAvailabilityStore } from './testing/in-memory-medicine-availability.store';

const GUIDE = join(__dirname, 'INTEGRATION.md');
const PHARMACIES = '/api/public/pharmacies';
const MEDICINES = '/api/public/medicines';

const CENTRAL = '11111111-1111-4111-8111-111111111111';
const EASTERN = '22222222-2222-4222-8222-222222222222';
const WESTERN = '33333333-3333-4333-8333-333333333333';
const NORTHERN = '44444444-4444-4444-8444-444444444444';
const LAPSED = '55555555-5555-4555-8555-555555555555';

// 02:00 in Amman on 5 November: the time every example below was captured at.
const NOW = '2026-11-05T02:00:00+03:00';
const FRESH = '2027-06-01';

// The guide shows this code exactly as it runs in these tests.
const TIME_SNIPPET = [
  "const jordanTime = new Intl.DateTimeFormat('en-GB', {",
  "  timeZone: 'Asia/Amman',",
  "  dateStyle: 'medium',",
  "  timeStyle: 'short',",
  '});',
  '',
  'function showInJordan(utcInstant) {',
  '  return jordanTime.format(new Date(utcInstant));',
  '}',
].join('\n');

const showInJordan = new Function(
  `${TIME_SNIPPET}\nreturn showInJordan;`,
)() as (utcInstant: string) => string;

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

const pharmacy = (
  id: string,
  name: string,
  area: string,
  phone: string,
  inventoryUpdatedAt: Date | null,
) => ({
  id,
  name,
  area,
  address: `${name.split(' ')[0]} Street 12, Amman`,
  phone,
  inventoryUpdatedAt,
});

const amoxil = (pharmacyId: string, quantity: number, expiryDate = FRESH) => ({
  pharmacyId,
  displayName: 'Amoxil 500',
  scientificName: 'Amoxicillin',
  batches: [{ quantity, expiryDate }],
});

async function captureExamples() {
  // First the real temporary adapters, which is what the running API answers today.
  const answersToday = await withRunningApp(PublicModule, async (real) => ({
    directoryUnavailable: await real(503, 'GET', PHARMACIES),
    searchUnavailable: await real(503, 'GET', `${MEDICINES}?q=amox`),
  }));

  // Then the real controller, validation, service and allowlist mapper, with fixed data.
  const subscriptions = new InMemorySubscriptionStatus();
  for (const id of [CENTRAL, EASTERN, WESTERN, NORTHERN]) {
    subscriptions.set(id, 'ACTIVE');
  }
  subscriptions.set(LAPSED, 'EXPIRED');

  const periods = new InMemoryDutyPeriodStore();
  const addPeriod = (pharmacyId: string, startsAt: string, endsAt: string) =>
    periods.create(pharmacyId, {
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
    });
  const overnightStart = '2026-11-04T20:00:00+03:00';
  const overnightEnd = '2026-11-05T08:00:00+03:00';
  await addPeriod(CENTRAL, overnightStart, overnightEnd);
  await addPeriod(
    CENTRAL,
    '2026-11-06T20:00:00+03:00',
    '2026-11-07T08:00:00+03:00',
  );
  await addPeriod(EASTERN, overnightStart, overnightEnd);
  await addPeriod(
    WESTERN,
    '2026-11-05T20:00:00+03:00',
    '2026-11-06T08:00:00+03:00',
  );
  await addPeriod(LAPSED, overnightStart, overnightEnd);

  class GuideTestModule {}
  Module({
    controllers: [PublicController],
    providers: [
      PublicService,
      {
        provide: PHARMACY_STORE,
        useValue: new InMemoryPharmacyStore([
          pharmacy(
            CENTRAL,
            'Central Pharmacy',
            'Downtown',
            '+962 6 555 0100',
            new Date('2026-11-04T18:30:00+03:00'),
          ),
          pharmacy(
            EASTERN,
            'Eastern Pharmacy',
            'Harbour',
            '+962 6 555 0300',
            new Date('2026-11-03T09:15:00+03:00'),
          ),
          pharmacy(
            WESTERN,
            'Western Pharmacy',
            'Uptown',
            '+962 6 555 0400',
            new Date('2026-11-04T11:00:00+03:00'),
          ),
          pharmacy(
            NORTHERN,
            'Northern Pharmacy',
            'Northside',
            '+962 6 555 0200',
            null,
          ),
          pharmacy(
            LAPSED,
            'Lapsed Pharmacy',
            'Downtown',
            '+962 6 555 0500',
            null,
          ),
        ]),
      },
      { provide: DUTY_PERIOD_STORE, useValue: periods },
      { provide: SUBSCRIPTION_STATUS, useValue: subscriptions },
      { provide: CLOCK, useValue: new FixedClock(new Date(NOW)) },
      {
        provide: MEDICINE_AVAILABILITY_STORE,
        useValue: new InMemoryMedicineAvailabilityStore([
          amoxil(CENTRAL, 137),
          amoxil(WESTERN, 12),
          // Expired-only, zero-only and inactive stock must stay out of the results.
          amoxil(EASTERN, 9, '2026-01-01'),
          amoxil(NORTHERN, 0),
          amoxil(LAPSED, 50),
        ]),
      },
    ],
  })(GuideTestModule);

  const answers = await withRunningApp(GuideTestModule, async (api) => ({
    currentAndNext: await api(200, 'GET', `${PHARMACIES}?area=Downtown`),
    currentOnly: await api(200, 'GET', `${PHARMACIES}?area=Harbour`),
    nextOnly: await api(200, 'GET', `${PHARMACIES}?area=Uptown`),
    bothNull: await api(200, 'GET', `${PHARMACIES}?area=Northside`),
    search: await api(200, 'GET', `${MEDICINES}?q=amox`),
    searchOnDuty: await api(200, 'GET', `${MEDICINES}?q=amox&onDutyNow=true`),
    emptySearch: await api(200, 'GET', `${MEDICINES}?q=nothing-like-this`),
    emptyDirectory: await api(200, 'GET', `${PHARMACIES}?area=Nowhere`),
    qMissing: await api(400, 'GET', MEDICINES),
    qBlank: await api(400, 'GET', `${MEDICINES}?q=%20%20`),
    dutyWrongCase: await api(400, 'GET', `${PHARMACIES}?onDutyNow=TRUE`),
    dutyEmpty: await api(400, 'GET', `${PHARMACIES}?onDutyNow=`),
    unknownField: await api(400, 'GET', `${PHARMACIES}?pharmacyId=x`),
  }));

  return { ...answersToday, ...answers };
}

type Examples = Awaited<ReturnType<typeof captureExamples>>;

function renderGuide(x: Examples): string {
  const show = (...exchanges: Exchange[]) =>
    exchanges.map(renderExchange).join('\n\n');

  return `${[
    '<!-- Generated by integration-docs.spec.ts. Do not edit by hand: npm test fails if this file differs. -->',
    '# Public search and directory: integration guide',
    'For Yousef: the Public Search and Pharmacy Directory pages.',
    "**This guide cannot drift from the code.** Every request and response below was produced by the real controller, validation, service and privacy mapper, using fixed test data. `npm test` produces them again and fails if this file differs. After an intended change, run `UPDATE_INTEGRATION_DOCS=1 npm test` (in PowerShell: `$env:UPDATE_INTEGRATION_DOCS='1'; npm test; Remove-Item Env:UPDATE_INTEGRATION_DOCS`) and commit the result.",
    "**Where things stand:** the directory now uses shared Prisma pharmacy/duty stores and effective subscription status. Public medicine-stock persistence is still pending, so valid medicine searches can return 503. These fixed-fixture examples demonstrate wire shapes and do not prove the remaining public stock integration.",

    '## Basics',
    [
      '- No sign-in is needed. Both routes return `ListResponse<PublicPharmacy>` from `@smartshelf/contracts`.',
      '- `GET /api/public/pharmacies?area=&onDutyNow=` lists every pharmacy with an active subscription, even one with no stock.',
      '- `GET /api/public/medicines?q=&area=&onDutyNow=` lists the pharmacies that have the medicine available. `q` is required.',
      '- `total` counts the pharmacies after all filters. Each pharmacy appears once, and results are sorted by name.',
      '- **There are no IDs in public results**, so use something like `` `${name}|${phone}` `` as a list key.',
      '- No quantities, medicine details or other private data are ever returned, so the search page cannot show them.',
    ].join('\n'),

    '## What to show',
    [
      '| `onDutyNow` | `currentDuty` | `nextDuty` | Show |',
      '| --- | --- | --- | --- |',
      '| `true` | a period | a period or `null` | On duty now, until `currentDuty.endsAt` |',
      '| `false` | `null` | a period | Not on duty, next from `nextDuty.startsAt` |',
      '| `false` | `null` | `null` | No duty period scheduled |',
    ].join('\n'),
    'Times are in UTC, so show them in Jordan time. With the function below, `2026-11-04T17:00:00.000Z` gives the date 4 Nov 2026 and the time 20:00. The exact punctuation depends on the browser.',
    codeBlock('js', TIME_SNIPPET),
    '`inventoryUpdatedAt` is `null` until a medicine or batch has changed, so check for that before showing it as a date.',

    '## Examples',
    'All of these were captured at 02:00 in Amman on 5 November 2026.',
    '### Current duty',
    'On duty now, with another period coming later:',
    show(x.currentAndNext),
    'On duty now, with nothing scheduled after it:',
    show(x.currentOnly),
    '### Next duty only',
    'Not on duty now, with a period coming later:',
    show(x.nextOnly),
    '### Both null',
    'Nothing is scheduled. This pharmacy has also never updated its inventory:',
    show(x.bothNull),
    '### Medicine search',
    'The results have the same shape as the directory, and say nothing about the medicine itself:',
    show(x.search),
    'Filters combine. Here `onDutyNow=true` keeps only the pharmacy that is on duty now:',
    show(x.searchOnDuty),
    '### Empty result',
    'When nothing matches, the status is still 200. Show the empty state, not an error:',
    show(x.emptySearch, x.emptyDirectory),

    '## Errors',
    'Every error has `statusCode` and `message`, and `error` is the status name. `message` is a list of reasons on a 400 and a single string on a 503.',
    '### 400 Bad Request',
    '`q` is missing, or empty after surrounding spaces are removed. Do not call the API until the search box has text:',
    show(x.qMissing, x.qBlank),
    '`onDutyNow` must be exactly `true` or `false`. **Only send it when the checkbox is ticked**, because an empty value is rejected too:',
    show(x.dutyWrongCase, x.dutyEmpty),
    'An unknown query field:',
    show(x.unknownField),
    'A blank `area` is not an error. It means no area filter.',
    '### 503 Service Unavailable',
    'The data cannot be read right now, and there is never a partial list. Show an error state with a retry, not the empty state. The messages may change, so rely on the status rather than the text.',
    show(x.directoryUnavailable, x.searchUnavailable),
  ].join('\n\n')}\n`;
}

describe('public integration guide', () => {
  let examples: Examples;

  before(async () => {
    examples = await captureExamples();
  });

  it('INTEGRATION.md matches what the real API answers', () => {
    assertGuideIsCurrent(GUIDE, renderGuide(examples));
  });

  it('shows each duty case it says it shows', () => {
    const [currentAndNext] = responseJson(examples.currentAndNext).items;
    const [currentOnly] = responseJson(examples.currentOnly).items;
    const [nextOnly] = responseJson(examples.nextOnly).items;
    const [bothNull] = responseJson(examples.bothNull).items;

    assert.equal(currentAndNext.onDutyNow, true);
    assert.ok(currentAndNext.currentDuty && currentAndNext.nextDuty);
    assert.equal(currentOnly.onDutyNow, true);
    assert.ok(currentOnly.currentDuty);
    assert.equal(currentOnly.nextDuty, null);
    assert.equal(nextOnly.onDutyNow, false);
    assert.equal(nextOnly.currentDuty, null);
    assert.ok(nextOnly.nextDuty);
    assert.equal(bothNull.onDutyNow, false);
    assert.equal(bothNull.currentDuty, null);
    assert.equal(bothNull.nextDuty, null);
    assert.equal(bothNull.inventoryUpdatedAt, null);
  });

  it('keeps expired-only, zero-only and inactive stock out of the search example', () => {
    const names = responseJson(examples.search).items.map(
      (item: { name: string }) => item.name,
    );

    assert.deepEqual(names, ['Central Pharmacy', 'Western Pharmacy']);
    assert.deepEqual(
      responseJson(examples.searchOnDuty).items.map(
        (item: { name: string }) => item.name,
      ),
      ['Central Pharmacy'],
    );
  });

  it('has empty results with status 200 and exactly items and total', () => {
    for (const exchange of [examples.emptySearch, examples.emptyDirectory]) {
      assert.equal(exchange.status, 200);
      assert.deepEqual(responseJson(exchange), { items: [], total: 0 });
    }
  });

  it('has no ID or private field in any public example in the guide', () => {
    const guide = renderGuide(examples);

    for (const secret of [
      CENTRAL,
      EASTERN,
      WESTERN,
      NORTHERN,
      LAPSED,
      '"id"',
      '"pharmacyId"',
      '"quantity"',
      '"expiryDate"',
      '"displayName"',
      '"scientificName"',
      'Amoxicillin',
    ]) {
      assert.equal(guide.includes(secret), false, `leaked ${secret}`);
    }
  });

  it('the time snippet in the guide shows the promised Jordan time', () => {
    assert.match(showInJordan('2026-11-04T17:00:00.000Z'), /4 Nov 2026.*20:00/);
    assert.match(showInJordan('2026-11-05T05:00:00.000Z'), /5 Nov 2026.*08:00/);
  });
});
