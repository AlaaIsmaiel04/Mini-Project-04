import assert from 'node:assert/strict';
import { join } from 'node:path';
import { before, describe, it, mock } from 'node:test';
import { type ExecutionContext, Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { businessDate } from '../../common/business-date';
import { JwtAuthGuard } from '../../common/security';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPharmacistGuard } from './adapters/jwt-pharmacist.guard';
import {
  PrismaDutyPeriodStore,
  PrismaPharmacyStore,
  PrismaSubscriptionStatus,
} from './adapters/prisma-stores';
import { NOT_A_PHARMACIST, NOT_SIGNED_IN, SERVER_ERROR } from './api-errors';
import { SUBSCRIPTION_STATUS } from './adapters/subscription-status-reader';
import { DutyInputDto } from './dto/duty-input.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { DutyPeriodController } from './duty-period.controller';
import { DutyPeriodService } from './duty-period.service';
import { PharmacyLock } from './pharmacy-lock';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { DUTY_PERIOD_STORE } from './stores/duty-period.store';
import { PHARMACY_STORE } from './stores/pharmacy.store';
import { InMemoryDutyPeriodStore } from './testing/in-memory-duty-period.store';
import { InMemoryPharmacyStore } from './testing/in-memory-pharmacy.store';
import { InMemorySubscriptionStatus } from './testing/in-memory-subscription-status';
import {
  assertGuideIsCurrent,
  codeBlock,
  type Exchange,
  renderExchange,
  responseJson,
  withRunningApp,
} from './testing/integration-docs';

const GUIDE = join(__dirname, 'INTEGRATION.md');
const PROFILE = '/api/pharmacist/profile';
const DUTY = '/api/pharmacist/duty-periods';

const CENTRAL = '11111111-1111-4111-8111-111111111111';
const NORTHERN = '22222222-2222-4222-8222-222222222222';
const OTHER = '55555555-5555-4555-8555-555555555555';
const NO_SUCH_PHARMACY = '99999999-9999-4999-8999-999999999999';
const NO_SUCH_PERIOD = '88888888-8888-4888-8888-888888888888';
const USER = '33333333-3333-4333-8333-333333333333';

const pharmacist = (pharmacyId: string) => ({
  userId: USER,
  role: 'PHARMACIST',
  pharmacyId,
});

const VALID_PROFILE = {
  area: 'Abdoun',
  address: '77 Garden Street, Amman',
  phone: '+962 6 555 0199',
};

// The guide shows this code exactly as it runs in these tests.
const DATETIME_SNIPPET = [
  '// Jordan is on UTC+3 all year. The test that generates this guide checks that still holds.',
  "const JORDAN_OFFSET = '+03:00';",
  'const THREE_HOURS = 3 * 60 * 60 * 1000;',
  '',
  '// <input type="datetime-local"> to the API: "2026-11-04T20:00" becomes "2026-11-04T20:00+03:00"',
  'function toApiInstant(inputValue) {',
  '  return `${inputValue}${JORDAN_OFFSET}`;',
  '}',
  '',
  '// The API to <input type="datetime-local">: "2026-11-04T17:00:00.000Z" becomes "2026-11-04T20:00"',
  'function toInputValue(utcInstant) {',
  '  return new Date(new Date(utcInstant).getTime() + THREE_HOURS)',
  '    .toISOString()',
  '    .slice(0, 16);',
  '}',
].join('\n');

const { toApiInstant, toInputValue } = new Function(
  `${DATETIME_SNIPPET}\nreturn { toApiInstant, toInputValue };`,
)() as {
  toApiInstant: (inputValue: string) => string;
  toInputValue: (utcInstant: string) => string;
};

// tsx does not emit decorator metadata, so add the parameter types tsc emits for
// the running API. ValidationPipe needs them to know which DTO to validate against,
// and Nest needs them to build JwtAuthGuard, which has no explicit @Inject.
Reflect.defineMetadata(
  'design:paramtypes',
  [JwtService, PrismaService],
  JwtAuthGuard,
);
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

