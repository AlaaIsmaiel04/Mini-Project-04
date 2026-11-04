import { ApiProperty } from '@nestjs/swagger';
import type { MedicineSearchFilters } from '@smartshelf/contracts';
import { Transform } from 'class-transformer';
import { MinLength } from 'class-validator';
import { PublicPharmaciesQueryDto, trim } from './public-pharmacies-query.dto';

export class MedicineSearchQueryDto
  extends PublicPharmaciesQueryDto
  implements MedicineSearchFilters
{
  @ApiProperty({
    type: String,
    minLength: 1,
    description:
      'Part of a display or scientific name, ignoring case. Required, and cannot be empty after surrounding spaces are removed.',
    example: 'amox',
  })
  @Transform(trim)
  // Also rejects a missing or repeated q, because only a string can pass.
  @MinLength(1, { message: 'q is required and cannot be empty' })
  q!: string;
}
