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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { DutyPeriod, ListResponse } from '@smartshelf/contracts';
import {
  CurrentPharmacist,
  type PharmacistActor,
  TemporaryPharmacistGuard,
} from './adapters/temporary-auth.adapter';
import { DutyInputDto } from './dto/duty-input.dto';
import { DutyPeriodService } from './duty-period.service';
import { RejectedChangeFilter } from './rejected-change.filter';

@ApiTags('pharmacist')
@ApiBearerAuth()
// TEMPORARY: replace when Mustafa/Shiam merge.
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
  @Get()
  list(
    @CurrentPharmacist() actor: PharmacistActor,
  ): Promise<ListResponse<DutyPeriod>> {
    return this.periods.listOwn(actor);
  }

  @ApiOperation({
    summary: 'Create a duty period; requires ACTIVE subscription',
  })
  @Post()
  create(
    @CurrentPharmacist() actor: PharmacistActor,
    @Body() input: DutyInputDto,
  ): Promise<DutyPeriod> {
    return this.periods.create(actor, input);
  }

  @ApiOperation({
    summary: 'Replace an own duty period; requires ACTIVE subscription',
  })
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
  @HttpCode(204)
  @Delete(':id')
  remove(
    @CurrentPharmacist() actor: PharmacistActor,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.periods.remove(actor, id);
  }
}
