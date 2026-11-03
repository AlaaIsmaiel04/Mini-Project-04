import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

// TEMPORARY: replace when Mustafa/Shiam merge.
// Mustafa owns JWT verification and the role guards. Until they are merged,
// no request can authenticate here: there is no header, token or default user.

export interface PharmacistActor {
  userId: string;
  role: 'PHARMACIST';
  pharmacyId: string;
}

@Injectable()
export class TemporaryPharmacistGuard implements CanActivate {
  canActivate(): boolean {
    throw new UnauthorizedException('Authentication is not available yet');
  }
}

export function readPharmacistActor(request: {
  actor?: { userId?: string; role?: string; pharmacyId?: string | null };
}): PharmacistActor {
  const actor = request.actor;
  if (!actor?.userId || !actor.role) {
    throw new UnauthorizedException('A pharmacist sign-in is required');
  }
  if (actor.role !== 'PHARMACIST') {
    throw new ForbiddenException('Only pharmacists can use this endpoint');
  }
  if (!actor.pharmacyId) {
    throw new UnauthorizedException('A pharmacist sign-in is required');
  }
  return {
    userId: actor.userId,
    role: actor.role,
    pharmacyId: actor.pharmacyId,
  };
}

export const CurrentPharmacist = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    readPharmacistActor(context.switchToHttp().getRequest()),
);
