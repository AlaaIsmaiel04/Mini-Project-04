import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import type { LoginResponse, SessionUser } from '@smartshelf/contracts';
import type { JwtClaims } from '../../common/security';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponse> {
    const account = await this.prisma.account.findUnique({
      where: { email: dto.email },
    });
    if (!account || !(await compare(dto.password, account.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    const user: SessionUser = {
      id: account.id,
      email: account.email,
      role: account.role,
      pharmacyId: account.pharmacyId,
    };
    const claims: JwtClaims = {
      sub: user.id,
      role: user.role,
      pharmacyId: user.pharmacyId,
    };
    const accessToken = await this.jwt.signAsync(claims);
    this.logger.log(`Signed in account ${user.id}`);
    return { accessToken, user };
  }
}
