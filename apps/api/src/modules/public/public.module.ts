import { Module } from '@nestjs/common';
import { PharmacyModule } from '../pharmacy/pharmacy.module';
import { PrismaMedicineAvailabilityStore } from './adapters/prisma-medicine-availability.store';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { MEDICINE_AVAILABILITY_STORE } from './stores/medicine-availability.store';

/** Hamid: active subscription + eligible stock, strict public allowlist. */
@Module({
  imports: [PharmacyModule],
  controllers: [PublicController],
  providers: [
    PublicService,
    {
      provide: MEDICINE_AVAILABILITY_STORE,
      useClass: PrismaMedicineAvailabilityStore,
    },
  ],
})
export class PublicModule {}
