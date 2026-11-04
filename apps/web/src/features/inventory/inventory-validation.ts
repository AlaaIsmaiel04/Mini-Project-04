export function nonNegativeNumber(value: string, label: string): number {
  const number = Number(value);
  if (!value.trim() || !Number.isFinite(number) || number < 0) {
    throw new Error(`${label} must be zero or more.`);
  }
  return number;
}

export function wholeNumber(value: string, label: string): number {
  const number = Number(value);
  if (!value.trim() || !Number.isSafeInteger(number) || number < 0) {
    throw new Error(`${label} must be a whole number of zero or more.`);
  }
  return number;
}

export function requiredText(value: string, label: string): string {
  if (!value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
}

export function calendarDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error('Enter a valid expiry date.');
  }
  return value;
}

export function decimalCost(value: string): string {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) {
    throw new Error(
      'Unit cost must be zero or more with at most two decimal places.',
    );
  }
  return value.trim();
}