// The real JWT guard and Prisma stores, as in the running API. Only the database client is
// replaced, so these answers cannot differ from what the API really says.
async function captureLiveAnswers() {
  const jwt = new JwtService({ secret: 'guide-examples-only' });
  let databaseIsUp = true;

  class LiveAnswersModule {}
  Module({
    controllers: [ProfileController, DutyPeriodController],
    providers: [
      ProfileService,
      DutyPeriodService,
      PharmacyLock,
      JwtAuthGuard,
      { provide: JwtService, useValue: jwt },
      {
        provide: PrismaService,
        useValue: {
          account: {
            findUnique: async () => {
              if (!databaseIsUp) throw new Error("Can't reach database server");
              return { id: USER, role: 'OWNER', pharmacyId: null };
            },
          },
        },
      },
      { provide: PHARMACY_STORE, useClass: PrismaPharmacyStore },
      { provide: DUTY_PERIOD_STORE, useClass: PrismaDutyPeriodStore },
      { provide: SUBSCRIPTION_STATUS, useClass: PrismaSubscriptionStatus },
    ],
  })(LiveAnswersModule);

  const ownerToken = jwt.sign({ sub: USER, role: 'OWNER', pharmacyId: null });
  const signedInAsOwner = `Bearer ${ownerToken}`;

  return withRunningApp(LiveAnswersModule, async (api) => {
    const noToken = await api(401, 'GET', PROFILE, undefined, null);
    const badToken = await api(401, 'GET', PROFILE);
    const owner = await api(403, 'GET', PROFILE, undefined, signedInAsOwner);
    databaseIsUp = false;
    const databaseDown = await api(
      500,
      'GET',
      PROFILE,
      undefined,
      signedInAsOwner,
    );

    return { noToken, badToken, owner, databaseDown };
  });
}

