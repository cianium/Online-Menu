import { createJobQueue } from './queue.mjs';
import { TRANSLATABLE_KEYS, decideTranslation, hashFields, normalizeFields, planTranslationRows } from './translations.mjs';

/**
 * Background translation of admin content into fa/en/tr/ar.
 *
 * - Saving never waits for (or fails because of) the translation service.
 * - One job per entity; a newer edit replaces an older waiting job and always wins.
 * - Human-written rows ('manual') are never overwritten; curated seed rows are adopted, not replaced.
 * - Logs contain ids and outcomes only — never menu text.
 *
 * `stores[kind]` is the (tiny) database adapter:
 *   load(id)  -> { typed, faOrigin, sourceHash, existing:[{language,origin}], hasOtherRows } | null
 *   save(id, { rows, hash }) -> boolean   (false when the text changed while translating)
 *   markDone(id, hash)
 */
export function createAutoTranslation({ translator, stores, logger = {}, concurrency = 2 }) {
  const enabled = Boolean(translator?.enabled);

  async function process({ kind, id }) {
    const store = stores[kind];
    const state = await store.load(id);
    if (!state) return { status: 'gone' };

    const typed = normalizeFields(kind, state.typed);
    if (!typed[TRANSLATABLE_KEYS[kind][0]]) return { status: 'empty' };

    const hash = hashFields(kind, typed);
    const decision = decideTranslation({ hash, sourceHash: state.sourceHash, faOrigin: state.faOrigin, hasOtherRows: state.hasOtherRows });
    if (decision === 'skip') return { status: 'unchanged' };
    if (decision === 'adopt') { await store.markDone(id, hash); return { status: 'adopted' }; }

    const { sourceLanguages, translated } = await translator.translate(kind, typed);
    const rows = planTranslationRows({ kind, typed, sourceLanguages, translated, existing: state.existing });
    const saved = await store.save(id, { rows, hash });
    return { status: saved ? 'translated' : 'superseded' };
  }

  const queue = createJobQueue({
    concurrency,
    handler: async job => {
      const result = await process(job);
      logger.info?.({ kind: job.kind, id: job.id, status: result.status }, 'auto-translation');
    },
    onError: (error, job) => logger.warn?.({ kind: job.kind, id: job.id, reason: error?.message }, 'auto-translation failed; it will be retried on the next edit or restart')
  });

  return {
    enabled,
    process,
    enqueue(kind, id) { if (enabled && id) queue.add(`${kind}:${id}`, { kind, id }); },
    get pending() { return queue.size; },
    onIdle: () => queue.onIdle()
  };
}
