import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { isUUID } from 'class-validator';
import type { Request } from 'express';
import type { Role, SessionUser } from '@smartshelf/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { businessDate } from './business-date';
import { effectiveSubscriptionStatus } from './subscription-status';

export type Actor = SessionUser;
export type ActorRequest = Request & { actor: Actor };
export interface JwtClaims {
  sub: string;
  role: Role;
  pharmacyId: string | null;
}
export const Roles = (...roles: Role[]) => SetMetadata('staff-roles', roles);
type ResourceKind = 'medicine' | 'batch' | 'duty';
const rejectionLogger = new Logger('AccessControl');

// Deliberate allowlist: never pass requests, headers, bodies, emails or tokens.
export function logAccessRejection(
  reason:
    | 'wrong_role'
    | 'invalid_pharmacy_link'
    | 'resource_not_owned_or_missing'
    | 'inactive_subscription',
  actor: Actor,
  details: {
    resourceKind?: ResourceKind;
    resourceId?: string;
    subscriptionStatus?: string;
  } = {},
) {
  rejectionLogger.warn(
    JSON.stringify({
      event: 'access_rejected',
      reason,
      actorId: actor.id,
      role: actor.role,
      pharmacyId: actor.pharmacyId,
      resourceKind: details.resourceKind,
      resourceId:
        details.resourceId && isUUID(details.resourceId)
          ? details.resourceId
          : undefined,
      subscriptionStatus: details.subscriptionStatus,
    }),
  );
}
export const OwnResource = (kind: ResourceKind) =>
  SetMetadata('owned-resource', kind);

export function requirePharmacy(actor: Actor): string {
  if (actor.role !== 'PHARMACIST' || !actor.pharmacyId) {
    logAccessRejection('invalid_pharmacy_link', actor);
    throw new ForbiddenException(
      'Requires a pharmacist linked to one pharmacy.',
    );
  }
  return actor.pharmacyId;
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

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>('staff-roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    const actor = context.switchToHttp().getRequest<ActorRequest>().actor;
    if (!actor) throw new UnauthorizedException('Sign in first.');
    if (roles && !roles.includes(actor.role)) {
      logAccessRejection('wrong_role', actor);
      throw new ForbiddenException('This role cannot access this endpoint.');
    }
    return true;
  }
}

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const kind = this.reflector.getAllAndOverride<ResourceKind>(
      'owned-resource',
      [context.getHandler(), context.getClass()],
    );
    if (!kind) return true;
    const request = context.switchToHttp().getRequest<ActorRequest>();
    const pharmacyId = requirePharmacy(request.actor);
    const id = request.params.id;
    // Guards run before parameter pipes, so validate the UUID here as well.
    if (typeof id !== 'string' || !isUUID(id))
      throw new BadRequestException('Invalid UUID.');
    let exists: { id: string } | null;
    if (kind === 'medicine') {
      exists = await this.prisma.medicine.findFirst({
        where: { id, pharmacyId },
        select: { id: true },
      });
    } else if (kind === 'batch') {
      exists = await this.prisma.batch.findFirst({
        where: { id, medicine: { pharmacyId } },
        select: { id: true },
      });
    } else {
      exists = await this.prisma.dutyPeriod.findFirst({
        where: { id, pharmacyId },
        select: { id: true },
      });
    }
    if (!exists) {
      logAccessRejection('resource_not_owned_or_missing', request.actor, {
        resourceKind: kind,
        resourceId: id,
      });
      throw new NotFoundException('Record not found in your pharmacy.');
    }
    return true;
  }
}

@Injectable()
export class ActiveSubscriptionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const actor = context.switchToHttp().getRequest<ActorRequest>().actor;
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { id: requirePharmacy(actor) },
      include: { subscription: true },
    });
    if (!pharmacy) throw new NotFoundException('Pharmacy not found.');
    const status = effectiveSubscriptionStatus(
      pharmacy.subscription,
      businessDate(),
    );
    if (status !== 'ACTIVE') {
      logAccessRejection('inactive_subscription', actor, {
        subscriptionStatus: status,
      });
      throw new ForbiddenException(
        `Subscription is ${status}; inventory is read-only.`,
      );
    }
    return true;
  }
}
