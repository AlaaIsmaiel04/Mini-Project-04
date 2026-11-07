import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { themeArabic, themeLabel } from '../../locales/theme-messages';
import {
  applyDocumentTheme,
  readSystemTheme,
  readThemePreference,
  resolveTheme,
  saveThemePreference,
  THEME_BOOT_SCRIPT,
  THEME_STORAGE_KEY,
  watchSystemTheme,
} from './theme';

// Replaces browser globals for one test, including ones that throw when read.
function withGlobals(
  globals: Record<string, PropertyDescriptor>,
  run: () => void,
): void {
  const names = Object.keys(globals);
  const originals = names.map((name) =>
    Object.getOwnPropertyDescriptor(globalThis, name),
  );
  names.forEach((name) =>
    Object.defineProperty(globalThis, name, {
      configurable: true,
      ...globals[name],
    }),
  );
  try {
    run();
  } finally {
    names.forEach((name, index) => {
      const original = originals[index];
      if (original) Object.defineProperty(globalThis, name, original);
      else Reflect.deleteProperty(globalThis, name);
    });
  }
}

const blocked: PropertyDescriptor = {
  get() {
    throw new Error('Blocked');
  },
};
const storing = (stored: string | null): PropertyDescriptor => ({
  value: { getItem: () => stored },
});
const systemIs = (dark: boolean): PropertyDescriptor => ({
  value: () => ({ matches: dark }),
});

test('a saved light or dark preference is used; anything else follows the system', () => {
  for (const [stored, expected] of [
    ['light', 'light'],
    ['dark', 'dark'],
    ['invalid', 'system'],
    [null, 'system'],
  ] as const) {
    withGlobals({ localStorage: storing(stored) }, () =>
      assert.equal(readThemePreference(), expected),
    );
  }
});

test('blocked storage falls back to the system preference without throwing', () => {
  withGlobals({ localStorage: blocked, matchMedia: systemIs(true) }, () => {
    assert.equal(readThemePreference(), 'system');
    assert.equal(resolveTheme(readThemePreference()), 'dark');
    assert.doesNotThrow(() => saveThemePreference('dark'));
    assert.doesNotThrow(() => saveThemePreference('system'));
  });
});

test('the system preference is followed, and a missing matchMedia means light', () => {
  withGlobals({ matchMedia: systemIs(true) }, () => {
    assert.equal(resolveTheme('system'), 'dark');
    assert.equal(resolveTheme('light'), 'light');
  });
  withGlobals({ matchMedia: systemIs(false) }, () => {
    assert.equal(resolveTheme('system'), 'light');
    assert.equal(resolveTheme('dark'), 'dark');
  });
  withGlobals({ matchMedia: blocked }, () => {
    assert.equal(readSystemTheme(), 'light');
    assert.doesNotThrow(() => watchSystemTheme(() => undefined)());
  });
});

test('light and dark are stored; system stores nothing', () => {
  const calls: string[] = [];
  withGlobals(
    {
      localStorage: {
        value: {
          setItem: (key: string, value: string) =>
            calls.push(`set ${key} ${value}`),
          removeItem: (key: string) => calls.push(`remove ${key}`),
        },
      },
    },
    () => {
      saveThemePreference('dark');
      saveThemePreference('light');
      saveThemePreference('system');
    },
  );
  assert.deepEqual(calls, [
    `set ${THEME_STORAGE_KEY} dark`,
    `set ${THEME_STORAGE_KEY} light`,
    `remove ${THEME_STORAGE_KEY}`,
  ]);
});

test('a system change reaches the listener until it is removed', () => {
  let listener: ((event: { matches: boolean }) => void) | undefined;
  const seen: string[] = [];
  withGlobals(
    {
      matchMedia: {
        value: () => ({
          addEventListener: (_: string, added: typeof listener) => {
            listener = added;
          },
          removeEventListener: () => {
            listener = undefined;
          },
        }),
      },
    },
    () => {
      const stop = watchSystemTheme((theme) => seen.push(theme));
      listener?.({ matches: true });
      listener?.({ matches: false });
      stop();
      assert.equal(listener, undefined);
    },
  );
  assert.deepEqual(seen, ['dark', 'light']);
});

test('the boot script gives the same answer as the app in every case', () => {
  for (const [stored, dark] of [
    ['light', true],
    ['dark', false],
    ['invalid', true],
    ['invalid', false],
    [null, true],
    [null, false],
    [blocked, true],
    [blocked, false],
  ] as const) {
    const documentElement = { dataset: {} as { theme?: string } };
    withGlobals(
      {
        localStorage:
          typeof stored === 'object' && stored
            ? stored
            : storing(stored as string | null),
        matchMedia: systemIs(dark),
        document: { value: { documentElement } },
      },
      () => {
        new Function(THEME_BOOT_SCRIPT)();
        assert.equal(
          documentElement.dataset.theme,
          resolveTheme(readThemePreference()),
        );
        documentElement.dataset.theme = undefined;
        applyDocumentTheme(resolveTheme(readThemePreference()));
        assert.ok(documentElement.dataset.theme);
      },
    );
  }
});

test('the boot script also works when matchMedia is missing', () => {
  const documentElement = { dataset: {} as { theme?: string } };
  withGlobals(
    {
      localStorage: blocked,
      matchMedia: blocked,
      document: { value: { documentElement } },
    },
    () => new Function(THEME_BOOT_SCRIPT)(),
  );
  assert.equal(documentElement.dataset.theme, 'light');
});

test('index.html inlines the boot script before the app to apply the theme before paint', () => {
  const page = new URL('../../../index.html', import.meta.url);
  const html = readFileSync(page, 'utf8');
  const boot = html.indexOf(`<script>${THEME_BOOT_SCRIPT}</script>`);
  assert.ok(boot >= 0, 'The theme boot script must be present');
  assert.ok(boot < html.indexOf('</head>'));
  assert.ok(boot < html.indexOf('type="module"'));
});

test('every theme label has Arabic copy, and English stays English', () => {
  for (const [key, value] of Object.entries(themeArabic)) {
    const message = key as keyof typeof themeArabic;
    assert.match(value, /[؀-ۿ]/);
    assert.equal(themeLabel('ar', message), value);
    assert.doesNotMatch(themeLabel('en', message), /[؀-ۿ]/);
  }
});
