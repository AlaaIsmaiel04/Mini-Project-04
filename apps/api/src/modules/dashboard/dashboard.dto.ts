import { ApiProperty } from '@nestjs/swagger';
import type { Indicator, SubscriptionStatus } from '@smartshelf/contracts';
class AttentionItemDto {
  @ApiProperty({ format: 'uuid' }) medicineId!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty({
    enum: ['HEALTHY', 'LOW_STOCK', 'EXPIRED', 'EXPIRING_SOON'],
    isArray: true,
  })
  indicators!: Indicator[];
}
export class DashboardResponseDto {
  @ApiProperty() pharmacyName!: string;
  @ApiProperty({ enum: ['ACTIVE', 'EXPIRED', 'SUSPENDED', 'NONE'] })
  subscriptionStatus!: SubscriptionStatus;
  @ApiProperty({ minimum: 0, type: 'integer' }) totalMedicines!: number;
  @ApiProperty({ minimum: 0, type: 'integer' }) totalUnits!: number;
  @ApiProperty({ example: '25.00' }) inventoryValue!: string;
  @ApiProperty({ minimum: 0, type: 'integer' }) expiringSoonBatchCount!: number;
  @ApiProperty({ minimum: 0, type: 'integer' }) lowStockMedicineCount!: number;
  @ApiProperty({ minimum: 0, type: 'integer' }) expiredBatchCount!: number;
  @ApiProperty({ example: '12.00' }) expectedWaste!: string;
  @ApiProperty({ type: [AttentionItemDto] })
  attentionItems!: AttentionItemDto[];
}
