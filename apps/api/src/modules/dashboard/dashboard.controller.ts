import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Pharmacist Dashboard') 
@Controller('pharmacist/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get dashboard metrics and indicators for the logged-in pharmacist' }) // وصف مختصر للعملية
  @ApiResponse({ 
    status: 200, 
    description: 'Returns calculated inventory indicators and totals scoped to the pharmacy.',
    schema: {
      example: {
        totalAvailableUnits: 150,
        totalAvailableValue: 1250.50,
        expiringBatchesCount: 2,
        lowStockMedicinesCount: 3,
        expiredBatchesCount: 1,
        totalWasteValue: 45.00
      }
    }
  })
  async getDashboard(@Req() req: any) {
    const pharmacyId = req.user?.pharmacyId || 'local-test-pharmacy-id';

    return this.dashboardService.getDashboardData(pharmacyId);
  }
}