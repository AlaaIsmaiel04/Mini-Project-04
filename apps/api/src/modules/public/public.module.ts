import { Module } from '@nestjs/common';
import { PharmacyModule } from '../pharmacy/pharmacy.module';
import {
  MEDICINE_AVAILABILITY_STORE,
  TemporaryUnavailableMedicineAvailabilityStore,
} from './stores/medicine-availability.store';

/** Hamid: active subscription + eligible stock, strict public allowlist. */
@Module({
  imports: [PharmacyModule],
  providers: [
    // TEMPORARY: replace when Mustafa/Shiam merge.
    {
      provide: MEDICINE_AVAILABILITY_STORE,
      useClass: TemporaryUnavailableMedicineAvailabilityStore,
    },
  ],
})
export class PublicModule {}
