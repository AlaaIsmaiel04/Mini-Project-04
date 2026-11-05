import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { CLOCK, SystemClock } from '../pharmacy/clock';
@Module({
  controllers: [DashboardController],
  providers: [DashboardService, { provide: CLOCK, useClass: SystemClock }],
})
export class DashboardModule {}
