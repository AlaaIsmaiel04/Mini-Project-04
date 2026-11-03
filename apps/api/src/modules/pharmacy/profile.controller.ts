import {
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ProfileResponse } from '@smartshelf/contracts';
import {
  CurrentPharmacist,
  type PharmacistActor,
  TemporaryPharmacistGuard,
} from './adapters/temporary-auth.adapter';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileRejectionFilter } from './profile-rejection.filter';
import { ProfileService } from './profile.service';

@ApiTags('pharmacist')
@ApiBearerAuth()
// TEMPORARY: replace when Mustafa/Shiam merge.
@UseGuards(TemporaryPharmacistGuard)
@Controller('pharmacist/profile')
export class ProfileController {
  constructor(
    @Inject(ProfileService) private readonly profiles: ProfileService,
  ) {}

  @ApiOperation({
    summary: 'Read own pharmacy profile; allowed for inactive subscriptions',
  })
  @Get()
  getProfile(
    @CurrentPharmacist() actor: PharmacistActor,
  ): Promise<ProfileResponse> {
    return this.profiles.getOwnProfile(actor);
  }

  @ApiOperation({
    summary: 'Update own area, address and phone; requires ACTIVE subscription',
  })
  @UseFilters(ProfileRejectionFilter)
  @Patch()
  updateProfile(
    @CurrentPharmacist() actor: PharmacistActor,
    @Body() input: UpdateProfileDto,
  ): Promise<ProfileResponse> {
    return this.profiles.updateOwnProfile(actor, input);
  }
}
