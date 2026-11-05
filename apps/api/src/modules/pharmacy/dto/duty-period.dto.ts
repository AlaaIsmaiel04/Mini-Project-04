import { ApiProperty } from '@nestjs/swagger';
import type { DutyPeriod, ListResponse } from '@smartshelf/contracts';

// Response shapes for Swagger. The service returns plain contract objects.
export class DutyPeriodDto implements DutyPeriod {
  @ApiProperty({
    type: String,
    format: 'uuid',
    description: 'ID of this duty period',
    example: '44444444-4444-4444-8444-444444444444',
  })
  id!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Start of the period in UTC, included',
    example: '2026-11-04T17:00:00.000Z',
  })
  startsAt!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'End of the period in UTC, not included',
    example: '2026-11-05T05:00:00.000Z',
  })
  endsAt!: string;
}

export class DutyPeriodListDto implements ListResponse<DutyPeriod> {
  @ApiProperty({
    type: [DutyPeriodDto],
    description: 'Duty periods of your own pharmacy, ordered by start',
  })
  items!: DutyPeriodDto[];

  @ApiProperty({
    type: Number,
    description: 'Number of items',
    example: 1,
  })
  total!: number;
}
