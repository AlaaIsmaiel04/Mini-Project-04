import { ApiProperty } from '@nestjs/swagger';
import type {
  PharmacyProfile,
  ProfileResponse,
  SubscriptionStatus,
} from '@smartshelf/contracts';

const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  'ACTIVE',
  'EXPIRED',
  'SUSPENDED',
  'NONE',
];

// Response shapes for Swagger. The service returns plain contract objects.
export class PharmacyProfileDto implements PharmacyProfile {
  @ApiProperty({
    type: String,
    format: 'uuid',
    description: 'ID of your own pharmacy',
    example: '11111111-1111-4111-8111-111111111111',
  })
  id!: string;

  @ApiProperty({
    type: String,
    description: 'Set by the owner; it cannot be changed here',
    example: 'Central Pharmacy',
  })
  name!: string;

  @ApiProperty({
    type: String,
    description: 'Area used by the public filters',
    example: 'Downtown',
  })
  area!: string;

  @ApiProperty({
    type: String,
    description: 'Street address',
    example: '12 Main Street, Amman',
  })
  address!: string;

  @ApiProperty({
    type: String,
    description: 'Phone number',
    example: '+962 6 555 0100',
  })
  phone!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description:
      'Last change to a medicine or batch, in UTC; null if there has been none',
    example: '2026-11-04T15:30:00.000Z',
  })
  inventoryUpdatedAt!: string | null;
}

export class ProfileResponseDto implements ProfileResponse {
  @ApiProperty({
    type: PharmacyProfileDto,
    description: 'The pharmacy of the signed-in pharmacist',
  })
  pharmacy!: PharmacyProfileDto;

  @ApiProperty({
    enum: SUBSCRIPTION_STATUSES,
    description:
      'Effective subscription status. Anything except ACTIVE makes the pharmacy read-only and hides it from public results.',
    example: 'ACTIVE',
  })
  subscriptionStatus!: SubscriptionStatus;
}
