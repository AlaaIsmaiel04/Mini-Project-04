import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ListResponse, PublicPharmacy } from '@smartshelf/contracts';
import { PublicPharmaciesQueryDto } from './dto/public-pharmacies-query.dto';
import { PublicService } from './public.service';

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(@Inject(PublicService) private readonly service: PublicService) {}

  @ApiOperation({
    summary:
      'List pharmacies with an active subscription and their current or next duty period',
  })
  @Get('pharmacies')
  listPharmacies(
    @Query() query: PublicPharmaciesQueryDto,
  ): Promise<ListResponse<PublicPharmacy>> {
    return this.service.listPharmacies(query);
  }
}
