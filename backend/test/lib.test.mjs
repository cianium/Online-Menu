import test from 'node:test';
import assert from 'node:assert/strict';
import { parseImageDataUrl, MAX_IMAGE_BYTES } from '../lib/media.mjs';
import { cleanImageUrl, slugify, safeEqual, hasRole, parseTrustProxy, resolveCookieSecure, assertProductionConfig } from '../lib/security.mjs';
import { translationsToMap, resolveField, sanitizeIncomingTranslations } from '../lib/translations.mjs';

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(16)]);
const url = (mime, buf) => `data:${mime};base64,${buf.toString('base64')}`;

test('accepts real png/jpeg/webp', () => {
  assert.equal(parseImageDataUrl(url('image/png', png)).ext, 'png');
  assert.equal(parseImageDataUrl(url('image/jpeg', jpg)).ext, 'jpg');
  assert.equal(parseImageDataUrl(url('image/webp', webp)).ext, 'webp');
});

test('rejects svg, html disguised as image, mismatched type and oversize', () => {
  assert.throws(() => parseImageDataUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='), { statusCode: 400 });
  assert.throws(() => parseImageDataUrl(url('image/png', Buffer.from('<script>alert(1)</script>'))), { statusCode: 415 });
  assert.throws(() => parseImageDataUrl(url('image/png', jpg)), { statusCode: 415 });
  assert.throws(() => parseImageDataUrl(url('image/png', Buffer.concat([png, Buffer.alloc(MAX_IMAGE_BYTES)]))), { statusCode: 413 });
  assert.throws(() => parseImageDataUrl('not a data url'), { statusCode: 400 });
});

test('cleanImageUrl only allows http(s) and same-site asset paths', () => {
  assert.equal(cleanImageUrl('https://cdn.example.com/a.jpg'), 'https://cdn.example.com/a.jpg');
  assert.equal(cleanImageUrl('./assets/images/x.jpg'), 'assets/images/x.jpg');
  assert.equal(cleanImageUrl('/uploads/r1/a.png'), '/uploads/r1/a.png');
  for (const bad of ['javascript:alert(1)', 'data:image/png;base64,AAAA', 'file:///etc/passwd', '/assets/../../etc/passwd', '//evil.com/x.jpg', '']) {
    assert.equal(cleanImageUrl(bad), null, bad);
  }
});

test('slugify never returns an empty slug', () => {
  assert.equal(slugify('Classic Burger!'), 'classic-burger');
  assert.match(slugify('برگر کلاسیک'), /^item-[0-9a-f]{8}$/);
});

test('safeEqual and roles', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', undefined), false);
  assert.equal(hasRole('editor', 'viewer'), true);
  assert.equal(hasRole('viewer', 'editor'), false);
  assert.equal(hasRole('stranger', 'viewer'), false);
});

test('proxy and cookie configuration is safe by default', () => {
  assert.equal(parseTrustProxy(undefined), false);
  assert.equal(parseTrustProxy('1'), 1);
  assert.equal(parseTrustProxy('true'), true);
  assert.equal(resolveCookieSecure({ NODE_ENV: 'production' }), true);
  assert.equal(resolveCookieSecure({ NODE_ENV: 'production', COOKIE_SECURE: 'false' }), true);
  assert.equal(resolveCookieSecure({ NODE_ENV: 'development' }), false);
  assert.throws(() => assertProductionConfig({ NODE_ENV: 'production' }), /DATABASE_URL/);
  assert.doesNotThrow(() => assertProductionConfig({ NODE_ENV: 'production', DATABASE_URL: 'postgres://x' }));
});

test('translations: fallback chain and sanitising', () => {
  const map = translationsToMap([{ language: 'fa', name: 'برگر' }, { language: 'en', name: 'Burger', description: '' }, { language: 'xx', name: 'bad' }]);
  assert.deepEqual(Object.keys(map), ['fa', 'en']);
  assert.equal(resolveField(map, 'name', 'tr'), 'برگر');
  assert.equal(resolveField(map, 'name', 'en'), 'Burger');
  assert.equal(resolveField(map, 'description', 'en'), '');
  const clean = sanitizeIncomingTranslations({ en: { name: '  Hi  ', description: '' }, de: { name: 'x' }, ar: 'nope' });
  assert.deepEqual(clean, { en: { name: 'Hi' } });
});
