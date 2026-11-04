import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { isUUID } from 'class-validator';
import type { Request } from 'express';
import type { Role, SessionUser } from '@smartshelf/contracts';
import { PrismaService } from '../prisma/prisma.service';

export type Actor = SessionUser;
export type ActorRequest = Request & { actor: Actor };
export interface JwtClaims {
  sub: string;
  role: Role;
  pharmacyId: string | null;
}
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ActorRequest>();
    const match = /^Bearer ([^\s]+)$/.exec(request.headers.authorization ?? '');
    if (!match) throw new UnauthorizedException('Missing or invalid token.');
    let claims: JwtClaims;
    try {
      claims = await this.jwt.verifyAsync<JwtClaims>(match[1], {
        algorithms: ['HS256'],
      });
      if (
        !isUUID(claims.sub) ||
        !['OWNER', 'PHARMACIST'].includes(claims.role) ||
        !(claims.pharmacyId === null || isUUID(claims.pharmacyId))
      ) {
        throw new Error('Invalid claims');
      }
    } catch {
      throw new UnauthorizedException('Missing, invalid or expired token.');
    }
    // Read CURRENT role and pharmacy; do not authorize from stale JWT claims.
    // Database outages remain server errors, rather than being disguised as 401.
    const account = await this.prisma.account.findUnique({
      where: { id: claims.sub },
      select: { id: true, email: true, role: true, pharmacyId: true },
    });
    if (!account) throw new UnauthorizedException('Account no longer exists.');
    if (
      (account.role === 'OWNER' && account.pharmacyId !== null) ||
      (account.role === 'PHARMACIST' && account.pharmacyId === null)
    ) {
      throw new UnauthorizedException('Invalid account link.');
    }
    request.actor = account;
    return true;
  }
}
