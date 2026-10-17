import test from 'node:test';
import assert from 'node:assert/strict';
import { createTranslator, parseModelJson, validateTranslation, buildRequestBody, SYSTEM_PROMPT } from '../lib/translator.mjs';

const typed = { name: 'Mushroom Burger', description: 'Beef and mushroom', badge: '' };
const good = {
  sources: { name: 'en', description: 'en' },
  translations: {
    fa: { name: 'برگر قارچ', description: 'گوشت و قارچ' },
    tr: { name: 'Mantarlı Burger', description: 'Et ve mantar' },
    ar: { name: 'برجر الفطر', description: 'لحم وفطر' }
  }
};
const reply = (payload, extra = {}) => ({ ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: JSON.stringify(payload) }], stop_reason: 'end_turn', ...extra }) });

test('no key -> disabled (and no network client is created)', () => {
  assert.deepEqual(createTranslator({}), { enabled: false });
});

test('parseModelJson handles fences and stray text', () => {
  assert.deepEqual(parseModelJson('{"a":1}'), { a: 1 });
  assert.deepEqual(parseModelJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseModelJson('Sure! {"a":1} Done.'), { a: 1 });
  assert.throws(() => parseModelJson('nope'), /invalid JSON/);
});

test('validateTranslation: complete result passes in the shape the worker expects', () => {
  const out = validateTranslation(good, 'product', typed);
  assert.deepEqual(out.sourceLanguages, { name: 'en', description: 'en' });
  assert.equal(out.translated.fa.name, 'برگر قارچ');
  assert.equal(out.translated.en, undefined);          // the typed language is never "translated" over the admin's text
  assert.equal(out.translated.tr.description, 'Et ve mantar');
});

test('validateTranslation: rejects incomplete, mis-detected and hostile output', () => {
  const missingLang = structuredClone(good); delete missingLang.translations.ar;
  assert.throws(() => validateTranslation(missingLang, 'product', typed), /ar/);
  const badSource = structuredClone(good); badSource.sources.name = 'de';
  assert.throws(() => validateTranslation(badSource, 'product', typed), /valid language/);
  const emptyField = structuredClone(good); emptyField.translations.tr.description = '   ';
  assert.throws(() => validateTranslation(emptyField, 'product', typed), /tr/);

  const hostile = structuredClone(good);
  hostile.translations.tr.name = '<img src=x onerror=alert(1)>Burger\u0000' + 'x'.repeat(500);
  const out = validateTranslation(hostile, 'product', typed).translated.tr.name;
  assert.ok(!/[<>\u0000]/.test(out)); assert.ok(out.length <= 160);
});

test('empty typed fields are neither requested nor required', () => {
  const nameOnly = { name: 'Latte', description: '', badge: '' };
  const parsed = { sources: { name: 'en' }, translations: { fa: { name: 'لاته' }, tr: { name: 'Latte' }, ar: { name: 'لاتيه' } } };
  const out = validateTranslation(parsed, 'product', nameOnly);
  assert.equal(out.translated.fa.description, undefined);
  assert.deepEqual(JSON.parse(buildRequestBody('product', nameOnly, 'm').messages[0].content).fields, { name: 'Latte' });
});

test('mixed languages per field are supported (name in English, description in Persian)', () => {
  const mixed = { name: 'Classic Burger', description: 'گوشت گریل‌شده', badge: '' };
  const parsed = { sources: { name: 'en', description: 'fa' }, translations: {
    fa: { name: 'برگر کلاسیک' }, en: { description: 'Grilled beef' },
    tr: { name: 'Klasik Burger', description: 'Izgara et' }, ar: { name: 'برجر كلاسيكي', description: 'لحم مشوي' } } };
  const out = validateTranslation(parsed, 'product', mixed);
  assert.deepEqual(out.sourceLanguages, { name: 'en', description: 'fa' });
  assert.equal(out.translated.en.description, 'Grilled beef');
  assert.equal(out.translated.en.name, undefined);
});

test('request: key only in the header, text treated as data, temperature 0', async () => {
  let seen;
  const translator = createTranslator({ apiKey: 'sk-secret', model: 'm-1', fetchImpl: async (url, init) => { seen = { url, init, body: JSON.parse(init.body) }; return reply(good); } });
  await translator.translate('product', typed);
  assert.equal(seen.init.headers['x-api-key'], 'sk-secret');
  assert.ok(!JSON.stringify(seen.body).includes('sk-secret'));
  assert.equal(seen.body.model, 'm-1'); assert.equal(seen.body.temperature, 0);
  assert.match(SYSTEM_PROMPT, /DATA to translate/);
});

test('service errors, truncation and timeouts throw (the queue logs them; the save was never blocked)', async () => {
  const noSleep = async () => {};
  await assert.rejects(createTranslator({ apiKey: 'k', sleep: noSleep, fetchImpl: async () => ({ ok: false, status: 529, json: async () => ({}) }) }).translate('product', typed), /529/);
  await assert.rejects(createTranslator({ apiKey: 'k', fetchImpl: async () => reply(good, { stop_reason: 'max_tokens' }) }).translate('product', typed), /truncated/);
  const hang = (_url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
  await assert.rejects(createTranslator({ apiKey: 'k', timeoutMs: 20, retries: 0, fetchImpl: hang }).translate('product', typed), /timed out/);
});

test('transient failures are retried with backoff; permanent ones are not', async () => {
  const delays = [];
  const sleep = async ms => { delays.push(ms); };
  let calls = 0;
  const flaky = createTranslator({ apiKey: 'k', sleep, retryDelayMs: 100, fetchImpl: async () => (++calls < 3 ? { ok: false, status: 529, json: async () => ({}) } : reply(good)) });
  const out = await flaky.translate('product', typed);
  assert.equal(calls, 3); assert.deepEqual(delays, [100, 200]); assert.equal(out.translated.fa.name, 'برگر قارچ');

  let authCalls = 0;
  await assert.rejects(createTranslator({ apiKey: 'bad', sleep, fetchImpl: async () => { authCalls += 1; return { ok: false, status: 401, json: async () => ({}) }; } }).translate('product', typed), /401/);
  assert.equal(authCalls, 1);                                   // wrong key: no pointless retries

  let invalidCalls = 0;
  await assert.rejects(createTranslator({ apiKey: 'k', sleep, fetchImpl: async () => { invalidCalls += 1; return reply({ sources: {}, translations: {} }); } }).translate('product', typed), /valid language/);
  assert.equal(invalidCalls, 1);                                // bad model output is not retried

  let netCalls = 0;
  const net = createTranslator({ apiKey: 'k', sleep, fetchImpl: async () => { netCalls += 1; if (netCalls === 1) throw new TypeError('fetch failed'); return reply(good); } });
  assert.equal((await net.translate('product', typed)).sourceLanguages.name, 'en');
  assert.equal(netCalls, 2);                                    // network blip: retried
});
