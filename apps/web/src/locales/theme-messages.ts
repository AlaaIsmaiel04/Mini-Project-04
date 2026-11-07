import type { Language } from './messages';

const themeEnglish = {
  Theme: 'Theme',
  system: 'System',
  light: 'Light',
  dark: 'Dark',
} as const;

export const themeArabic: Record<keyof typeof themeEnglish, string> = {
  Theme: 'المظهر',
  system: 'حسب الجهاز',
  light: 'فاتح',
  dark: 'داكن',
};

export function themeLabel(
  language: Language,
  key: keyof typeof themeEnglish,
): string {
  return language === 'ar' ? themeArabic[key] : themeEnglish[key];
}
