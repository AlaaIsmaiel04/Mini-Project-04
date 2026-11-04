import { featureArabic } from './feature-messages';

// English keys are also the default copy. Add matching Arabic copy here.
export const arabic = {
  ...featureArabic,
  'SmartShelf home': 'الصفحة الرئيسية لسمارت شيلف',
  'Owner dashboard': 'لوحة المالك',
  Dashboard: 'لوحة التحكم',
  Inventory: 'المخزون',
  'Profile & duty': 'الملف والمناوبات',
  'Owner workspace': 'مساحة المالك',
  'Medicine Search': 'البحث عن دواء',
  Pharmacies: 'الصيدليات',
  'Sign in': 'تسجيل الدخول',
  'Sign out': 'تسجيل الخروج',
  'Skip to content': 'انتقل إلى المحتوى',
  'Toggle navigation': 'إظهار قائمة التنقل أو إخفاؤها',
  Menu: 'القائمة',
  'PHARMACY WORKSPACE': 'مساحة إدارة الصيدلية',
  'Main navigation': 'التنقل الرئيسي',
  'Your workspace': 'مساحة عملك',
  'Safer shelves.': 'مخزون أكثر أماناً.',
  'Every day.': 'كل يوم.',
  'Review stock and expiry dates before your next shift.':
    'راجع المخزون وتواريخ الصلاحية قبل مناوبتك القادمة.',
  'Sample workspace': 'مساحة تجريبية',
  'Platform owner': 'مالك المنصة',
  Pharmacist: 'صيدلي',
  'Platform management': 'إدارة المنصة',
  'Pharmacy workspace': 'مساحة الصيدلية',
  'SmartShelf — Team 2': 'سمارت شيلف — الفريق ٢',
  'Pharmacy management & medicine search': 'إدارة الصيدليات والبحث عن الأدوية',
  Language: 'اللغة',
  'Welcome back to SmartShelf.': 'مرحباً بعودتك إلى سمارت شيلف.',
  'One account. A workspace built around your role.':
    'حساب واحد ومساحة عمل تناسب دورك.',
  'Clearer decisions.': 'قرارات أوضح.',
  'Manage your pharmacy, keep track of stock, and help people find the medicine they need.':
    'أدر صيدليتك وتابع مخزونك وساعد الناس في العثور على الدواء الذي يحتاجونه.',
  'For owners and pharmacists. Public medicine search needs no account.':
    'للمالك والصيادلة. البحث العام عن الأدوية لا يحتاج إلى حساب.',
  'Staff sign in': 'تسجيل دخول الموظفين',
  'Sign in to manage your workspace.': 'سجّل الدخول لإدارة مساحة عملك.',
  'Please sign in to open your workspace.':
    'يرجى تسجيل الدخول لفتح مساحة عملك.',
  Email: 'البريد الإلكتروني',
  Password: 'كلمة المرور',
  'Signing in...': 'جارٍ تسجيل الدخول...',
  'Accounts are created by the platform owner. Contact your owner if you need help signing in.':
    'ينشئ مالك المنصة الحسابات. تواصل معه إذا احتجت إلى مساعدة في تسجيل الدخول.',
  'Unable to sign in. Please try again.':
    'تعذّر تسجيل الدخول. يرجى المحاولة مرة أخرى.',
  'Your session has expired. Please sign in again.':
    'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.',
  'The sign-in API is not available yet.': 'خدمة تسجيل الدخول غير متاحة بعد.',
  'The server returned an invalid sign-in response.':
    'أعاد الخادم استجابة غير صالحة لتسجيل الدخول.',
  'Sign-in was cancelled. Please try again.':
    'أُلغي تسجيل الدخول. يرجى المحاولة مرة أخرى.',
  'The medicine search page will appear here.':
    'ستظهر صفحة البحث عن الأدوية هنا.',
  'Pharmacist dashboard': 'لوحة تحكم الصيدلي',
  'Pharmacy profile & duty': 'ملف الصيدلية والمناوبات',
  'Loading preview…': 'جارٍ تحميل المعاينة…',
  'Page not found': 'الصفحة غير موجودة',
  'Return to medicine search': 'العودة إلى البحث عن دواء',
} as const;

export type MessageKey = keyof typeof arabic;
export type MessageParams = Record<string, string | number>;
export type MessageValue = string | { key: MessageKey; params: MessageParams };
export type Language = 'en' | 'ar';
export const LANGUAGE_STORAGE_KEY = 'smartshelf.language';

export function translate(
  language: Language,
  message: string,
  params?: MessageParams,
): string {
  const template =
    language === 'ar' && Object.hasOwn(arabic, message)
      ? arabic[message as MessageKey]
      : message;
  // Interpolate only explicit message parameters, never HTML or dictionary keys.
  // Isolate mixed-language values within Arabic sentences without changing data.
  return params
    ? template.replace(/\{(\w+)\}/g, (token, key: string) =>
        Object.hasOwn(params, key)
          ? language === 'ar'
            ? `\u2068${params[key]}\u2069`
            : String(params[key])
          : token,
      )
    : template;
}

export function readLanguage(): Language {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

export function applyDocumentLanguage(language: Language) {
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
}
