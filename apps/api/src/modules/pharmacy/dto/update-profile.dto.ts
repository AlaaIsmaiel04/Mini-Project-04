import type { UpdateProfileInput } from '@smartshelf/contracts';
import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

// 7 to 20 characters of digits, spaces, dashes and brackets, with at least 7 digits.
const PHONE = /^(?=(?:\D*\d){7})\+?[0-9 ()-]{7,20}$/;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// name and pharmacyId are absent on purpose: the global ValidationPipe rejects them.
export class UpdateProfileDto implements UpdateProfileInput {
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  area!: string;

  @Transform(trim)
  @IsString()
  @Length(5, 200)
  address!: string;

  @Transform(trim)
  @IsString()
  @Matches(PHONE, { message: 'phone must be a valid phone number' })
  phone!: string;
}