async function captureExamples() {
  const liveAnswers = await captureLiveAnswers();

  // Test only: from here on this stands in for sign-in, so the rules behind the guard can run.
  let signedIn: object = pharmacist(CENTRAL);
  const signIn = (actor: object) => {
    signedIn = actor;
  };
  mock.method(JwtPharmacistGuard.prototype, 'canActivate', ((
    context: ExecutionContext,
  ) => {
    context.switchToHttp().getRequest().actor = signedIn;
    return true;
  }) as never);

  // Then the real controllers, validation and services, with fixed test data.
  const subscriptions = new InMemorySubscriptionStatus();
  subscriptions.set(CENTRAL, 'ACTIVE');
  subscriptions.set(OTHER, 'ACTIVE');
  subscriptions.set(NO_SUCH_PHARMACY, 'ACTIVE');
  let nextId = 1;

  class GuideTestModule {}
  Module({
    controllers: [ProfileController, DutyPeriodController],
    providers: [
      ProfileService,
      DutyPeriodService,
      PharmacyLock,
      {
        provide: PHARMACY_STORE,
        useValue: new InMemoryPharmacyStore([
          {
            id: CENTRAL,
            name: 'Central Pharmacy',
            area: 'Downtown',
            address: '12 Main Street, Amman',
            phone: '+962 6 555 0100',
            inventoryUpdatedAt: new Date('2026-11-04T18:30:00+03:00'),
          },
          {
            id: NORTHERN,
            name: 'Northern Pharmacy',
            area: 'Uptown',
            address: '40 North Road, Amman',
            phone: '+962 6 555 0200',
            inventoryUpdatedAt: null,
          },
        ]),
      },
      {
        provide: DUTY_PERIOD_STORE,
        useValue: new InMemoryDutyPeriodStore(
          undefined,
          () => `44444444-4444-4444-8444-44444444444${nextId++}`,
        ),
      },
      { provide: SUBSCRIPTION_STATUS, useValue: subscriptions },
    ],
  })(GuideTestModule);

  const answers = await withRunningApp(GuideTestModule, async (api) => {
    // Profile, signed in to an active pharmacy.
    const profile = await api(200, 'GET', PROFILE);
    const profileSaved = await api(200, 'PATCH', PROFILE, {
      area: '  Abdoun ',
      address: VALID_PROFILE.address,
      phone: VALID_PROFILE.phone,
    });
    const profilePartial = await api(400, 'PATCH', PROFILE, {
      phone: VALID_PROFILE.phone,
    });
    const profileUnknownField = await api(400, 'PATCH', PROFILE, {
      ...VALID_PROFILE,
      name: 'A new name',
    });
    const profileInvalid = await api(400, 'PATCH', PROFILE, {
      area: 'A',
      address: 'Road',
      phone: 'call me',
    });

    // Duty periods, signed in to an active pharmacy.
    const noPeriods = await api(200, 'GET', DUTY);
    const overnightInput = {
      startsAt: '2026-11-04T20:00',
      endsAt: '2026-11-05T08:00',
    };
    const overnight = {
      startsAt: toApiInstant(overnightInput.startsAt),
      endsAt: toApiInstant(overnightInput.endsAt),
    };
    const created = await api(201, 'POST', DUTY, overnight);
    const nextNight = {
      startsAt: toApiInstant('2026-11-06T20:00'),
      endsAt: toApiInstant('2026-11-07T08:00'),
    };
    const createdNext = await api(201, 'POST', DUTY, nextNight);
    const periods = await api(200, 'GET', DUTY);
    const createdId = responseJson(created).id;
    const createdNextId = responseJson(createdNext).id;
    const edited = await api(200, 'PATCH', `${DUTY}/${createdNextId}`, {
      startsAt: toApiInstant('2026-11-06T21:00'),
      endsAt: toApiInstant('2026-11-07T09:00'),
    });
    const editPartial = await api(400, 'PATCH', `${DUTY}/${createdNextId}`, {
      endsAt: toApiInstant('2026-11-07T09:00'),
    });
    const noOffset = await api(400, 'POST', DUTY, overnightInput);
    const emptyInput = await api(400, 'POST', DUTY, {
      startsAt: toApiInstant(''),
      endsAt: toApiInstant(overnightInput.endsAt),
    });
    const sameDayOvernight = await api(400, 'POST', DUTY, {
      startsAt: toApiInstant('2026-11-10T20:00'),
      endsAt: toApiInstant('2026-11-10T08:00'),
    });
    const tooLong = await api(400, 'POST', DUTY, {
      startsAt: toApiInstant('2026-11-10T20:00'),
      endsAt: toApiInstant('2026-11-11T20:01'),
    });
    const pharmacyIdInBody = await api(400, 'POST', DUTY, {
      ...nextNight,
      pharmacyId: NORTHERN,
    });
    const badId = await api(400, 'DELETE', `${DUTY}/not-a-uuid`);
    const overlap = await api(409, 'POST', DUTY, {
      startsAt: toApiInstant('2026-11-05T02:00'),
      endsAt: toApiInstant('2026-11-05T10:00'),
    });
    const adjacent = await api(201, 'POST', DUTY, {
      startsAt: overnight.endsAt,
      endsAt: toApiInstant('2026-11-05T10:00'),
    });
    const deleted = await api(
      204,
      'DELETE',
      `${DUTY}/${responseJson(adjacent).id}`,
    );
    const periodMissing = await api(404, 'DELETE', `${DUTY}/${NO_SUCH_PERIOD}`);

    // Another pharmacy guessing an ID of Central.
    signIn(pharmacist(OTHER));
    const periodOfAnotherPharmacy = await api(
      404,
      'PATCH',
      `${DUTY}/${createdId}`,
      overnight,
    );

    // A signed-in pharmacy that no longer exists.
    signIn(pharmacist(NO_SUCH_PHARMACY));
    const profileMissing = await api(404, 'GET', PROFILE);

    // A pharmacy that is not active can read, but not change anything.
    signIn(pharmacist(NORTHERN));
    subscriptions.set(NORTHERN, 'EXPIRED');
    const expiredRead = await api(200, 'GET', PROFILE);
    const expiredProfile = await api(403, 'PATCH', PROFILE, VALID_PROFILE);
    const expiredDuty = await api(403, 'POST', DUTY, overnight);
    subscriptions.set(NORTHERN, 'SUSPENDED');
    const suspended = await api(403, 'PATCH', PROFILE, VALID_PROFILE);
    subscriptions.set(NORTHERN, 'NONE');
    const noSubscription = await api(403, 'PATCH', PROFILE, VALID_PROFILE);

    return {
      profile,
      profileSaved,
      profilePartial,
      profileUnknownField,
      profileInvalid,
      noPeriods,
      overnightInput,
      created,
      createdNext,
      periods,
      edited,
      editPartial,
      noOffset,
      emptyInput,
      sameDayOvernight,
      tooLong,
      pharmacyIdInBody,
      badId,
      overlap,
      adjacent,
      deleted,
      periodMissing,
      periodOfAnotherPharmacy,
      profileMissing,
      expiredRead,
      expiredProfile,
      expiredDuty,
      suspended,
      noSubscription,
    };
  });
  mock.restoreAll();

  return { ...liveAnswers, ...answers };
}

