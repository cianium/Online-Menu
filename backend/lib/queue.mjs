/**
 * Tiny in-process job queue: bounded concurrency, one job per key.
 * Adding a key that is still waiting replaces its payload; adding a key that is running
 * schedules exactly one re-run afterwards (so the newest text always wins).
 */
export function createJobQueue({ concurrency = 2, handler, onError = () => {} }) {
  const waiting = new Map();   // key -> payload (insertion ordered)
  const running = new Set();
  const rerun = new Map();     // key -> payload to run after the current run finishes
  let idleResolvers = [];

  const settleIdle = () => {
    if (waiting.size === 0 && running.size === 0) { idleResolvers.forEach(resolve => resolve()); idleResolvers = []; }
  };

  function pump() {
    while (running.size < concurrency) {
      const next = [...waiting.keys()].find(key => !running.has(key));
      if (next === undefined) break;
      const payload = waiting.get(next);
      waiting.delete(next);
      running.add(next);
      Promise.resolve()
        .then(() => handler(payload))
        .catch(error => onError(error, payload))
        .finally(() => {
          running.delete(next);
          if (rerun.has(next)) { waiting.set(next, rerun.get(next)); rerun.delete(next); }
          pump();
          settleIdle();
        });
    }
  }

  return {
    add(key, payload) {
      if (running.has(key)) rerun.set(key, payload); else waiting.set(key, payload);
      pump();
    },
    get size() { return waiting.size + running.size + rerun.size; },
    onIdle() { return waiting.size === 0 && running.size === 0 ? Promise.resolve() : new Promise(resolve => idleResolvers.push(resolve)); }
  };
}
