import test from 'node:test';
import assert from 'node:assert/strict';
import { createAutoTranslation } from '../lib/auto-translate.mjs';
import { decideTranslation, hashFields } from '../lib/translations.mjs';

const reply = (name, desc) => ({
  sourceLanguages: { name: 'en', description: 'en' },
  translated: {
    fa: { name: 'برگر قارچ', description: 'گوشت و قارچ' }, en: { name, description: desc },
    tr: { name: 'Mantarlı Burger', description: 'Et ve mantar' }, ar: { name: 'برجر الفطر', description: 'لحم وفطر' }
  }
});

function fakeStore(initial) {
  const state = { ...initial, saved: [], marked: [] };
  return {
    state,
    stores: { product: {
      load: async () => state.row && { typed: state.row.typed, faOrigin: state.row.faOrigin ?? 'source', sourceHash: state.row.sourceHash ?? null, existing: state.row.existing ?? [], hasOtherRows: (state.row.existing ?? []).some(r => r.language !== 'fa') },
      save: async (_id, payload) => { if (state.changeWhileTranslating) return false; state.saved.push(payload); return true; },
      markDone: async (_id, hash) => { state.marked.push(hash); }
    } }
  };
}
const translatorFor = out => ({ enabled: true, calls: 0, async translate() { this.calls += 1; return out; } });

test('decideTranslation', () => {
  assert.equal(decideTranslation({ hash: 'a', sourceHash: 'a' }), 'skip');
  assert.equal(decideTranslation({ hash: 'a', sourceHash: 'b', faOrigin: 'auto' }), 'skip');
  assert.equal(decideTranslation({ hash: 'a', sourceHash: null, hasOtherRows: true }), 'adopt');
  assert.equal(decideTranslation({ hash: 'a', sourceHash: 'b', hasOtherRows: true }), 'translate');
  assert.equal(decideTranslation({ hash: 'a', sourceHash: null, hasOtherRows: false }), 'translate');
});

test('new content is translated and saved with its hash', async () => {
  const { stores, state } = fakeStore({ row: { typed: { name: 'Mushroom Burger', description: 'Beef and mushroom' } } });
  const translator = translatorFor(reply('Mushroom Burger', 'Beef and mushroom'));
  const auto = createAutoTranslation({ translator, stores });
  assert.deepEqual(await auto.process({ kind: 'product', id: 'p1' }), { status: 'translated' });
  const { rows, hash } = state.saved[0];
  assert.equal(hash, hashFields('product', { name: 'Mushroom Burger', description: 'Beef and mushroom' }));
  assert.equal(rows.find(r => r.language === 'en').origin, 'source');
  assert.equal(rows.find(r => r.language === 'tr').origin, 'auto');
  assert.equal(rows.find(r => r.language === 'fa').fields.name, 'برگر قارچ');
});

test('unchanged content costs nothing (no API call)', async () => {
  const typed = { name: 'Burger', description: 'Beef' };
  const { stores } = fakeStore({ row: { typed, sourceHash: hashFields('product', typed) } });
  const translator = translatorFor(reply('x', 'y'));
  assert.deepEqual(await createAutoTranslation({ translator, stores }).process({ kind: 'product', id: 'p1' }), { status: 'unchanged' });
  assert.equal(translator.calls, 0);
});

test('curated seed translations are adopted, never replaced', async () => {
  const { stores, state } = fakeStore({ row: { typed: { name: 'برگر', description: 'گوشت' }, existing: [{ language: 'fa', origin: 'source' }, { language: 'en', origin: 'seed' }] } });
  const translator = translatorFor(reply('x', 'y'));
  assert.deepEqual(await createAutoTranslation({ translator, stores }).process({ kind: 'product', id: 'p1' }), { status: 'adopted' });
  assert.equal(translator.calls, 0);
  assert.equal(state.marked.length, 1);
});

test('manual rows survive; a text edited during translation is not overwritten', async () => {
  const manual = fakeStore({ row: { typed: { name: 'Mushroom Burger', description: 'Beef' }, sourceHash: 'old', existing: [{ language: 'tr', origin: 'manual' }] } });
  await createAutoTranslation({ translator: translatorFor(reply('Mushroom Burger', 'Beef')), stores: manual.stores }).process({ kind: 'product', id: 'p1' });
  assert.equal(manual.state.saved[0].rows.some(r => r.language === 'tr'), false);

  const racing = fakeStore({ row: { typed: { name: 'A', description: 'B' }, sourceHash: 'old' }, changeWhileTranslating: true });
  assert.deepEqual(await createAutoTranslation({ translator: translatorFor(reply('A', 'B')), stores: racing.stores }).process({ kind: 'product', id: 'p1' }), { status: 'superseded' });
});

test('disabled translator never enqueues; failures do not throw out of the queue', async () => {
  const { stores } = fakeStore({ row: { typed: { name: 'A', description: 'B' } } });
  const off = createAutoTranslation({ translator: { enabled: false }, stores });
  off.enqueue('product', 'p1');
  assert.equal(off.pending, 0);

  const warnings = [];
  const failing = createAutoTranslation({ translator: { enabled: true, translate: async () => { throw new Error('boom'); } }, stores, logger: { warn: (o) => warnings.push(o) } });
  failing.enqueue('product', 'p1');
  await failing.onIdle();
  assert.equal(warnings.length, 1);
  assert.equal(JSON.stringify(warnings[0]).includes('"A"'), false);
});