type Examples = Awaited<ReturnType<typeof captureExamples>>;

// The documented limits, which api-docs.spec.ts proves are the real validator limits.
function profileRuleRows(): string[] {
  return ['area', 'address', 'phone'].map((field) => {
    const { minLength, maxLength, description } = Reflect.getMetadata(
      'swagger/apiModelProperties',
      UpdateProfileDto.prototype,
      field,
    );
    return `| \`${field}\` | ${minLength} to ${maxLength} characters | ${description} |`;
  });
}

function renderGuide(x: Examples): string {
  const show = (...exchanges: Exchange[]) =>
    exchanges.map(renderExchange).join('\n\n');
  const createdPeriod = responseJson(x.created);

  return `${[
    '<!-- Generated by integration-docs.spec.ts. Do not edit by hand: npm test fails if this file differs. -->',
    '# Pharmacist profile and duty periods: integration guide',
    'For Mohammad: the Pharmacy Profile & Duty page.',
    "**This guide cannot drift from the code.** Every request and response below was produced by the real controllers, validation, services and response mappers, using fixed test data. `npm test` produces them again and fails if this file differs. After an intended change, run `UPDATE_INTEGRATION_DOCS=1 npm test` (in PowerShell: `$env:UPDATE_INTEGRATION_DOCS='1'; npm test; Remove-Item Env:UPDATE_INTEGRATION_DOCS`) and commit the result.",
    '**Where things stand:** the full application uses shared JWT authentication and Prisma stores for profile and duty requests. The 401, owner 403 and 500 examples come from the real JWT guard and Prisma stores; the others use fixed test data to show the wire shapes. PostgreSQL persistence, inactive reads and write restrictions, and duty locking across API instances are proven in `dashboard-pharmacy.integration.spec.ts`. Decide from `statusCode`, not the message text.',

    '## Basics',
    [
      '- All paths start with `/api`. Send `Authorization: Bearer <accessToken>` on every request.',
      '- The pharmacy always comes from the token, so never send a `pharmacyId`.',
      '- Types are exported by `@smartshelf/contracts`: `ProfileResponse`, `UpdateProfileInput`, `DutyPeriod`, `DutyInput`, `ListResponse<DutyPeriod>` and `ApiError`.',
      '- Times in responses are always in UTC, with a `Z`.',
      '- **`PATCH` needs all fields on both routes.** It replaces the values, so it is not a partial update.',
    ].join('\n'),

    '## Profile',
    '### Read the profile',
    show(x.profile),
    '`subscriptionStatus` is `ACTIVE`, `EXPIRED`, `SUSPENDED` or `NONE`. A pharmacy that is not `ACTIVE` can still read, so show the status and make the form read-only. `inventoryUpdatedAt` is `null` until a medicine or batch has changed:',
    show(x.expiredRead),
    '### Update the profile',
    '**Send `area`, `address` and `phone` every time, even if only one changed.** `name` is set by the owner and cannot be changed here. Surrounding spaces are removed before saving.',
    [
      '| Field | Length | Rule |',
      '| --- | --- | --- |',
      ...profileRuleRows(),
    ].join('\n'),
    show(x.profileSaved),
    'Sending only the changed field is rejected:',
    show(x.profilePartial),

    '## Duty periods',
    'A period includes its start instant but not its end instant, and can last at most 24 hours. A new period may start exactly when another one ends.',
    '### List',
    'Ordered by start. Inactive pharmacies can still read this list.',
    show(x.periods),
    'With no periods yet, the list is empty and the status is still 200:',
    show(x.noPeriods),
    '### Create',
    show(x.created),
    '### Edit',
    '**Send both `startsAt` and `endsAt` every time, even if only one changed.**',
    show(x.edited),
    'Sending only the changed time is rejected:',
    show(x.editPartial),
    '### Delete',
    show(x.deleted),
    'There is no JSON to read here, so do not call `response.json()` on a 204.',

    '## Sending `datetime-local` values',
    '`<input type="datetime-local">` gives a time with no offset, such as `2026-11-04T20:00`. The API rejects that, because it cannot tell which moment you mean:',
    show(x.noOffset),
    'Add the Jordan offset before sending, and take it off again to fill the input when editing:',
    codeBlock('js', DATETIME_SNIPPET),
    'This is what the two times of an overnight period look like at each step:',
    [
      '| Input value | Send to the API | API returns |',
      '| --- | --- | --- |',
      `| \`${x.overnightInput.startsAt}\` | \`${toApiInstant(x.overnightInput.startsAt)}\` | \`${createdPeriod.startsAt}\` |`,
      `| \`${x.overnightInput.endsAt}\` | \`${toApiInstant(x.overnightInput.endsAt)}\` | \`${createdPeriod.endsAt}\` |`,
    ].join('\n'),
    [
      '- Prefer this to `new Date(value).toISOString()`, which uses the time zone of the device. A laptop set to another zone would then save the wrong time.',
      '- Check that the input is not empty first. An empty value becomes `+03:00`, and the API rejects it with a 400.',
      '- An overnight period needs the next day on its end. 20:00 to 08:00 on the same date ends before it starts, so it gets the 400 shown under Errors.',
    ].join('\n'),

    '## Errors',
    'Every error has `statusCode` and `message`, and `error` is the status name, except on a 500, which has no `error`. `message` can be **one string or a list of strings**, so handle both:',
    codeBlock(
      'js',
      'const reasons = Array.isArray(error.message) ? error.message : [error.message];',
    ),
    'Decide what to do from `statusCode`, and show `message` to the user:',
    [
      '| Status | Meaning | What the page should do |',
      '| --- | --- | --- |',
      '| 400 | The input was rejected and nothing was saved | Show every reason beside the form |',
      '| 401 | Not signed in | Show the sign-in prompt |',
      '| 403 | Not a pharmacist, or the subscription is not `ACTIVE` | Show the reason and keep the page read-only |',
      '| 404 | The record is not in your pharmacy | Show the message and reload the list |',
      '| 409 | The times overlap another period | Show the message and keep what the user typed |',
      '| 500 | The database is down or something else failed, and nothing was saved | Show an error state with a retry |',
    ].join('\n'),
    '### 400 Bad Request',
    'A missing or invalid profile field gives a list of reasons:',
    show(x.profileInvalid),
    'So does an unknown field, such as `name` on the profile or `pharmacyId` on a duty period:',
    show(x.profileUnknownField, x.pharmacyIdInBody),
    'A period that ends before it starts gives one string. This is the overnight mistake, with the same date on both times:',
    show(x.sameDayOvernight),
    'A period longer than 24 hours also gives one string:',
    show(x.tooLong),
    'An ID that is not a UUID:',
    show(x.badId),
    '### 401 Unauthorized',
    'No token, and then a token that is invalid or expired:',
    show(x.noToken, x.badToken),
    '### 403 Forbidden',
    'The subscription is not `ACTIVE`, with a different reason for each status. Profile and duty changes give the same answer. In order: `EXPIRED` on the profile and on a duty period, then `SUSPENDED`, then `NONE`:',
    show(x.expiredProfile, x.expiredDuty, x.suspended, x.noSubscription),
    'The signed-in account is not a pharmacist:',
    show(x.owner),
    '### 404 Not Found',
    'A period that does not exist, and one that belongs to another pharmacy, get the same answer, so a guessed ID reveals nothing. Both are logged on the server, because the API cannot tell them apart.',
    show(x.periodMissing, x.periodOfAnotherPharmacy),
    'The pharmacy of the signed-in account no longer exists:',
    show(x.profileMissing),
    '### 409 Conflict',
    'The times overlap another period of this pharmacy, here by six hours of an overnight period:',
    show(x.overlap),
    'Periods of other pharmacies never conflict. A period that starts exactly when another one ends is also allowed:',
    show(x.adjacent),
    '### 500 Internal Server Error',
    'The database is down or something else failed on the server. Nothing was changed, and the answer never includes any detail:',
    show(x.databaseDown),
  ].join('\n\n')}\n`;
}

describe('pharmacist integration guide', () => {
  let examples: Examples;

  before(async () => {
    examples = await captureExamples();
  });

  it('INTEGRATION.md matches what the real API answers', () => {
    assertGuideIsCurrent(GUIDE, renderGuide(examples));
  });

  it('covers every error status with the shared error shape', () => {
    const errors = [
      [400, examples.profileInvalid],
      [400, examples.sameDayOvernight],
      [401, examples.noToken],
      [401, examples.badToken],
      [403, examples.expiredProfile],
      [403, examples.owner],
      [404, examples.periodMissing],
      [404, examples.profileMissing],
      [409, examples.overlap],
    ] as const;

    for (const [status, exchange] of errors) {
      const body = responseJson(exchange);

      assert.equal(body.statusCode, status);
      assert.ok(body.message);
      assert.ok(body.error);
    }
  });

  it('a database failure is a 500 that reveals nothing', () => {
    assert.deepEqual(responseJson(examples.databaseDown), {
      statusCode: 500,
      message: 'Internal server error',
    });
  });

  it('the Swagger examples are the live messages', () => {
    assert.equal(responseJson(examples.noToken).message, NOT_SIGNED_IN.message);
    assert.equal(
      responseJson(examples.owner).message,
      NOT_A_PHARMACIST.message,
    );
    assert.equal(
      responseJson(examples.databaseDown).message,
      SERVER_ERROR.message,
    );
  });

  it('an empty input value gets the promised 400', () => {
    assert.deepEqual(responseJson(examples.emptyInput).message, [
      'startsAt must be an ISO 8601 date-time with an offset or Z',
    ]);
  });

  it('a guessed ID gets the same answer as a missing one', () => {
    assert.deepEqual(
      responseJson(examples.periodOfAnotherPharmacy),
      responseJson(examples.periodMissing),
    );
  });

  describe('the datetime-local snippet in the guide', () => {
    it('produces times the real API accepts, and a round trip gives the input back', () => {
      const period = responseJson(examples.created);

      assert.equal(period.startsAt, '2026-11-04T17:00:00.000Z');
      assert.equal(period.endsAt, '2026-11-05T05:00:00.000Z');
      assert.equal(
        toInputValue(period.startsAt),
        examples.overnightInput.startsAt,
      );
      assert.equal(toInputValue(period.endsAt), examples.overnightInput.endsAt);
    });

    // If Jordan changes its clocks, tzdata changes and this fails, so the guide gets fixed.
    for (const date of [
      '2026-01-15',
      '2026-04-15',
      '2026-07-15',
      '2026-10-30',
    ]) {
      it(`+03:00 is really the Jordan offset on ${date}`, () => {
        const firstMinute = new Date(toApiInstant(`${date}T00:00`));
        const lastMinute = new Date(toApiInstant(`${date}T23:59`));
        const minuteBefore = new Date(firstMinute.getTime() - 60_000);

        assert.equal(businessDate(firstMinute), date);
        assert.equal(businessDate(lastMinute), date);
        assert.notEqual(businessDate(minuteBefore), date);
      });
    }
  });
});
