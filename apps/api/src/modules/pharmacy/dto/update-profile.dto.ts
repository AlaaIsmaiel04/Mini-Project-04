import { ApiProperty } from '@nestjs/swagger';
import type { UpdateProfileInput } from '@smartshelf/contracts';
import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

// 7 to 20 characters of digits, spaces, dashes and brackets after an optional +, with
// at least 7 digits.
const PHONE = /^(?=(?:\D*\d){7})\+?[0-9 ()-]{7,20}$/;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// name and pharmacyId are absent on purpose: the global ValidationPipe rejects them.
export class UpdateProfileDto implements UpdateProfileInput {
  @ApiProperty({
    type: String,
    minLength: 2,
    maxLength: 80,
    description:
      'Area used by the public filters. Surrounding spaces are removed first.',
    example: 'Downtown',
  })
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  area!: string;

  @ApiProperty({
    type: String,
    minLength: 5,
    maxLength: 200,
    description: 'Street address. Surrounding spaces are removed first.',
    example: '12 Main Street, Amman',
  })
  @Transform(trim)
  @IsString()
  @Length(5, 200)
  address!: string;

  @ApiProperty({
    type: String,
    minLength: 7,
    maxLength: 21,
    pattern: PHONE.source,
    description:
      'Digits, spaces, dashes and brackets with at least 7 digits, up to 20 characters after an optional leading +. Surrounding spaces are removed first.',
    example: '+962 6 555 0100',
  })
  @Transform(trim)
  @IsString()
  @Matches(PHONE, { message: 'phone must be a valid phone number' })
  phone!: string;
}
