import { BadRequestException } from '@nestjs/common';

export function businessDate(
  now = new Date(),
  zone = process.env.BUSINESS_TIME_ZONE ?? 'Asia/Amman',
): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function parseCalendarDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) {
    throw new BadRequestException('Use a real calendar date: YYYY-MM-DD.');
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException('Use a real calendar date: YYYY-MM-DD.');
  }
  return date;
}

export function calendarString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addCalendarDays(day: string, days: number): string {
  const date = parseCalendarDate(day);
  date.setUTCDate(date.getUTCDate() + days);
  return calendarString(date);
}
