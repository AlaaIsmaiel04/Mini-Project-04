import {
  JwtAuthGuard,
  requirePharmacy,
  type ActorRequest,
} from '../../../common/security';
import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Inject,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';

// Mustafa's JwtAuthGuard authenticates every request. This adds the pharmacist-only rule
// and adapts id -> userId, trusting nothing the caller supplies. A module booted without
// the shared guard refuses every request.

export interface PharmacistActor {
  userId: string;
  role: 'PHARMACIST';
  pharmacyId: string;
}

@Injectable()
export class JwtPharmacistGuard implements CanActivate {
  constructor(
    @Optional() @Inject(JwtAuthGuard) private readonly jwt?: JwtAuthGuard,
  ) {}
  canActivate(context?: ExecutionContext): boolean | Promise<boolean> {
    if (!this.jwt || !context)
      throw new UnauthorizedException('Authentication is not available yet');
    return this.authenticate(context);
  }
  private async authenticate(context: ExecutionContext): Promise<boolean> {
    await this.jwt!.canActivate(context);
    const request = context
      .switchToHttp()
      .getRequest<
        ActorRequest & { actor: ActorRequest['actor'] & { userId?: string } }
      >();
    requirePharmacy(request.actor);
    request.actor.userId = request.actor.id;
    return true;
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
