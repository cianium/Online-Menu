/* Settings for branch-specific sample workspaces in a standalone export. */
(() => {
  'use strict';
  const model = window.RomanoDemoBranches;
  if (!model) return;
  const panel = document.getElementById('demo-branches');
  const select = panel.querySelector('#sample-branch-select');
  const lifecycle = panel.querySelector('#sample-branch-lifecycle');
  const target = lifecycle.querySelector('#sample-branch-target');
  const toggle = lifecycle.querySelector('#sample-branch-active-toggle');
  toggle.dataset.adminUserText = 'true';
  const names = panel.querySelector('[name="sampleName"]');
  const rename = panel.querySelector('[name="sampleRename"]');
  const tableForm = document.getElementById('sample-table-form');
  const tableSelect = document.getElementById('sample-table-select');
  const qr = document.getElementById('sample-table-qr');
  const output = panel.querySelector('[role="status"]');
  const t = label => window.ROMANO_ADMIN_I18N.get(label);
  let opened = false;
  function updateQr() {
    const link = qr.querySelector('a'), image = qr.querySelector('.ops-qr-image');
    qr.hidden = !tableSelect.value;
    image.replaceChildren();
    if (qr.hidden) return;
    link.href = model.link('../?qr=demo',model.id,tableSelect.value);
    if (window.QRCode) new window.QRCode(image,{text:link.href,width:144,height:144,correctLevel:window.QRCode.CorrectLevel.M});
  }
  function ready() { return typeof adminInitialized !== 'undefined' && adminInitialized && !window.RomanoAPI.enabled && !document.querySelector('.admin-app').inert; }
  function updateLifecycle(rows) {
    const manageable = model.id === '' ? rows.filter(row=>row.id !== '') : [];
    lifecycle.hidden = !manageable.length;
    const previous = target.value;
    target.replaceChildren(...manageable.map(row=>new Option(row.name+' · '+t(row.active===false?'شعبه غیرفعال':'شعبه فعال'),row.id)));
    if (manageable.some(row=>row.id===previous)) target.value=previous;
    const row = manageable.find(item=>item.id===target.value);
    toggle.disabled = !row;
    toggle.textContent=t(row?.active===false?'فعال‌کردن':'غیرفعال‌کردن');
  }
  function render() {
    if (!ready()) return;
    panel.hidden = false;
    document.getElementById('branch-management').classList.add('has-sample-branches');
    try {
      const rows = model.read(), current = rows.find(row => row.id === model.id);
      if (!current) throw Error('BRANCH_MISSING');
      select.replaceChildren(...rows.filter(row=>row.active!==false).map(row => new Option(row.name,row.id)));
      updateLifecycle(rows);
      select.value = current.id;
      if (!rename.value || rename.value === rename.defaultValue) rename.value = rename.defaultValue = current.name;
      const previous = tableSelect.value;
      tableSelect.replaceChildren(...current.tables.map(row => new Option(row.name+' · '+row.code,row.code)));
      if (current.tables.some(t=>t.code===previous)) tableSelect.value = previous;
      tableSelect.closest('label').hidden = !current.tables.length;
      updateQr();
      if (!opened && location.hash === '#demo-branches') {
        navigateTo('settings');
        panel.scrollIntoView({block:'start'});
        select.focus({preventScroll:true});
      }
      opened = true;
    } catch { output.textContent = t('خواندن داده محلی ممکن نیست.'); }
  }
  function switchBranch(id) { location.assign(model.link('./#demo-branches', id)); }
  select.addEventListener('change', () => switchBranch(select.value));
  tableSelect.addEventListener('change',updateQr);
  target.addEventListener('change',()=>{try{updateLifecycle(model.read());}catch{output.textContent=t('خواندن داده محلی ممکن نیست.');}});
  lifecycle.addEventListener('submit',async event=>{
    event.preventDefault();
    event.stopPropagation();
    if (!ready() || toggle.disabled || model.id !== '') return;
    try {
      const row=model.read().find(item=>item.id===target.value && item.id!=='');
      if (!row) throw Error('BRANCH_MISSING');
      const active=row.active===false;
      if (!active && !window.confirm(t('این شعبه غیرفعال شود؟ اطلاعات قبلی حفظ می‌شوند.'))) return;
      toggle.disabled=true;
      await model.setActive(row.id,active);
      render();
      output.textContent=t('تغییرات ذخیره شد');
    } catch {
      output.textContent=t('ذخیره انجام نشد. اطلاعات فرم حفظ شده است؛ دوباره تلاش کنید.');
    } finally { toggle.disabled=false; }
  });
  panel.addEventListener('submit',async event=>{
    event.preventDefault();
    if (!ready()) return;
    const form = event.target, button = form.querySelector('button[type="submit"]');
    if (button.disabled || !form.reportValidity()) return;
    const action = form.dataset.action;
    button.disabled = true;
    output.textContent = '';
    try {
      const id = await model.save(action, action==='create' ? names.value : action==='rename' ? rename.value : tableForm.elements.sampleTableName.value, tableForm.elements.sampleTableCode.value.trim());
      if (action === 'create') { switchBranch(id); return; }
      if (action === 'table') tableForm.reset();
      render();
      output.textContent = t('تغییرات ذخیره شد');
    } catch (error) {
      output.textContent = t(error.message==='BRANCH_INPUT'?'نام یا کد معتبر و غیرتکراری وارد کنید.':'ذخیره انجام نشد. اطلاعات فرم حفظ شده است؛ دوباره تلاش کنید.');
    } finally { button.disabled = false; }
  });
  for (const link of document.querySelectorAll('a[href="../index.html"],#demo-customer-entry-link')) {
    if (model.id) link.href = model.link(link.getAttribute('href'), model.id);
  }
  document.addEventListener('romano:demo-membership-changed',render);
  document.addEventListener('romano:language-changed',()=>{if(ready())render();});
  window.addEventListener('storage',e=>{if(e.key===model.registry || e.key===null) render();});
  document.addEventListener('romano:admin-page-changed',e=>{if(e.detail?.page==='settings' && opened)render();});
})();
