/* Local sample branches share a browser origin. Server APIs never read this registry. */
(() => {
  'use strict';
  if (document.querySelector('meta[name="online-menu-mode"]')?.content !== 'standalone') return;
  const registry = 'online_menu_demo_branches_v1';
  const params = new URLSearchParams(location.search);
  const id = params.get('demoBranch') ?? '';
  const table = params.get('demoTable');
  const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
  const code = /^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/;
  const label = value => typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 80;
  // Keep existing stored labels readable; enforce the stricter policy on new writes.
  const normalizeName = value => typeof value === 'string' ? value.normalize('NFKC').trim().replace(/\s+/gu, ' ') : '';
  const nameKey = value => normalizeName(value).toLowerCase();
  // Persian and Arabic joiners are valid text. Reject other invisible format and control characters.
  const validNewLabel = value => label(value) && !/[\p{Cc}\p{Cf}]/u.test(value.replace(/[\u200c\u200d]/gu, ''));
  function validateDirectory(rows) {
    if (!Array.isArray(rows) || !rows.length || rows.length > 50 || rows[0]?.id !== '' ||
        new Set(rows.map(row => row?.id)).size !== rows.length ||
        !rows.every((row, index) => row && typeof row.id === 'string' && (!index || uuid.test(row.id)) && label(row.name) &&
          (row.active === undefined || typeof row.active === 'boolean') && (index !== 0 || row.active !== false) &&
          Array.isArray(row.tables) && row.tables.length <= 100 &&
          row.tables.every(t => t && typeof t.code === 'string' && code.test(t.code) && label(t.name)) &&
          new Set(row.tables.map(t => t.code)).size === row.tables.length)) throw Error('BRANCH_DATA');
    return rows;
  }
  function read() {
    const raw = localStorage.getItem(registry);
    return validateDirectory(raw===null?[{id:'',name:'ROMANO',tables:[]}]:JSON.parse(raw));
  }
  function context() {
    if (!id && table === null) return null;
    const branch = read().find(row => row.id === id);
    if (!branch || branch.active === false || (table !== null && !branch.tables.some(t => t.code === table))) throw Error('BRANCH_MISSING');
    return branch;
  }
  function scope(key) { return id ? key + ':branch:' + id : key; }
  function link(relative, branchId, tableCode) {
    const url = new URL(relative, location.href);
    if (branchId) url.searchParams.set('demoBranch', branchId);
    else url.searchParams.delete('demoBranch');
    if (tableCode) url.searchParams.set('demoTable', tableCode);
    else url.searchParams.delete('demoTable');
    return url.href;
  }
  async function save(action, name, tableCode) {
    const clean = normalizeName(name);
    if (!validNewLabel(clean)) throw Error('BRANCH_INPUT');
    // Only a serialized read/modify/write can preserve changes from other tabs.
    if (!navigator.locks) throw Error('BRANCH_STORAGE');
    const result = await navigator.locks.request(registry, () => {
      try {
        const rows = read();
        const current = rows.find(row => row.id === id);
        if (!current || current.active === false) throw Error('BRANCH_MISSING');
        let changedId = id;
        if (action === 'table') {
          if (typeof tableCode !== 'string' || !code.test(tableCode) || current.tables.length >= 100 || current.tables.some(t => t.code === tableCode)) throw Error('BRANCH_INPUT');
          current.tables.push({code:tableCode, name:clean});
        } else {
          if (rows.some(row => nameKey(row.name) === nameKey(clean) && (action !== 'rename' || row.id !== id))) throw Error('BRANCH_INPUT');
          if (action === 'rename') current.name = clean;
          else if (action === 'create' && rows.length < 50) {
            changedId = crypto.randomUUID();
            rows.push({id:changedId, name:clean, tables:[]});
          } else throw Error('BRANCH_INPUT');
        }
        localStorage.setItem(registry, JSON.stringify(rows));
        return {id:changedId};
      } catch (error) { return {error:error.message}; }
    });
    if (result.error) throw Error(result.error);
    return result.id;
  }
  // Archive is reversible; the primary branch and all historical data are retained.
  async function setActive(target, active) {
    if (id !== '' || table !== null || typeof target !== 'string' || !uuid.test(target) || typeof active !== 'boolean') throw Error('BRANCH_INPUT');
    if (!navigator.locks) throw Error('BRANCH_STORAGE');
    const result = await navigator.locks.request(registry, () => {
      try {
        const rows = read(), row = rows.find(item => item.id === target);
        if (!row) throw Error('BRANCH_MISSING');
        if ((row.active !== false) !== active) {
          row.active = active;
          localStorage.setItem(registry, JSON.stringify(rows));
        }
        return {};
      } catch (error) { return {error:error.message}; }
    });
    if (result.error) throw Error(result.error);
  }
  // Existing customer/admin tabs must not continue using an archived branch.
  if (id) window.addEventListener?.('storage', event => {
    if (event.key !== registry && event.key !== null) return;
    try { context(); } catch { location.reload(); }
  });
  window.RomanoDemoBranches = Object.freeze({registry,id,table,scope,context,read,save,link,setActive,validateDirectory});
})();
