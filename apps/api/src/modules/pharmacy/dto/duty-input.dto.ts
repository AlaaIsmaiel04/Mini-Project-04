import type { DutyInput } from '@smartshelf/contracts';
import { IsOffsetInstant } from '../duty-instant';

export class DutyInputDto implements DutyInput {
  @IsOffsetInstant()
  startsAt!: string;

  @IsOffsetInstant()
  endsAt!: string;
}
