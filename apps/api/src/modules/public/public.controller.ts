import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ListResponse, PublicPharmacy } from '@smartshelf/contracts';
import { MedicineSearchQueryDto } from './dto/medicine-search-query.dto';
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

  @ApiOperation({
    summary:
      'Search a medicine name and list the pharmacies that have it available; returns pharmacy fields only',
  })
  @Get('medicines')
  searchMedicines(
    @Query() query: MedicineSearchQueryDto,
  ): Promise<ListResponse<PublicPharmacy>> {
    return this.service.searchMedicines(query);
  }
}
