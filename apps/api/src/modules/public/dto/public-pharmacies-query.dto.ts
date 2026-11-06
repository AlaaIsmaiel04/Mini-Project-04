import { ApiPropertyOptional } from '@nestjs/swagger';
import type { PublicPharmacyFilters } from '@smartshelf/contracts';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// Boolean('false') is true, so only these two exact strings become booleans. Anything
// else stays as it was sent and IsBoolean rejects it.
const parseStrictBoolean = ({ value }: { value: unknown }) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

// No Swagger example on these two: Try it out fills examples in and sends them, so a search
// with "empty" filters would really be limited to that area and to pharmacies on duty.
export class PublicPharmaciesQueryDto implements PublicPharmacyFilters {
  @ApiPropertyOptional({
    type: String,
    description:
      'Exact area such as Downtown, ignoring case and surrounding spaces. A blank value adds no filter.',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  area?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      'Exactly true or false. true lists only pharmacies on duty now; false adds no filter.',
  })
  @IsOptional()
  @Transform(parseStrictBoolean)
  @IsBoolean({ message: 'onDutyNow must be true or false' })
  onDutyNow?: boolean;
}
