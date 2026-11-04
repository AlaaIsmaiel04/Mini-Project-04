import { ApiProperty } from '@nestjs/swagger';
import type {
  BatchIndicator,
  Indicator,
  SubscriptionStatus,
} from '@smartshelf/contracts';

export class BatchResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() batchNumber!: string;
  @ApiProperty({ type: 'integer', minimum: 0 }) quantity!: number;
  @ApiProperty({ example: '2027-08-20' }) expiryDate!: string;
  @ApiProperty() storageLocation!: string;
  @ApiProperty({ example: '2.50' }) unitCost!: string;
  @ApiProperty({ type: String, nullable: true }) barcode!: string | null;
  @ApiProperty({ enum: ['EXPIRED', 'EXPIRING_SOON'], isArray: true })
  indicators!: BatchIndicator[];
}
export class MedicineResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty() scientificName!: string;
  @ApiProperty() category!: string;
  @ApiProperty() reorderThreshold!: number;
  @ApiProperty({ type: 'integer' }) availableQuantity!: number;
  @ApiProperty({
    enum: ['HEALTHY', 'EXPIRING_SOON', 'LOW_STOCK', 'EXPIRED'],
    isArray: true,
  })
  indicators!: Indicator[];
  @ApiProperty({ type: [BatchResponseDto] }) batches!: BatchResponseDto[];
}
export class InventoryResponseDto {
  @ApiProperty({ type: [MedicineResponseDto] }) items!: MedicineResponseDto[];
  @ApiProperty({ type: 'integer' }) total!: number;
  @ApiProperty({ enum: ['ACTIVE', 'EXPIRED', 'SUSPENDED', 'NONE'] })
  subscriptionStatus!: SubscriptionStatus;
}
