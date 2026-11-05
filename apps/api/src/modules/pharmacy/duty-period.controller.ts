import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { DutyPeriod, ListResponse } from '@smartshelf/contracts';
import {
  CurrentPharmacist,
  type PharmacistActor,
  TemporaryPharmacistGuard,
} from './adapters/temporary-auth.adapter';
import {
  ApiErrors,
  CHANGE_FORBIDDEN,
  DATA_UNAVAILABLE,
  type DocumentedError,
  NOT_A_PHARMACIST,
  NOT_SIGNED_IN,
} from './api-errors';
import { DutyInputDto } from './dto/duty-input.dto';
import { DutyPeriodDto, DutyPeriodListDto } from './dto/duty-period.dto';
import {
  DUTY_NOT_FOUND,
  DUTY_OVERLAP,
  DutyPeriodService,
} from './duty-period.service';
import { RejectedChangeFilter } from './rejected-change.filter';

const INVALID_TIMES =
  'A time is missing or has no offset, the end is not after the start, the period is longer than 24 hours, or the body has an unknown field such as pharmacyId. Nothing is saved.';

const OVERLAPS_ANOTHER_PERIOD: DocumentedError = {
  status: 409,
  description:
    'The times overlap another duty period of this pharmacy. A period may start exactly when another one ends, and other pharmacies are not compared.',
  message: DUTY_OVERLAP,
};

const NOT_YOUR_PERIOD: DocumentedError = {
  status: 404,
  description:
    'Your pharmacy has no duty period with this ID. A period of another pharmacy gets the same answer, and the attempt is logged.',
  message: DUTY_NOT_FOUND,
};

const PERIOD_ID = {
  name: 'id',
  type: String,
  format: 'uuid',
  description: 'ID of a duty period of your own pharmacy',
  example: '44444444-4444-4444-8444-444444444444',
};

@ApiTags('pharmacist')
@ApiBearerAuth()
// Compatibility guard delegates authentication to the shared JWT guard.
@UseGuards(TemporaryPharmacistGuard)
@UseFilters(RejectedChangeFilter)
@Controller('pharmacist/duty-periods')
export class DutyPeriodController {
  constructor(
    @Inject(DutyPeriodService) private readonly periods: DutyPeriodService,
  ) {}

  @ApiOperation({
    summary: 'List own duty periods; allowed for inactive subscriptions',
  })
  @ApiOkResponse({
    type: DutyPeriodListDto,
    description: 'Your duty periods in UTC, ordered by start.',
  })
  @ApiErrors(NOT_SIGNED_IN, NOT_A_PHARMACIST, DATA_UNAVAILABLE)
  @Get()
  list(
    @CurrentPharmacist() actor: PharmacistActor,
  ): Promise<ListResponse<DutyPeriod>> {
    return this.periods.listOwn(actor);
  }

  @ApiOperation({
    summary: 'Create a duty period; requires ACTIVE subscription',
    description:
      'Periods are half-open: the start instant is on duty and the end instant is not. A period may cross midnight, such as 20:00 to 08:00 the next day.',
  })
  @ApiCreatedResponse({
    type: DutyPeriodDto,
    description: 'Saved. Times are returned in UTC.',
  })
  @ApiErrors(
    {
      status: 400,
      description: INVALID_TIMES,
      message: 'endsAt must be after startsAt',
    },
    NOT_SIGNED_IN,
    CHANGE_FORBIDDEN,
    OVERLAPS_ANOTHER_PERIOD,
    DATA_UNAVAILABLE,
  )
  @Post()
  create(
    @CurrentPharmacist() actor: PharmacistActor,
    @Body() input: DutyInputDto,
  ): Promise<DutyPeriod> {
    return this.periods.create(actor, input);
  }

  @ApiOperation({
    summary: 'Replace an own duty period; requires ACTIVE subscription',
    description:
      'Both times are required. The same rules as creating apply, except that a period is not compared with its own old times.',
  })
  @ApiParam(PERIOD_ID)
  @ApiOkResponse({
    type: DutyPeriodDto,
    description: 'Saved. Times are returned in UTC.',
  })
  @ApiErrors(
    {
      status: 400,
      description: `The ID is not a valid UUID. ${INVALID_TIMES}`,
      message: 'endsAt must be after startsAt',
    },
    NOT_SIGNED_IN,
    CHANGE_FORBIDDEN,
    NOT_YOUR_PERIOD,
    OVERLAPS_ANOTHER_PERIOD,
    DATA_UNAVAILABLE,
  )
  @Patch(':id')
  update(
    @CurrentPharmacist() actor: PharmacistActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: DutyInputDto,
  ): Promise<DutyPeriod> {
    return this.periods.update(actor, id, input);
  }

  @ApiOperation({
    summary: 'Delete an own duty period; requires ACTIVE subscription',
  })
  @ApiParam(PERIOD_ID)
  @ApiNoContentResponse({ description: 'Deleted. There is no response body.' })
  @ApiErrors(
    {
      status: 400,
      description: 'The ID is not a valid UUID.',
      message: 'Validation failed (uuid is expected)',
    },
    NOT_SIGNED_IN,
    CHANGE_FORBIDDEN,
    NOT_YOUR_PERIOD,
    DATA_UNAVAILABLE,
  )
  @HttpCode(204)
  @Delete(':id')
  remove(
    @CurrentPharmacist() actor: PharmacistActor,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.periods.remove(actor, id);
  }
}
