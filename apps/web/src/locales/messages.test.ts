import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  arabic,
  LANGUAGE_STORAGE_KEY,
  readLanguage,
  translate,
} from './messages';

test('parameterized messages preserve values and isolate mixed-language data', () => {
  const name = 'Alaa $& <script> {count}';
  assert.equal(translate('en', 'Manage {name}', { name }), `Manage ${name}`);
  assert.equal(
    translate('ar', 'Manage {name}', { name }),
    `إدارة \u2068${name}\u2069`,
  );
  assert.equal(
    translate('ar', '{count} pharmacies found', { count: 0 }),
    'عدد الصيدليات التي تم العثور عليها: \u20680\u2069',
  );
  assert.equal(
    translate('en', '{count} pharmacy found', { count: 1 }),
    '1 pharmacy found',
  );
  assert.equal(
    translate('en', '{count} pharmacies found', { count: 6 }),
    '6 pharmacies found',
  );
  assert.equal(translate('en', 'Manage {name}', {}), 'Manage {name}');
});

test('Arabic copy covers every shared key; English and unknown server details are preserved', () => {
  for (const [key, value] of Object.entries(arabic)) {
    assert.match(value, /[\u0600-\u06ff]/);
    assert.equal(translate('ar', key), value);
    assert.equal(translate('en', key), key);
  }
  assert.equal(
    translate('ar', 'Pharmacy North: custom server rejection'),
    'Pharmacy North: custom server rejection',
  );
  assert.equal(translate('ar', 'constructor'), 'constructor');
});

test('saved language accepts Arabic only, and safely defaults when storage is blocked', () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage',
  );
  try {
    for (const [stored, expected] of [
      ['ar', 'ar'],
      ['en', 'en'],
      ['invalid', 'en'],
      [null, 'en'],
    ] as const) {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: {
          getItem(key: string) {
            assert.equal(key, LANGUAGE_STORAGE_KEY);
            return stored;
          },
        },
      });
      assert.equal(readLanguage(), expected);
    }
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('Storage blocked');
      },
    });
    assert.equal(readLanguage(), 'en');
  } finally {
    if (descriptor)
      Object.defineProperty(globalThis, 'localStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
