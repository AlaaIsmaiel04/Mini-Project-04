/**
 * Prisma's insensitive filters become ILIKE on PostgreSQL, where % and _ are wildcards and
 * \ escapes them. Text from a request is plain text, so all three must match literally.
 */
export function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, '\\$&');
}
