import { ApiProperty } from '@nestjs/swagger';
import type {
  ListResponse,
  PublicDutyPeriod,
  PublicPharmacy,
} from '@smartshelf/contracts';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { IsOffsetInstant } from '../../pharmacy/duty-instant';

export class PublicDutyPeriodDto implements PublicDutyPeriod {
  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Start of the period in UTC, included',
    example: '2026-11-04T17:00:00.000Z',
  })
  @IsOffsetInstant()
  startsAt!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'End of the period in UTC, not included',
    example: '2026-11-05T05:00:00.000Z',
  })
  @IsOffsetInstant()
  endsAt!: string;
}

export class PublicPharmacyDto implements PublicPharmacy {
  @ApiProperty({
    type: String,
    description: 'Pharmacy name',
    example: 'Central Pharmacy',
  })
  @IsString()
  name!: string;

  @ApiProperty({ type: String, description: 'Area', example: 'Downtown' })
  @IsString()
  area!: string;

  @ApiProperty({
    type: String,
    description: 'Street address',
    example: '12 Main Street, Amman',
  })
  @IsString()
  address!: string;

  @ApiProperty({
    type: String,
    description: 'Phone number',
    example: '+962 6 555 0100',
  })
  @IsString()
  phone!: string;

  @ApiProperty({
    type: Boolean,
    description: 'Whether the pharmacy is on duty at this moment',
    example: true,
  })
  @IsBoolean()
  onDutyNow!: boolean;

  @ApiProperty({
    type: PublicDutyPeriodDto,
    nullable: true,
    description: 'The duty period happening now; null if there is none',
  })
  @ValidateIf((pharmacy: PublicPharmacyDto) => pharmacy.currentDuty !== null)
  @ValidateNested()
  @Type(() => PublicDutyPeriodDto)
  currentDuty!: PublicDutyPeriodDto | null;

  @ApiProperty({
    type: PublicDutyPeriodDto,
    nullable: true,
    description: 'The earliest upcoming duty period; null if there is none',
  })
  @ValidateIf((pharmacy: PublicPharmacyDto) => pharmacy.nextDuty !== null)
  @ValidateNested()
  @Type(() => PublicDutyPeriodDto)
  nextDuty!: PublicDutyPeriodDto | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description:
      'Last change to a medicine or batch, in UTC; null if there has been none',
    example: '2026-11-04T15:30:00.000Z',
  })
  @ValidateIf(
    (pharmacy: PublicPharmacyDto) => pharmacy.inventoryUpdatedAt !== null,
  )
  @IsOffsetInstant()
  inventoryUpdatedAt!: string | null;
}

export class PublicPharmacyListDto implements ListResponse<PublicPharmacy> {
  @ApiProperty({
    type: [PublicPharmacyDto],
    description: 'Matching pharmacies, each once, sorted by name',
  })
  items!: PublicPharmacyDto[];

  @ApiProperty({
    type: Number,
    description: 'Number of pharmacies after all filters',
    example: 1,
  })
  total!: number;
}

// Typed against the contract, so an extra field here does not compile.
export const PUBLIC_RESULT_EXAMPLE: ListResponse<PublicPharmacy> = {
  items: [
    {
      name: 'Central Pharmacy',
      area: 'Downtown',
      address: '12 Main Street, Amman',
      phone: '+962 6 555 0100',
      onDutyNow: true,
      currentDuty: {
        startsAt: '2026-11-04T17:00:00.000Z',
        endsAt: '2026-11-05T05:00:00.000Z',
      },
      nextDuty: {
        startsAt: '2026-11-06T17:00:00.000Z',
        endsAt: '2026-11-07T05:00:00.000Z',
      },
      inventoryUpdatedAt: '2026-11-04T15:30:00.000Z',
    },
  ],
  total: 1,
};
