// TEMPORARY: replace when Mustafa/Shiam merge.
// Mustafa owns the shared business-date utility. Until it is merged this gives the
// same answer: the calendar date in Amman, whatever time zone the server runs in.

const amman = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Amman',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The calendar date (YYYY-MM-DD) in Asia/Amman at the given instant. */
export function toBusinessDate(instant: Date): string {
  const { year, month, day } = Object.fromEntries(
    amman.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  return `${year}-${month}-${day}`;
}
