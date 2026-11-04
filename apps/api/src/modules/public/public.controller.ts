import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ListResponse, PublicPharmacy } from '@smartshelf/contracts';
import { ApiErrors, DATA_UNAVAILABLE } from '../pharmacy/api-errors';
import { MedicineSearchQueryDto } from './dto/medicine-search-query.dto';
import { PublicPharmaciesQueryDto } from './dto/public-pharmacies-query.dto';
import {
  PUBLIC_RESULT_EXAMPLE,
  PublicPharmacyListDto,
} from './dto/public-pharmacy.dto';
import { PublicService } from './public.service';

const PUBLIC_RESULT = {
  type: PublicPharmacyListDto,
  description:
    'Allowlisted fields only. Never IDs, quantities, batch numbers, costs, storage locations, barcodes, medicine details, subscription data or account data.',
  examples: {
    privacy: {
      summary: 'Privacy: these are the only fields a citizen can ever see',
      value: PUBLIC_RESULT_EXAMPLE,
    },
    noResults: {
      summary: 'Nothing matches: still 200, with an empty list',
      value: { items: [], total: 0 },
    },
  },
};

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(@Inject(PublicService) private readonly service: PublicService) {}

  @ApiOperation({
    summary:
      'List pharmacies with an active subscription and their current or next duty period',
    description:
      'No sign-in. Lists every pharmacy with an ACTIVE subscription, even one with no stock.',
  })
  @ApiOkResponse(PUBLIC_RESULT)
  @ApiErrors(
    {
      status: 400,
      description:
        'onDutyNow is not exactly true or false, area is repeated, or the query has an unknown field.',
      message: ['onDutyNow must be true or false'],
    },
    DATA_UNAVAILABLE,
  )
  @Get('pharmacies')
  listPharmacies(
    @Query() query: PublicPharmaciesQueryDto,
  ): Promise<ListResponse<PublicPharmacy>> {
    return this.service.listPharmacies(query);
  }

  @ApiOperation({
    summary:
      'Search a medicine name and list the pharmacies that have it available; returns pharmacy fields only',
    description:
      'No sign-in. A pharmacy is returned once if its subscription is ACTIVE and one batch of a matching medicine has a quantity above 0 and an expiry date not before today in Asia/Amman.',
  })
  @ApiOkResponse(PUBLIC_RESULT)
  @ApiErrors(
    {
      status: 400,
      description:
        'q is missing or empty after trimming, onDutyNow is not exactly true or false, a filter is repeated, or the query has an unknown field.',
      message: ['q is required and cannot be empty'],
    },
    DATA_UNAVAILABLE,
  )
  @Get('medicines')
  searchMedicines(
    @Query() query: MedicineSearchQueryDto,
  ): Promise<ListResponse<PublicPharmacy>> {
    return this.service.searchMedicines(query);
  }
}
