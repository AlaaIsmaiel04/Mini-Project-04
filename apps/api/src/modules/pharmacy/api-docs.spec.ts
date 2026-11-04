import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import {
  BadRequestException,
  HttpException,
  Module,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { MedicineSearchQueryDto } from '../public/dto/medicine-search-query.dto';
import { PublicPharmaciesQueryDto } from '../public/dto/public-pharmacies-query.dto';
import { PUBLIC_RESULT_EXAMPLE } from '../public/dto/public-pharmacy.dto';
import { PublicController } from '../public/public.controller';
import { PublicModule } from '../public/public.module';
import { DutyInputDto } from './dto/duty-input.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { DutyPeriodController } from './duty-period.controller';
import { DutyPeriodService } from './duty-period.service';
import { PharmacyLock } from './pharmacy-lock';
import { PharmacyModule } from './pharmacy.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { InMemoryDutyPeriodStore } from './testing/in-memory-duty-period.store';
import { InMemoryPharmacyStore } from './testing/in-memory-pharmacy.store';
import { InMemorySubscriptionStatus } from './testing/in-memory-subscription-status';

const PROFILE = '/api/pharmacist/profile';
const DUTY = '/api/pharmacist/duty-periods';
const DUTY_ID = '/api/pharmacist/duty-periods/{id}';
const PUBLIC_PHARMACIES = '/api/public/pharmacies';
const PUBLIC_MEDICINES = '/api/public/medicines';

// method, path, documented statuses
const PRIVATE_ROUTES: [string, string, number[]][] = [
  ['get', PROFILE, [200, 401, 403, 404, 503]],
  ['patch', PROFILE, [200, 400, 401, 403, 404, 503]],
  ['get', DUTY, [200, 401, 403, 503]],
  ['post', DUTY, [201, 400, 401, 403, 409, 503]],
  ['patch', DUTY_ID, [200, 400, 401, 403, 404, 409, 503]],
  ['delete', DUTY_ID, [204, 400, 401, 403, 404, 503]],
];
const PUBLIC_ROUTES: [string, string, number[]][] = [
  ['get', PUBLIC_PHARMACIES, [200, 400, 503]],
  ['get', PUBLIC_MEDICINES, [200, 400, 503]],
];

const PHARMACY_ID = '11111111-1111-4111-8111-111111111111';
const ACTOR = {
  userId: '33333333-3333-4333-8333-333333333333',
  role: 'PHARMACIST' as const,
  pharmacyId: PHARMACY_ID,
};

// tsx does not emit decorator metadata, so add the parameter types tsc emits for the
// running API. Swagger needs them to find request bodies and query DTOs.
const PARAMETER_TYPES: [object, string, unknown[]][] = [
  [ProfileController.prototype, 'getProfile', [Object]],
  [ProfileController.prototype, 'updateProfile', [Object, UpdateProfileDto]],
  [DutyPeriodController.prototype, 'list', [Object]],
  [DutyPeriodController.prototype, 'create', [Object, DutyInputDto]],
  [DutyPeriodController.prototype, 'update', [Object, String, DutyInputDto]],
  [DutyPeriodController.prototype, 'remove', [Object, String]],
  [PublicController.prototype, 'listPharmacies', [PublicPharmaciesQueryDto]],
  [PublicController.prototype, 'searchMedicines', [MedicineSearchQueryDto]],
];
for (const [prototype, method, types] of PARAMETER_TYPES) {
  Reflect.defineMetadata('design:paramtypes', types, prototype, method);
}

// The same options as the global pipe in main.ts.
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

describe('OpenAPI document', () => {
  // The document is plain JSON, so its deep shape is not worth typing here.
  let document: any;

  const operation = (method: string, path: string) =>
    document.paths[path][method];
  const schema = (name: string) => document.components.schemas[name];
  const refName = (node: { $ref: string }) => node.$ref.split('/').pop();
  const content = (method: string, path: string, status: number) =>
    operation(method, path).responses[status].content['application/json'];
  const responseSchema = (method: string, path: string, status: number) =>
    refName(content(method, path, status).schema);
  const propertyNames = (name: string) =>
    Object.keys(schema(name).properties).sort();
  const parameter = (method: string, path: string, name: string) =>
    operation(method, path).parameters.filter(
      (candidate: { name: string }) => candidate.name === name,
    );

  before(async () => {
    class DocsTestModule {}
    Module({ imports: [PharmacyModule, PublicModule] })(DocsTestModule);

    const app = await NestFactory.create(DocsTestModule, { logger: false });
    app.setGlobalPrefix('api');
    // The same bearer scheme as main.ts.
    document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    await app.close();
  });

  describe('routes', () => {
    for (const [method, path, statuses] of PRIVATE_ROUTES) {
      it(`${method} ${path}: tagged pharmacist, bearer auth and these statuses`, () => {
        const route = operation(method, path);

        assert.deepEqual(route.tags, ['pharmacist']);
        assert.deepEqual(route.security, [{ bearer: [] }]);
        assert.deepEqual(
          Object.keys(route.responses).map(Number).sort(),
          statuses,
        );
        assert.ok(route.summary);
      });
    }

    for (const [method, path, statuses] of PUBLIC_ROUTES) {
      it(`${method} ${path}: tagged public, no auth and these statuses`, () => {
        const route = operation(method, path);

        assert.deepEqual(route.tags, ['public']);
        assert.equal(route.security, undefined);
        assert.deepEqual(
          Object.keys(route.responses).map(Number).sort(),
          statuses,
        );
        assert.ok(route.summary);
      });
    }

    for (const [method, path, statuses] of [
      ...PRIVATE_ROUTES,
      ...PUBLIC_ROUTES,
    ]) {
      const errors = statuses.filter((status) => status >= 400);

      it(`${method} ${path}: every error says when it happens and has an example`, () => {
        for (const status of errors) {
          const response = operation(method, path).responses[status];

          assert.ok(response.description.length > 10, `${status} description`);
          assert.equal(responseSchema(method, path, status), 'ApiErrorDto');
          assert.equal(
            content(method, path, status).example.statusCode,
            status,
          );
          assert.ok(content(method, path, status).example.message);
        }
      });
    }
  });

  describe('no schema is an empty object', () => {
    it('every named schema has fields', () => {
      const names = Object.keys(document.components.schemas);

      assert.ok(names.length >= 10, names.join(', '));
      for (const name of names) {
        assert.ok(propertyNames(name).length > 0, `${name} is empty`);
      }
    });

    const bodies: [string, string, string, string[]][] = [
      ['patch', PROFILE, 'UpdateProfileDto', ['address', 'area', 'phone']],
      ['post', DUTY, 'DutyInputDto', ['endsAt', 'startsAt']],
      ['patch', DUTY_ID, 'DutyInputDto', ['endsAt', 'startsAt']],
    ];
    for (const [method, path, name, fields] of bodies) {
      it(`${method} ${path} has a required body of ${name} with its fields`, () => {
        const body = operation(method, path).requestBody;

        assert.equal(body.required, true);
        assert.equal(refName(body.content['application/json'].schema), name);
        assert.deepEqual(propertyNames(name), fields);
        assert.deepEqual([...schema(name).required].sort(), fields);
      });
    }

    for (const [method, path] of [
      ['get', PROFILE],
      ['get', DUTY],
      ['delete', DUTY_ID],
      ['get', PUBLIC_PHARMACIES],
      ['get', PUBLIC_MEDICINES],
    ]) {
      it(`${method} ${path} has no request body`, () => {
        assert.equal(operation(method, path).requestBody, undefined);
      });
    }
  });

  describe('request constraints and examples', () => {
    it('documents the profile limits, pattern and examples', () => {
      const { area, address, phone } = schema('UpdateProfileDto').properties;

      assert.equal(area.minLength, 2);
      assert.equal(area.maxLength, 80);
      assert.equal(address.minLength, 5);
      assert.equal(address.maxLength, 200);
      assert.equal(phone.minLength, 7);
      assert.equal(phone.maxLength, 21);
      assert.ok(phone.pattern);
      for (const field of [area, address, phone]) {
        assert.equal(field.type, 'string');
        assert.ok(field.example);
        assert.ok(field.description);
      }
    });

    it('documents duty times as date-time with an offset in the example', () => {
      const { startsAt, endsAt } = schema('DutyInputDto').properties;

      for (const field of [startsAt, endsAt]) {
        assert.equal(field.type, 'string');
        assert.equal(field.format, 'date-time');
        assert.match(field.example, /\+03:00$/);
        assert.ok(field.description);
      }
    });

    it('documents q as required and area and onDutyNow as optional', () => {
      const [q] = parameter('get', PUBLIC_MEDICINES, 'q');
      const [area] = parameter('get', PUBLIC_MEDICINES, 'area');
      const [onDutyNow] = parameter('get', PUBLIC_MEDICINES, 'onDutyNow');

      assert.equal(q.in, 'query');
      assert.equal(q.required, true);
      assert.equal(q.schema.type, 'string');
      assert.equal(q.schema.minLength, 1);
      assert.equal(q.schema.example, 'amox');
      assert.ok(q.description);
      assert.equal(area.required, false);
      assert.equal(area.schema.type, 'string');
      assert.equal(area.schema.example, 'Downtown');
      assert.ok(area.description);
      assert.equal(onDutyNow.required, false);
      assert.equal(onDutyNow.schema.type, 'boolean');
      assert.equal(onDutyNow.schema.example, true);
      assert.ok(onDutyNow.description);
    });

    it('documents the directory without q', () => {
      const names = operation('get', PUBLIC_PHARMACIES)
        .parameters.map((candidate: { name: string }) => candidate.name)
        .sort();

      assert.deepEqual(names, ['area', 'onDutyNow']);
    });

    for (const method of ['patch', 'delete']) {
      it(`${method} duty period documents id once, as a UUID`, () => {
        const ids = parameter(method, DUTY_ID, 'id');

        assert.equal(ids.length, 1);
        assert.equal(ids[0].in, 'path');
        assert.equal(ids[0].required, true);
        assert.equal(ids[0].schema.format, 'uuid');
      });
    }

    it('adds no parameter for the signed-in user', () => {
      assert.deepEqual(operation('get', PROFILE).parameters, []);
      assert.deepEqual(operation('patch', PROFILE).parameters, []);
      assert.deepEqual(operation('get', DUTY).parameters, []);
      assert.deepEqual(operation('post', DUTY).parameters, []);
    });
  });

  describe('private responses', () => {
    for (const method of ['get', 'patch']) {
      it(`${method} profile returns ProfileResponseDto`, () => {
        assert.equal(
          responseSchema(method, PROFILE, 200),
          'ProfileResponseDto',
        );
      });
    }

    it('ProfileResponseDto nests the pharmacy and lists the status enum', () => {
      const { pharmacy, subscriptionStatus } =
        schema('ProfileResponseDto').properties;

      assert.equal(
        refName(pharmacy.allOf?.[0] ?? pharmacy),
        'PharmacyProfileDto',
      );
      assert.equal(subscriptionStatus.type, 'string');
      assert.deepEqual(subscriptionStatus.enum, [
        'ACTIVE',
        'EXPIRED',
        'SUSPENDED',
        'NONE',
      ]);
      assert.deepEqual([...schema('ProfileResponseDto').required].sort(), [
        'pharmacy',
        'subscriptionStatus',
      ]);
    });

    it('PharmacyProfileDto has every nested field', () => {
      const fields = [
        'address',
        'area',
        'id',
        'inventoryUpdatedAt',
        'name',
        'phone',
      ];
      const { properties } = schema('PharmacyProfileDto');

      assert.deepEqual(propertyNames('PharmacyProfileDto'), fields);
      assert.equal(properties.id.format, 'uuid');
      assert.equal(properties.inventoryUpdatedAt.nullable, true);
      assert.equal(properties.inventoryUpdatedAt.format, 'date-time');
      for (const field of fields) {
        assert.ok(properties[field].example, `${field} example`);
      }
    });

    it('duty routes return DutyPeriodDto, and the list wraps it in items and total', () => {
      assert.equal(responseSchema('post', DUTY, 201), 'DutyPeriodDto');
      assert.equal(responseSchema('patch', DUTY_ID, 200), 'DutyPeriodDto');
      assert.equal(responseSchema('get', DUTY, 200), 'DutyPeriodListDto');

      assert.deepEqual(propertyNames('DutyPeriodDto'), [
        'endsAt',
        'id',
        'startsAt',
      ]);
      assert.deepEqual(propertyNames('DutyPeriodListDto'), ['items', 'total']);
      const { items, total } = schema('DutyPeriodListDto').properties;
      assert.equal(items.type, 'array');
      assert.equal(refName(items.items), 'DutyPeriodDto');
      assert.equal(total.type, 'number');
    });

    it('delete documents 204 with no body', () => {
      const response = operation('delete', DUTY_ID).responses[204];

      assert.ok(response.description);
      assert.equal(response.content, undefined);
    });
  });

  describe('public responses', () => {
    for (const path of [PUBLIC_PHARMACIES, PUBLIC_MEDICINES]) {
      it(`${path} returns PublicPharmacyListDto`, () => {
        assert.equal(responseSchema('get', path, 200), 'PublicPharmacyListDto');
      });

      it(`${path} shows the privacy example with allowlisted fields only`, () => {
        const { examples } = content('get', path, 200);

        assert.deepEqual(examples.privacy.value, PUBLIC_RESULT_EXAMPLE);
        assert.deepEqual(examples.noResults.value, { items: [], total: 0 });
        assert.deepEqual(
          Object.keys(examples.privacy.value.items[0]).sort(),
          propertyNames('PublicPharmacyDto'),
        );
        assert.deepEqual(
          Object.keys(examples.privacy.value.items[0].currentDuty).sort(),
          propertyNames('PublicDutyPeriodDto'),
        );
      });

      it(`${path} says what is never returned`, () => {
        const { description } = operation('get', path).responses[200];

        for (const word of ['IDs', 'quantities', 'costs', 'subscription']) {
          assert.ok(description.includes(word), word);
        }
      });
    }

    it('PublicPharmacyDto has exactly the allowlisted fields', () => {
      assert.deepEqual(propertyNames('PublicPharmacyDto'), [
        'address',
        'area',
        'currentDuty',
        'inventoryUpdatedAt',
        'name',
        'nextDuty',
        'onDutyNow',
        'phone',
      ]);
      assert.deepEqual(propertyNames('PublicDutyPeriodDto'), [
        'endsAt',
        'startsAt',
      ]);
    });

    it('marks every nullable public field as nullable and the rest as not', () => {
      const { properties } = schema('PublicPharmacyDto');

      for (const field of ['currentDuty', 'nextDuty', 'inventoryUpdatedAt']) {
        assert.equal(properties[field].nullable, true, field);
      }
      for (const field of ['name', 'area', 'address', 'phone', 'onDutyNow']) {
        assert.equal(properties[field].nullable, undefined, field);
      }
      assert.equal(
        refName(properties.currentDuty.allOf[0]),
        'PublicDutyPeriodDto',
      );
      assert.equal(
        refName(properties.nextDuty.allOf[0]),
        'PublicDutyPeriodDto',
      );
      assert.equal(properties.onDutyNow.type, 'boolean');
      assert.equal(properties.inventoryUpdatedAt.format, 'date-time');
    });

    it('wraps public results in items and total', () => {
      const { items, total } = schema('PublicPharmacyListDto').properties;

      assert.deepEqual(propertyNames('PublicPharmacyListDto'), [
        'items',
        'total',
      ]);
      assert.equal(items.type, 'array');
      assert.equal(refName(items.items), 'PublicPharmacyDto');
      assert.equal(total.type, 'number');
    });

    it('never names a private field in a public schema', () => {
      const names = [
        ...propertyNames('PublicPharmacyDto'),
        ...propertyNames('PublicDutyPeriodDto'),
        ...propertyNames('PublicPharmacyListDto'),
      ];

      for (const secret of [
        'id',
        'pharmacyId',
        'quantity',
        'batchNumber',
        'unitCost',
        'storageLocation',
        'barcode',
        'subscription',
        'subscriptionStatus',
      ]) {
        assert.equal(names.includes(secret), false, secret);
      }
    });
  });

  describe('the error schema', () => {
    it('allows one reason or a list of reasons', () => {
      const { statusCode, message, error } = schema('ApiErrorDto').properties;

      assert.equal(statusCode.type, 'number');
      assert.equal(message.type, undefined);
      assert.deepEqual(message.oneOf, [
        { type: 'string' },
        { type: 'array', items: { type: 'string' } },
      ]);
      assert.equal(error.type, 'string');
      assert.deepEqual(schema('ApiErrorDto').required, [
        'statusCode',
        'message',
      ]);
    });
  });

  describe('the documentation matches the real behaviour', () => {
    const accepts = (metatype: never, value: unknown) =>
      pipe.transform(value, { type: 'body', metatype });
    const profileExample = () => {
      const { area, address, phone } = schema('UpdateProfileDto').properties;
      return {
        area: area.example,
        address: address.example,
        phone: phone.example,
      };
    };

    it('the documented request examples pass validation', async () => {
      const duty = schema('DutyInputDto').properties;

      await accepts(UpdateProfileDto as never, profileExample());
      await accepts(DutyInputDto as never, {
        startsAt: duty.startsAt.example,
        endsAt: duty.endsAt.example,
      });
    });

    it('the documented query examples pass validation', async () => {
      const example = (name: string) => [
        name,
        String(parameter('get', PUBLIC_MEDICINES, name)[0].schema.example),
      ];
      const query = Object.fromEntries(['q', 'area', 'onDutyNow'].map(example));

      const result = await pipe.transform(query, {
        type: 'query',
        metatype: MedicineSearchQueryDto,
      });

      assert.equal(result.onDutyNow, true);
    });

    for (const field of ['area', 'address']) {
      it(`the documented ${field} limits are the real limits`, async () => {
        const { minLength, maxLength } =
          schema('UpdateProfileDto').properties[field];
        const withField = (length: number) => ({
          ...profileExample(),
          [field]: 'A'.repeat(length),
        });

        await accepts(UpdateProfileDto as never, withField(minLength));
        await accepts(UpdateProfileDto as never, withField(maxLength));
        await assert.rejects(
          accepts(UpdateProfileDto as never, withField(minLength - 1)),
          BadRequestException,
        );
        await assert.rejects(
          accepts(UpdateProfileDto as never, withField(maxLength + 1)),
          BadRequestException,
        );
      });
    }

    it('the documented phone limits and pattern are the real ones', async () => {
      const { minLength, maxLength, pattern, example } =
        schema('UpdateProfileDto').properties.phone;
      const withPhone = (phone: string) => ({ ...profileExample(), phone });
      const longest = `+${'1'.repeat(maxLength - 1)}`;

      assert.match(example, new RegExp(pattern));
      await accepts(
        UpdateProfileDto as never,
        withPhone('1'.repeat(minLength)),
      );
      await accepts(UpdateProfileDto as never, withPhone(longest));
      await assert.rejects(
        accepts(UpdateProfileDto as never, withPhone(`${longest}1`)),
        BadRequestException,
      );
      await assert.rejects(
        accepts(
          UpdateProfileDto as never,
          withPhone('1'.repeat(minLength - 1)),
        ),
        BadRequestException,
      );
    });

    function setupServices(status: 'ACTIVE' | 'EXPIRED' = 'ACTIVE') {
      const subscriptions = new InMemorySubscriptionStatus();
      subscriptions.set(PHARMACY_ID, status);
      const pharmacies = new InMemoryPharmacyStore([
        {
          id: PHARMACY_ID,
          name: 'Central',
          area: 'Downtown',
          address: '12 Main Street',
          phone: '0791234567',
          inventoryUpdatedAt: null,
        },
      ]);
      return {
        profiles: new ProfileService(pharmacies, subscriptions),
        periods: new DutyPeriodService(
          new InMemoryDutyPeriodStore(),
          subscriptions,
          new PharmacyLock(),
        ),
      };
    }

    const NIGHT = {
      startsAt: '2026-11-04T20:00:00+03:00',
      endsAt: '2026-11-05T08:00:00+03:00',
    };

    it('real private responses have exactly the documented fields', async () => {
      const { profiles, periods } = setupServices();

      const profile = await profiles.getOwnProfile(ACTOR);
      const created = await periods.create(ACTOR, NIGHT);
      const list = await periods.listOwn(ACTOR);

      assert.deepEqual(
        Object.keys(profile).sort(),
        propertyNames('ProfileResponseDto'),
      );
      assert.deepEqual(
        Object.keys(profile.pharmacy).sort(),
        propertyNames('PharmacyProfileDto'),
      );
      assert.deepEqual(
        Object.keys(created).sort(),
        propertyNames('DutyPeriodDto'),
      );
      assert.deepEqual(
        Object.keys(list).sort(),
        propertyNames('DutyPeriodListDto'),
      );
      assert.ok(
        schema(
          'ProfileResponseDto',
        ).properties.subscriptionStatus.enum.includes(
          profile.subscriptionStatus,
        ),
      );
    });

    async function realError(request: Promise<unknown>) {
      const error = await request.then(
        () => assert.fail('expected the request to be rejected'),
        (reason: unknown) => reason,
      );
      assert.ok(error instanceof HttpException);
      return error.getResponse();
    }

    it('the 409 example is the real overlap answer', async () => {
      const { periods } = setupServices();
      await periods.create(ACTOR, NIGHT);

      assert.deepEqual(
        await realError(periods.create(ACTOR, NIGHT)),
        content('post', DUTY, 409).example,
      );
    });

    it('the 404 examples are the real not-found answers', async () => {
      const { profiles, periods } = setupServices();
      const missing = '99999999-9999-4999-8999-999999999999';

      assert.deepEqual(
        await realError(periods.update(ACTOR, missing, NIGHT)),
        content('patch', DUTY_ID, 404).example,
      );
      assert.deepEqual(
        await realError(periods.remove(ACTOR, missing)),
        content('delete', DUTY_ID, 404).example,
      );
      assert.deepEqual(
        await realError(
          profiles.getOwnProfile({ ...ACTOR, pharmacyId: missing }),
        ),
        content('get', PROFILE, 404).example,
      );
    });

    it('the 403 example is the real answer for an expired subscription', async () => {
      const { periods, profiles } = setupServices('EXPIRED');

      assert.deepEqual(
        await realError(periods.create(ACTOR, NIGHT)),
        content('post', DUTY, 403).example,
      );
      assert.deepEqual(
        await realError(
          profiles.updateOwnProfile(ACTOR, profileExample() as never),
        ),
        content('patch', PROFILE, 403).example,
      );
    });

    it('the 400 examples are the real validation answers', async () => {
      const { periods } = setupServices();

      assert.deepEqual(
        await realError(
          periods.create(ACTOR, {
            startsAt: NIGHT.endsAt,
            endsAt: NIGHT.startsAt,
          }),
        ),
        content('post', DUTY, 400).example,
      );
      assert.deepEqual(
        await realError(
          Promise.resolve().then(() =>
            new ParseUUIDPipe().transform('not-a-uuid', { type: 'param' }),
          ),
        ),
        content('delete', DUTY_ID, 400).example,
      );
      assert.deepEqual(
        await realError(
          accepts(UpdateProfileDto as never, {
            ...profileExample(),
            name: 'Renamed',
          }),
        ),
        content('patch', PROFILE, 400).example,
      );
      assert.deepEqual(
        await realError(
          pipe.transform(
            {},
            { type: 'query', metatype: MedicineSearchQueryDto },
          ),
        ),
        content('get', PUBLIC_MEDICINES, 400).example,
      );
      assert.deepEqual(
        await realError(
          pipe.transform(
            { onDutyNow: 'TRUE' },
            { type: 'query', metatype: PublicPharmaciesQueryDto },
          ),
        ),
        content('get', PUBLIC_PHARMACIES, 400).example,
      );
    });
  });
});
