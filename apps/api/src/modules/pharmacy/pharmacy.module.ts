import {
  PrismaPharmacyStore,
  PrismaDutyPeriodStore,
  PrismaSubscriptionStatus,
} from './adapters/prisma-stores';
import { Module } from '@nestjs/common';
import { SUBSCRIPTION_STATUS } from './adapters/subscription-status-reader';
import { CLOCK, SystemClock } from './clock';
import { DutyPeriodController } from './duty-period.controller';
import { DutyPeriodService } from './duty-period.service';
import { PharmacyLock } from './pharmacy-lock';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { DUTY_PERIOD_STORE } from './stores/duty-period.store';
import { PHARMACY_STORE } from './stores/pharmacy.store';

/** Hamid: own profile and duty-period persistence/validation. */
@Module({
  controllers: [ProfileController, DutyPeriodController],
  providers: [
    ProfileService,
    DutyPeriodService,
    PharmacyLock,
    { provide: CLOCK, useClass: SystemClock },
    // Live Prisma stores use the shared database and subscription rules.
    { provide: PHARMACY_STORE, useClass: PrismaPharmacyStore },
    {
      provide: DUTY_PERIOD_STORE,
      useClass: PrismaDutyPeriodStore,
    },
    {
      provide: SUBSCRIPTION_STATUS,
      useClass: PrismaSubscriptionStatus,
    },
  ],
  exports: [CLOCK, PHARMACY_STORE, DUTY_PERIOD_STORE, SUBSCRIPTION_STATUS],
})
export class PharmacyModule {}
