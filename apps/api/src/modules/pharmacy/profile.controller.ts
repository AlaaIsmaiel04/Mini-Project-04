import {
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { ProfileResponse } from '@smartshelf/contracts';
import {
  CurrentPharmacist,
  type PharmacistActor,
  JwtPharmacistGuard,
} from './adapters/jwt-pharmacist.guard';
import {
  ApiErrors,
  CHANGE_FORBIDDEN,
  SERVER_ERROR,
  type DocumentedError,
  NOT_A_PHARMACIST,
  NOT_SIGNED_IN,
} from './api-errors';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PHARMACY_NOT_FOUND, ProfileService } from './profile.service';
import { RejectedChangeFilter } from './rejected-change.filter';

const PROFILE_NOT_FOUND: DocumentedError = {
  status: 404,
  description: 'The pharmacy of the signed-in account no longer exists.',
  message: PHARMACY_NOT_FOUND,
};

@ApiTags('pharmacist')
@ApiBearerAuth()
// Compatibility guard delegates authentication to the shared JWT guard.
@UseGuards(JwtPharmacistGuard)
@Controller('pharmacist/profile')
export class ProfileController {
  constructor(
    @Inject(ProfileService) private readonly profiles: ProfileService,
  ) {}

  @ApiOperation({
    summary: 'Read own pharmacy profile; allowed for inactive subscriptions',
    description:
      'The pharmacy comes from the signed-in account, never from the request.',
  })
  @ApiOkResponse({
    type: ProfileResponseDto,
    description: 'Your pharmacy and its effective subscription status.',
  })
  @ApiErrors(NOT_SIGNED_IN, NOT_A_PHARMACIST, PROFILE_NOT_FOUND, SERVER_ERROR)
  @Get()
  getProfile(
    @CurrentPharmacist() actor: PharmacistActor,
  ): Promise<ProfileResponse> {
    return this.profiles.getOwnProfile(actor);
  }

  @ApiOperation({
    summary: 'Update own area, address and phone; requires ACTIVE subscription',
    description:
      'All three fields are required. The pharmacy comes from the signed-in account, never from the request.',
  })
  @ApiOkResponse({
    type: ProfileResponseDto,
    description: 'Saved. Returns your updated pharmacy.',
  })
  @ApiErrors(
    {
      status: 400,
      description:
        'A field is missing or invalid, or the body has an unknown field such as name or pharmacyId. Nothing is saved.',
      message: ['property name should not exist'],
    },
    NOT_SIGNED_IN,
    CHANGE_FORBIDDEN,
    PROFILE_NOT_FOUND,
    SERVER_ERROR,
  )
  @UseFilters(RejectedChangeFilter)
  @Patch()
  updateProfile(
    @CurrentPharmacist() actor: PharmacistActor,
    @Body() input: UpdateProfileDto,
  ): Promise<ProfileResponse> {
    return this.profiles.updateOwnProfile(actor, input);
  }
}
