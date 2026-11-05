// datetime-local uses the user's device timezone. Keep the UTC offset explicit on the wire.
export function localDutyInput(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error('Enter valid duty dates and times.');
  const date = new Date(value);
  if (
    !Number.isFinite(date.getTime()) ||
    toLocalDateTime(date.toISOString()) !== value
  )
    throw new Error('Enter valid duty dates and times.');
  return date.toISOString();
}
export function toLocalDateTime(instant: string): string {
  const d = new Date(instant);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function dutyInput(start: string, end: string) {
  const startsAt = localDutyInput(start),
    endsAt = localDutyInput(end);
  const duration = Date.parse(endsAt) - Date.parse(startsAt);
  if (duration <= 0) throw new Error('Duty end must be after its start.');
  if (duration > 86400000)
    throw new Error('Duty periods must not exceed 24 hours.');
  return { startsAt, endsAt };
}
