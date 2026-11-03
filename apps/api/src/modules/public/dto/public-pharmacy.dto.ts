import type { PublicDutyPeriod, PublicPharmacy } from '@smartshelf/contracts';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { IsOffsetInstant } from '../../pharmacy/duty-instant';

export class PublicDutyPeriodDto implements PublicDutyPeriod {
  @IsOffsetInstant()
  startsAt!: string;

  @IsOffsetInstant()
  endsAt!: string;
}

export class PublicPharmacyDto implements PublicPharmacy {
  @IsString()
  name!: string;

  @IsString()
  area!: string;

  @IsString()
  address!: string;

  @IsString()
  phone!: string;

  @IsBoolean()
  onDutyNow!: boolean;

  @ValidateIf((pharmacy: PublicPharmacyDto) => pharmacy.currentDuty !== null)
  @ValidateNested()
  @Type(() => PublicDutyPeriodDto)
  currentDuty!: PublicDutyPeriodDto | null;

  @ValidateIf((pharmacy: PublicPharmacyDto) => pharmacy.nextDuty !== null)
  @ValidateNested()
  @Type(() => PublicDutyPeriodDto)
  nextDuty!: PublicDutyPeriodDto | null;

  @ValidateIf(
    (pharmacy: PublicPharmacyDto) => pharmacy.inventoryUpdatedAt !== null,
  )
  @IsOffsetInstant()
  inventoryUpdatedAt!: string | null;
}
