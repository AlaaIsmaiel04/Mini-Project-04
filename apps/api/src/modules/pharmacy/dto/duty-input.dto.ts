import { ApiProperty } from '@nestjs/swagger';
import type { DutyInput } from '@smartshelf/contracts';
import { IsOffsetInstant } from '../duty-instant';

export class DutyInputDto implements DutyInput {
  @ApiProperty({
    type: String,
    format: 'date-time',
    description:
      'Start of the period, included. ISO 8601 with an offset or Z; a time without an offset is rejected.',
    example: '2026-11-04T20:00:00+03:00',
  })
  @IsOffsetInstant()
  startsAt!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description:
      'End of the period, not included. ISO 8601 with an offset or Z. Must be after startsAt and at most 24 hours later, so it may fall on the next day.',
    example: '2026-11-05T08:00:00+03:00',
  })
  @IsOffsetInstant()
  endsAt!: string;
}
