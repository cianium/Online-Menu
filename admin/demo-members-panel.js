/* The connected tenant never reads browser demo memberships. */
(()=>{
 const model=window.RomanoDemoMembers, panel=document.querySelector('#demo-members-panel'),list=document.querySelector('#demo-members-list');
 const t=k=>window.ROMANO_ADMIN_I18N.get(k);
 function render(){
   const available=typeof adminInitialized!=='undefined'&&adminInitialized&&adminDemoMode&&demoAdminSignedIn()&&!window.RomanoAPI.enabled&&!document.querySelector('.admin-app').inert;
   panel.hidden=!available;list.replaceChildren();if(!available)return;
   try{
     const members=model.read(localStorage);
     if(!members.length){const p=document.createElement('p');p.textContent=t('عضو نمونه‌ای ثبت نشده است.');list.append(p);}
     for(const member of members){
       const row=document.createElement('article');row.className='demo-member-row';
       const name=document.createElement('strong');name.dataset.adminUserText='true';name.dir='auto';name.textContent=member.name;
       const phone=document.createElement('bdi');phone.dir='ltr';phone.textContent='•••'+member.phone.slice(-4);
       const count=document.createElement('span');count.textContent=t('تعداد سفارش‌های نمونه')+': '+new Intl.NumberFormat(document.documentElement.lang).format(member.orders.length);
       const points=document.createElement('span');points.dataset.adminUserText='true';points.textContent=({fa:'امتیاز نمونه',en:'Sample points',tr:'Örnek puan',ar:'نقاط تجريبية'}[document.documentElement.lang]||'Sample points')+': '+new Intl.NumberFormat(document.documentElement.lang).format(model.pointsFor(member));
       row.append(name,phone,count,points);list.append(row);
     }
   }catch{const p=document.createElement('p');p.textContent=t('خواندن داده محلی ممکن نیست.');list.append(p);}
 }
 for(const event of ['romano:admin-page-changed','romano:language-changed','romano:demo-membership-changed'])document.addEventListener(event,render);
 window.addEventListener('storage',event=>{if(event.key===model.key||event.key===null)render();});
 const app=document.querySelector('.admin-app');if(app)new MutationObserver(render).observe(app,{attributes:true,attributeFilter:['inert']});
 render();
})();
