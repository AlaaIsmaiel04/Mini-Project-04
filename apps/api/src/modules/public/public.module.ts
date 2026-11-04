import { Module } from '@nestjs/common';
import { PharmacyModule } from '../pharmacy/pharmacy.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import {
  MEDICINE_AVAILABILITY_STORE,
  TemporaryUnavailableMedicineAvailabilityStore,
} from './stores/medicine-availability.store';

/** Hamid: active subscription + eligible stock, strict public allowlist. */
@Module({
  imports: [PharmacyModule],
  controllers: [PublicController],
  providers: [
    PublicService,
    // TEMPORARY: replace when Mustafa/Shiam merge.
    {
      provide: MEDICINE_AVAILABILITY_STORE,
      useClass: TemporaryUnavailableMedicineAvailabilityStore,
    },
  ],
})
export class PublicModule {}
