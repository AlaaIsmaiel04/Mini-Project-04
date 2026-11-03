import { Module } from '@nestjs/common';
import {
  SUBSCRIPTION_STATUS,
  TemporarySubscriptionStatusAdapter,
} from './adapters/temporary-subscription-status.adapter';
import {
  TemporaryUnavailableDutyPeriodStore,
  TemporaryUnavailablePharmacyStore,
} from './adapters/temporary-unavailable-stores';
import { CLOCK, SystemClock } from './clock';
import { DUTY_PERIOD_STORE } from './stores/duty-period.store';
import { PHARMACY_STORE } from './stores/pharmacy.store';

/** Hamid: own profile and duty-period persistence/validation. */
@Module({
  providers: [
    { provide: CLOCK, useClass: SystemClock },
    // TEMPORARY: replace when Mustafa/Shiam merge.
    { provide: PHARMACY_STORE, useClass: TemporaryUnavailablePharmacyStore },
    {
      provide: DUTY_PERIOD_STORE,
      useClass: TemporaryUnavailableDutyPeriodStore,
    },
    {
      provide: SUBSCRIPTION_STATUS,
      useClass: TemporarySubscriptionStatusAdapter,
    },
  ],
  exports: [CLOCK, PHARMACY_STORE, DUTY_PERIOD_STORE, SUBSCRIPTION_STATUS],
})
export class PharmacyModule {}
