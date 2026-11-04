import { Controller, Get, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { TemporaryAuthGuard } from './temporary-auth.guard';

@ApiTags('Pharmacist Dashboard')
@Controller('pharmacist/dashboard')
@UseGuards(TemporaryAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get dashboard metrics for logged-in pharmacist' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics.' })
  async getDashboard(@Req() req: any) {
    const pharmacyId = req.user?.pharmacyId;

    if (!pharmacyId) {
      throw new UnauthorizedException('Pharmacy ID could not be derived from authenticated user.');
    }

    return this.dashboardService.getDashboardData(pharmacyId);
  }
}