import {
  type ArgumentsHost,
  BadRequestException,
  Catch,
  type ExceptionFilter,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

type RequestWithActor = Request & { actor?: { pharmacyId?: string | null } };

/**
 * Validation runs before the service, so rejected requests are logged here. Only the
 * pharmacy is logged: submitted values and even field names come from the caller.
 */
@Catch(BadRequestException)
export class RejectedChangeFilter implements ExceptionFilter<BadRequestException> {
  private readonly logger = new Logger(RejectedChangeFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const pharmacyId = http.getRequest<RequestWithActor>().actor?.pharmacyId;

    this.logger.warn(
      `Change rejected for pharmacy ${pharmacyId}: invalid input`,
    );
    http
      .getResponse<Response>()
      .status(exception.getStatus())
      .json(exception.getResponse());
  }
}
