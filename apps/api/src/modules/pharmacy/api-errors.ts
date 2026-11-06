import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, ApiResponse } from '@nestjs/swagger';
import type { ApiError } from '@smartshelf/contracts';
import { INACTIVE_SUBSCRIPTION_REASONS } from './adapters/subscription-status-reader';

export class ApiErrorDto implements ApiError {
  @ApiProperty({ type: Number, description: 'HTTP status code' })
  statusCode!: number;

  // The union has no single type. Swagger leaves the type out when oneOf is present,
  // but building the schema still needs one, and tsx emits no metadata to supply it.
  @ApiProperty({
    type: Array,
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    description: 'The reason, or a list of reasons for invalid input',
  })
  message!: string | string[];

  @ApiPropertyOptional({ type: String, description: 'HTTP status name' })
  error?: string;
}

type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 500;

// Nest answers an unexpected failure with no status name.
const STATUS_NAMES: Partial<Record<ErrorStatus, string>> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
};

export interface DocumentedError {
  status: ErrorStatus;
  // When this error happens.
  description: string;
  // What the message says in the example response.
  message: string | string[];
}

/** Documents error responses with the shared error shape and a realistic example. */
export function ApiErrors(...errors: DocumentedError[]) {
  return applyDecorators(
    ...errors.map(({ status, description, message }) =>
      ApiResponse({
        status,
        description,
        type: ApiErrorDto,
        example: {
          statusCode: status,
          message,
          ...(STATUS_NAMES[status] ? { error: STATUS_NAMES[status] } : {}),
        },
      }),
    ),
  );
}

export const NOT_SIGNED_IN: DocumentedError = {
  status: 401,
  description: 'The bearer token is missing, invalid or expired.',
  message: 'Missing or invalid token.',
};

export const NOT_A_PHARMACIST: DocumentedError = {
  status: 403,
  description: 'The signed-in account is not a pharmacist.',
  message: 'Requires a pharmacist linked to one pharmacy.',
};

export const CHANGE_FORBIDDEN: DocumentedError = {
  status: 403,
  description:
    'The signed-in account is not a pharmacist, or the pharmacy subscription is not ACTIVE. The message gives the reason and nothing is changed.',
  message: INACTIVE_SUBSCRIPTION_REASONS.EXPIRED,
};

export const SERVER_ERROR: DocumentedError = {
  status: 500,
  description:
    'The database is down or something else failed on the server. Nothing is changed, and neither partial data nor any detail is returned.',
  message: 'Internal server error',
};
