import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { UnavailableDataAdapter } from './unavailable-data.adapter';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, UnavailableDataAdapter],
})
export class DashboardModule {}