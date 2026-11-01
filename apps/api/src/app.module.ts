import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { OwnerModule } from './modules/owner/owner.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PharmacyModule } from './modules/pharmacy/pharmacy.module';
import { PublicModule } from './modules/public/public.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    OwnerModule,
    InventoryModule,
    DashboardModule,
    PharmacyModule,
    PublicModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
