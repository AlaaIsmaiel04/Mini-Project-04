import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { DutyInputDto } from './duty-input.dto';
import { UpdateProfileDto } from './update-profile.dto';

// The same options as the global pipe in main.ts.
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

const validProfile = {
  area: 'Downtown',
  address: '12 Main Street',
  phone: '+962 6 555-0100',
};

const validDuty = {
  startsAt: '2026-11-04T20:00:00+03:00',
  endsAt: '2026-11-05T08:00:00+03:00',
};

const validateProfile = (body: unknown) =>
  pipe.transform(body, { type: 'body', metatype: UpdateProfileDto });

const validateDuty = (body: unknown) =>
  pipe.transform(body, { type: 'body', metatype: DutyInputDto });

describe('UpdateProfileDto', () => {
  it('accepts a valid profile and trims it', async () => {
    const result = await validateProfile({
      ...validProfile,
      area: '  Downtown  ',
    });

    assert.equal(result.area, 'Downtown');
  });

  for (const field of ['name', 'pharmacyId', 'id', 'inventoryUpdatedAt']) {
    it(`rejects ${field}`, async () => {
      await assert.rejects(
        validateProfile({ ...validProfile, [field]: 'changed' }),
        BadRequestException,
      );
    });
  }

  for (const field of ['area', 'address', 'phone']) {
    it(`requires ${field}`, async () => {
      const { [field as keyof typeof validProfile]: _removed, ...body } =
        validProfile;

      await assert.rejects(validateProfile(body), BadRequestException);
    });
  }

  const invalid: [string, Record<string, unknown>][] = [
    ['area under 2 characters after trimming', { area: ' A ' }],
    ['area over 80 characters', { area: 'A'.repeat(81) }],
    ['address under 5 characters', { address: 'Road' }],
    ['address over 200 characters', { address: 'A'.repeat(201) }],
    ['phone with letters', { phone: '+962 CALL ME' }],
    ['phone without enough digits', { phone: '-------' }],
    ['phone over 20 characters', { phone: '1'.repeat(21) }],
    ['phone with a line break', { phone: '0791234\n567' }],
    ['non-string area', { area: 12345 }],
  ];
  for (const [label, change] of invalid) {
    it(`rejects ${label}`, async () => {
      await assert.rejects(
        validateProfile({ ...validProfile, ...change }),
        BadRequestException,
      );
    });
  }

  it('accepts the length limits', async () => {
    await validateProfile({
      area: 'AB',
      address: 'A'.repeat(200),
      phone: '1234567',
    });
  });
});

describe('DutyInputDto', () => {
  const accepted = [
    '2026-11-04T20:00:00Z',
    '2026-11-04T20:00:00.000Z',
    '2026-11-04T20:00+03:00',
    '2026-11-04T20:00:00-05:30',
    '2028-02-29T00:00:00Z',
  ];
  for (const startsAt of accepted) {
    it(`accepts ${startsAt}`, async () => {
      await validateDuty({ ...validDuty, startsAt });
    });
  }

  const rejected = [
    '2026-11-04T20:00:00',
    '2026-11-04',
    '2026-02-30T20:00:00Z',
    '2026-13-01T20:00:00Z',
    '2026-11-04T24:00:00Z',
    '2026-11-04T20:60:00Z',
    '2026-11-04T20:00:00+15:00',
    '2026-11-04T20:00:00z',
    'tomorrow',
    '',
  ];
  for (const endsAt of rejected) {
    it(`rejects "${endsAt}"`, async () => {
      await assert.rejects(
        validateDuty({ ...validDuty, endsAt }),
        BadRequestException,
      );
    });
  }

  it('rejects non-string, missing and unknown fields', async () => {
    await assert.rejects(
      validateDuty({ ...validDuty, startsAt: 1762275600000 }),
      BadRequestException,
    );
    await assert.rejects(
      validateDuty({ startsAt: validDuty.startsAt }),
      BadRequestException,
    );
    await assert.rejects(
      validateDuty({ ...validDuty, pharmacyId: 'other' }),
      BadRequestException,
    );
  });
});
