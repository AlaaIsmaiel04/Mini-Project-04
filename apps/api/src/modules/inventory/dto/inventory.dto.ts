import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
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
