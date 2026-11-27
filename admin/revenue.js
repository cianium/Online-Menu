/* Standalone sample revenue dashboard: read-only aggregates, no PII or external requests. */
(()=>{
  "use strict";
  const $=id=>document.getElementById(id),model=window.RomanoRevenueModel,members=window.RomanoDemoMembers;
  const t=k=>window.ROMANO_ADMIN_I18N.get(k),lang=()=>document.documentElement.lang||'fa';
  const local=()=>typeof adminInitialized!=='undefined'&&adminInitialized&&!window.RomanoAPI?.enabled&&!document.querySelector('.admin-app').inert;
  const n=v=>new Intl.NumberFormat(lang(),{maximumFractionDigits:1}).format(v);
  const money=(v,c)=>window.OnlineMenuMoney.formatMinor(v,{currency:c,exponent:0,language:lang()});
  const dateLabel=s=>new Intl.DateTimeFormat(lang(),{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(s+'T12:00:00Z'));
  const periodLabel=b=>{
    if(b.hour===null)return b.start===b.end?dateLabel(b.start):dateLabel(b.start)+' – '+dateLabel(b.end);
    const digits=new Intl.NumberFormat(lang(),{minimumIntegerDigits:2});
    return `${digits.format(b.hour)}:${digits.format(0)}`;
  };
  const el=(tag,value)=>{const node=document.createElement(tag);if(value!==undefined)node.textContent=value;return node;};
  let latest=null;
  function clear(message){
    latest=null;$('revenue-export').disabled=true;$('revenue-content').hidden=true;$('revenue-filters').hidden=true;$('revenue-status').textContent=t(message);
    $('revenue-bars').replaceChildren();$('revenue-table-body').replaceChildren();$('revenue-bucket').replaceChildren();$('revenue-currency').replaceChildren();
    $('revenue-top-items').replaceChildren();
    for(const id of ['revenue-customers','revenue-total','revenue-count','revenue-average','revenue-change','revenue-previous','revenue-detail','revenue-range-label','revenue-axis-max','revenue-axis-start','revenue-axis-end','revenue-excluded'])$(id).textContent='';
  }
  function detail(){
    const b=latest?.buckets[Number($('revenue-bucket').value)];
    $('revenue-detail').textContent=b?periodLabel(b)+' · '+money(b.total,latest.currency)+' · '+t('تعداد سفارش‌های نمونه')+': '+n(b.count):'';
    [...$('revenue-bars').children].forEach((node,i)=>node.classList.toggle('is-selected',i===Number($('revenue-bucket').value)));
  }
  function render(){
    if(!local()){clear('گزارش درآمد نیازمند تاریخچه پرداخت معتبر است.');return;}
    try{
      const rows=model.orders(members.read(localStorage));
      const codes=model.currencies(rows),currency=$('revenue-currency'),selected=currency.value;
      if(!codes.length)codes.push('IRT');
      currency.replaceChildren(...codes.map(c=>{const o=el('option',c==='IRT'?t('تومان'):c);o.value=c;return o;}));
      currency.value=codes.includes(selected)?selected:codes[0];
      const report=model.report(rows,currency.value,Number($('revenue-period').value));latest=report;$('revenue-export').disabled=false;
      $('revenue-content').hidden=false;$('revenue-filters').hidden=false;
      $('revenue-status').textContent=t(report.count?'مبلغ سفارش‌های نمونه؛ درآمد یا پرداخت واقعی نیست.':'در این بازه سفارش نمونه‌ای ثبت نشده است.');
      $('revenue-total').textContent=money(report.total,report.currency);
      $('revenue-count').textContent=n(report.count);
      $('revenue-customers').textContent=n(report.customers);
      $('revenue-top-items').replaceChildren(...report.topItems.map(([name,quantity])=>{
        const item=el('li');item.append(el('bdi',name),el('span',n(quantity)));return item;
      }));
      $('revenue-ranking').hidden=!report.topItems.length;
      $('revenue-average').textContent=money(report.average,report.currency);
      $('revenue-change').textContent=report.change===null?'—':new Intl.NumberFormat(lang(),{style:'percent',maximumFractionDigits:1,signDisplay:'exceptZero'}).format(report.change/100);
      $('revenue-previous').textContent=t('دوره قبل')+': '+money(report.previousTotal,report.currency)+' ('+dateLabel(report.previousStart)+' – '+dateLabel(report.previousEnd)+')';
      $('revenue-range-label').textContent=dateLabel(report.start)+' – '+dateLabel(report.end);
      $('revenue-excluded').textContent=(report.legacyCount?t('سفارش‌های قدیمی بدون واحد پول از گزارش حذف شده‌اند.')+' '+n(report.legacyCount)+' ':'')+(report.otherCurrencyCount?t('سفارش‌های با واحد پول دیگر جداگانه گزارش می‌شوند.')+' '+n(report.otherCurrencyCount):'');
      const max=Math.max(0,...report.buckets.map(b=>b.total));
      $('revenue-axis-max').textContent=money(max,report.currency);
      $('revenue-axis-start').textContent=periodLabel(report.buckets[0]);
      $('revenue-axis-end').textContent=periodLabel(report.buckets.at(-1));
      const bucket=$('revenue-bucket'),previous=bucket.value;bucket.replaceChildren();
      const bars=$('revenue-bars'),body=$('revenue-table-body');bars.replaceChildren();body.replaceChildren();
      for(const [i,b] of report.buckets.entries()){
        const label=periodLabel(b),bar=el('span');bar.className='revenue-bar';bar.style.setProperty('--bar-height',(max?b.total/max*100:0)+'%');bars.append(bar);
        const option=el('option',label);option.value=String(i);bucket.append(option);
        const tr=el('tr'),head=el('th',label);head.scope='row';tr.append(head,el('td',money(b.total,report.currency)),el('td',n(b.count)),el('td',money(b.count?b.total/b.count:0,report.currency)));body.append(tr);
      }
      bucket.value=previous!==''&&Number(previous)<report.buckets.length?previous:String(report.buckets.length-1);
      detail();
    }catch{clear('خواندن داده محلی ممکن نیست.');}
  }
  function download(){
    if(!local()||!latest)return;
    const url=URL.createObjectURL(new Blob([model.csv(latest)],{type:'text/csv;charset=utf-8'}));
    const a=el('a');a.href=url;a.download='ramen-sample-orders-'+latest.currency+'-'+latest.end+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function init(){
    $('revenue-period').addEventListener('change',()=>{$('revenue-bucket').value='';render();});
    $('revenue-currency').addEventListener('change',render);
    $('revenue-bucket').addEventListener('change',detail);
    $('revenue-export').addEventListener('click',download);
    document.addEventListener('romano:dashboard-rendered',()=>queueMicrotask(render));
    document.addEventListener('romano:admin-page-changed',e=>{if(e.detail?.page==='dashboard')render();});
    document.addEventListener('romano:language-changed',render);
    document.addEventListener('romano:demo-membership-changed',render);
    window.addEventListener('storage',e=>{if(e.key===members.key||e.key===null)render();});
    window.addEventListener('pageshow',render);
    render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
