import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class MedicineDto {
  @ApiProperty({ example: 'Panadol' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  displayName!: string;

  @ApiProperty({ example: 'Paracetamol' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  scientificName!: string;

  @ApiProperty({ example: 'Pain relief' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  category!: string;

  @ApiProperty({ example: 10, minimum: 0 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  reorderThreshold!: number;
}

export class InventoryQueryDto {
  @ApiPropertyOptional({ example: 'para' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    enum: ['HEALTHY', 'EXPIRING_SOON', 'LOW_STOCK', 'EXPIRED'],
  })
  @IsOptional()
  @IsIn(['HEALTHY', 'EXPIRING_SOON', 'LOW_STOCK', 'EXPIRED'])
  status?: 'HEALTHY' | 'EXPIRING_SOON' | 'LOW_STOCK' | 'EXPIRED';
}

// Both creation and PATCH require all three editable fields (agreed contract).
export class UpdateBatchDto {
  @ApiProperty({ example: 20, minimum: 0, maximum: 2147483647 })
  @IsInt()
  @Min(0)
  @Max(2147483647)
  quantity!: number;

  @ApiProperty({ example: '2027-08-20', pattern: '^\\d{4}-\\d{2}-\\d{2}$' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  expiryDate!: string;

  @ApiProperty({ example: 'Shelf A' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  storageLocation!: string;
}

// Inheritance in this direction keeps immutable creation fields OUT of PATCH.
export class CreateBatchDto extends UpdateBatchDto {
  @ApiProperty({ example: 'B-001' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  batchNumber!: string;

  @ApiProperty({
    example: '2.50',
    description:
      'Nonnegative decimal string, up to 10 integer digits and 2 fractional digits',
  })
  @IsString()
  @Matches(/^\d{1,10}(\.\d{1,2})?$/)
  unitCost!: string;

  @ApiPropertyOptional({ example: '123456789' })
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(trim)
  @IsString()
  barcode?: string;
}
