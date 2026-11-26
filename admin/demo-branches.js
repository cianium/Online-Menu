/* Settings for branch-specific sample workspaces in a standalone export. */
(() => {
  'use strict';
  const model = window.RomanoDemoBranches;
  if (!model) return;
  const panel = document.getElementById('demo-branches');
  const select = panel.querySelector('select');
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
  function render() {
    if (!ready()) return;
    panel.hidden = false;
    document.getElementById('branch-management').classList.add('has-sample-branches');
    try {
      const rows = model.read(), current = rows.find(row => row.id === model.id);
      if (!current) throw Error('BRANCH_MISSING');
      select.replaceChildren(...rows.map(row => new Option(row.name,row.id)));
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
  window.addEventListener('storage',e=>{if(e.key===model.registry || e.key===null) render();});
  document.addEventListener('romano:admin-page-changed',e=>{if(e.detail?.page==='settings' && opened)render();});
})();
