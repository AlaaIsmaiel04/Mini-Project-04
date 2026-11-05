import { ApiProperty } from '@nestjs/swagger';
import type { Role } from '@smartshelf/contracts';

export class SessionUserDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ enum: ['OWNER', 'PHARMACIST'] }) role!: Role;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) pharmacyId!:
    string | null;
}
export class LoginResponseDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty({ type: SessionUserDto }) user!: SessionUserDto;
}
