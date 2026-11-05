import { ValidateBy, type ValidationOptions } from 'class-validator';

const OFFSET_INSTANT =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|[+-](\d{2}):(\d{2}))$/;

const MAX_OFFSET_MINUTES = 14 * 60;

/**
 * Parses an ISO 8601 instant that has an explicit offset or Z.
 * The calendar date is checked by hand because Date rolls 30 February into March.
 */
export function parseOffsetInstant(value: string): Date | null {
  const match = OFFSET_INSTANT.exec(value);
  if (!match) return null;

  const [year, month, day, hour, minute, second, offsetHour, offsetMinute] =
    match.slice(1).map((part) => Number(part ?? 0));
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    calendarDate.getUTCFullYear() === year &&
    calendarDate.getUTCMonth() === month - 1 &&
    calendarDate.getUTCDate() === day;

  if (!isRealDate || hour > 23 || minute > 59 || second > 59) return null;
  if (
    offsetMinute > 59 ||
    offsetHour * 60 + offsetMinute > MAX_OFFSET_MINUTES
  ) {
    return null;
  }

  return new Date(value);
}

export function IsOffsetInstant(options?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isOffsetInstant',
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && parseOffsetInstant(value) !== null,
        defaultMessage: () =>
          '$property must be an ISO 8601 date-time with an offset or Z',
      },
    },
    options,
  );
}
