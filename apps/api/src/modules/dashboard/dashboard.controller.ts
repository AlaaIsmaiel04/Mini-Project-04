import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  type ActorRequest,
} from '../../common/security';
import { DashboardService } from './dashboard.service';
import { DashboardResponseDto } from './dashboard.dto';
@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PHARMACIST')
@Controller('pharmacist/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}
  @Get()
  @ApiOperation({
    summary: 'Own pharmacy dashboard; inactive subscriptions may read',
  })
  @ApiOkResponse({ type: DashboardResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid or expired token.',
  })
  @ApiForbiddenResponse({ description: 'Requires a pharmacist account.' })
  @ApiNotFoundResponse({ description: 'Pharmacy no longer exists.' })
  @ApiInternalServerErrorResponse({
    description: 'Database unavailable; never returns sample metrics.',
  })
  getDashboard(@Req() request: ActorRequest) {
    return this.dashboardService.getDashboardData(request.actor);
  }
}
