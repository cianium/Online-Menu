/* On-demand customer panels; shared state is passed explicitly by commerce.js. */
(() => {
  "use strict";
  function render(deps) {
    const {panel,content,element,demo,mode,labels,words,chat,profileId,lang,h,x,panelText,guestContext,contextLabel,config,tenant,renderHeroRating,close,openPanel,origin,dialog,isDemo,restaurantDialUrl}=deps;
    const requestKinds=["waiter","bill","water","napkin"];
    const panelActive=()=>dialog.open&&content.isConnected;
  function guestServices(content, element, demo, kinds=requestKinds, compact=false) {
    const section=element("section",null,"hp-services");
    section.classList.toggle("connect-service-compact",compact);
    if(!compact){section.append(element("h3",h("quick")));if(contextLabel())section.append(element("p",contextLabel(),"hp-context"));}
    const context=guestContext();
    const enabled=demo && Boolean(context.code) && Boolean(navigator.locks?.request);
    const model=window.RomanoDemoMembers;
    const key= model.requestPrefix+context.code;
    const status=element("p",enabled?h("local"):demo&&!context.code?h("selectTable")+" "+h("local"):demo?panelText().storageError:h("unconnected"),"hp-service-notice");
    const grid=element("div",null,"hp-service-grid");
    if(compact){grid.tabIndex=0;grid.setAttribute("role","group");grid.setAttribute("aria-label",h("quick"));}
    const live=element("p",null,"hp-service-live");live.setAttribute("role","status");
    function readRequests() {
      try{return enabled?model.requestDetails(localStorage,context.code):{};}catch{live.textContent=panelText().storageError;return null;}
    }
    const icons={waiter:"M3 17h18M5 17a7 7 0 0 1 14 0M12 7V5m-2 0h4M2 20h20",bill:"M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6",water:"M12 3c-2 4-6 8-6 12a6 6 0 0 0 12 0c0-4-4-8-6-12Z",napkin:"M4 4h16v16H4zM4 20 20 4M12 12h8v8"};
    for(const kind of kinds) {
      const button=element("button",null,compact?"hp-service-action connect-chip":"hp-service-action");button.type="button";button.disabled=!enabled;
      const icon=document.createElementNS("http://www.w3.org/2000/svg","svg");icon.setAttribute("viewBox","0 0 24 24");icon.setAttribute("class","hp-service-icon");icon.setAttribute("aria-hidden","true");icon.setAttribute("focusable","false");
      const stroke=document.createElementNS("http://www.w3.org/2000/svg","path");stroke.setAttribute("d",icons[kind]);icon.append(stroke);
      const label=element("strong",h(kind));const detail=element("span",null,"hp-service-detail");
      if(!compact)button.append(icon);button.append(label,detail);
      let displayed=null,inFlight=false;
      function refresh() {
        const values=readRequests();displayed=values?.[kind]??null;
        const state=displayed?.state;
        const active=state==="pending"||state==="accepted";
        button.disabled=!enabled||!values||inFlight||state==="accepted";
        button.setAttribute("aria-pressed",String(active));
        button.setAttribute("aria-label",h(kind)+(state==="pending"?" — "+h("cancel"):state==="accepted"?" — "+x(6):state==="completed"?" — "+x(7):""));
        detail.textContent=state==="pending"?h("request")+" · "+h("cancel"):state==="accepted"?x(6):state==="completed"?x(7):"";
      }
      button.addEventListener("click",async()=>{
        if(!panelActive()||!section.isConnected||!isDemo()||guestContext().code!==context.code||!enabled||inFlight||button.disabled)return;
        const before=displayed?.state,expectedId=displayed?.id??null,next=before==="pending"?undefined:"pending";
        inFlight=true;button.disabled=true;
        try {
          await model.mutateRequest(context.code,()=>{
            if(!panelActive()||!section.isConnected||!isDemo()||guestContext().code!==context.code)throw Error("HP_TABLE");
            return model.setRequest(localStorage,context.code,kind,next,before,expectedId);
          });
          live.textContent=h(kind)+" — "+h(next?"request":"cancel")+" · "+h("local");
        }catch{live.textContent=panelText().storageError;}
        finally{inFlight=false;section.dispatchEvent(new Event("hp-request-updated"));}
      });
      section.addEventListener("hp-request-updated",refresh);
      refresh();grid.append(button);
      if(!compact&&panel==='waiter'&&kind==='waiter'&&enabled&&(!displayed||displayed.state==='completed')){
        // Direct waiter action: submit once after the dialog is attached. Reopening an active request never cancels it.
        requestAnimationFrame(()=>{if(panelActive()&&section.isConnected&&!button.disabled&&button.getAttribute('aria-pressed')==='false')button.click();});
      }
    }
    section.dataset.requestKey=key;
    if(!compact||!enabled)section.append(status);section.append(grid,live);content.append(section);
  }
      if(panel==='chat'&&chat){
        let branchId=null;
        if(demo){try{window.RomanoDemoBranches?.context();branchId='primary';}catch{/* invalid demo branch */}}
        chat.render(content,{language:lang(),mode,branchId,tableCode:guestContext().code,profileId:profileId(),context:contextLabel(),brand:document.querySelector('[data-restaurant-brand]')?.textContent.trim(),onServices:host=>guestServices(host,element,demo,requestKinds,true),phoneUrl:restaurantDialUrl()});
      }else{
      if(panel==='waiter')guestServices(content,element,demo,['waiter']);
      if(demo&&panel!=='profile'&&panel!=='waiter')content.append(element('p',words.demo,'ramen-contact-note'));
      if(panel==='profile' && !window.RomanoCustomerEntry?.renderProfile(content,close))content.append(element('p',labels.guest,'ramen-contact-note'));
      if(panel==='feedback') {
        content.append(element('p',demo?labels.draft:labels.unavailable,'ramen-contact-note'));
        if(demo) {
          const review=window.RomanoDemoReview;
          let existing=null;try{existing=review.read(localStorage,tenant());}catch{/* invalid local data is not trusted */}
          const field=element('fieldset',null,'feedback-rating');field.append(element('legend',labels.rating));
          for(let n=1;n<=5;n++) {
            const label=element('label');const input=element('input');input.type='radio';input.name='demo-rating';input.value=String(n);input.checked=existing?.rating===n;
            label.append(input,element('span',String(n)));field.append(label);
          }
          const commentLabel=element("label",null,"feedback-comment");
          commentLabel.append(element("span",labels.comment));const comment=element("textarea");comment.maxLength=500;comment.rows=3;comment.dir='auto';comment.value=existing?.comment||"";commentLabel.append(comment);
          const button=element('button',labels.save,'feedback-save');button.type='button';button.disabled=!field.querySelector('input:checked');
          const status=element('p',null,'ramen-contact-note');status.setAttribute('role','status');
          field.addEventListener('change',()=>{button.disabled=false;status.textContent='';});
          button.addEventListener('click',()=>{const selected=Number(field.querySelector('input:checked')?.value);if(!Number.isInteger(selected)||selected<1||selected>5||!isDemo()||!content.isConnected||!dialog.open)return;try{const id=globalThis.crypto.randomUUID();review.submit(localStorage,tenant(),selected,comment.value,id);renderHeroRating();status.textContent=labels.saved;}catch{status.textContent=labels.storageError;}});
          content.append(field,commentLabel,button,status);
        }
      }
      }
  }
  function renderDemoProfile(host,member,{model,lang,el,text}){
  const profileWords={fa:['شماره تلفن','تاریخ عضویت','سفارش‌ها','امتیاز نمونه','پرداخت‌ها','تخفیف‌ها','هیچ پرداخت واقعی ثبت نشده است.','تخفیف فعال نمونه','تخفیف فعالی ندارید.','تخفیف‌های استفاده‌شده'],en:['Phone number','Member since','Orders','Sample points','Payments','Discounts','No real payments recorded.','Active sample discount','No active discount.','Used discounts'],tr:['Telefon numarası','Üyelik tarihi','Siparişler','Örnek puan','Ödemeler','İndirimler','Gerçek ödeme kaydı yok.','Etkin örnek indirim','Etkin indirim yok.','Kullanılan indirimler'],ar:['رقم الهاتف','تاريخ العضوية','الطلبات','نقاط تجريبية','المدفوعات','الخصومات','لا توجد مدفوعات حقيقية مسجلة.','خصم تجريبي نشط','لا يوجد خصم نشط.','الخصومات المستخدمة']};
  const w=profileWords[lang()]||profileWords.fa,nf=new Intl.NumberFormat(lang());
  const identity=el('section',undefined,'r27-profile-identity'),avatar=el('span',Array.from(member.name.trim())[0]||'R','r27-profile-avatar');
  avatar.setAttribute('aria-hidden','true');const identityCopy=el('div'),memberName=el('strong',member.name);memberName.dir='auto';
  const phone=el('span',member.phone);phone.dir='ltr';phone.setAttribute('aria-label',w[0]+': '+member.phone);
  identityCopy.append(memberName,phone,el('small',w[1]+' · '+new Date(member.createdAt).toLocaleDateString(lang())));identity.append(avatar,identityCopy);host.append(identity);
  const stats=el('section',undefined,'r27-profile-stats');
  for(const [label,value] of [[w[2],member.orders.length],[w[3],model.pointsFor(member)]]){const box=el('div');box.append(el('strong',nf.format(value)),el('small',label));stats.append(box);}host.append(stats);
  host.append(text('h3','history'));
  if(!member.orders.length)host.append(text('p','empty','ramen-contact-note'));
  for(const order of member.orders){
   const card=el('article',undefined,'ramen-contact-item');
   card.append(el('small',new Date(order.createdAt).toLocaleDateString(lang())));
   for(const item of order.items){const itemName=el('span',window.ROMANO_I18N.displayBrand(item.name)+' × '+item.quantity);itemName.dir='auto';card.append(itemName);if(item.note){const note=el('span',item.note,'hp-history-notes');note.dir='auto';card.append(note);}}
   if(order.notes){const note=el('span',order.notes,'hp-history-notes');note.dir='auto';card.append(note);}
   card.append(el('strong',order.currency&&window.OnlineMenuMoney?window.OnlineMenuMoney.formatCatalog(order.total,{currency:order.currency,language:lang()}):typeof formatPrice==='function'?formatPrice(order.total):String(order.total)));host.append(card);
  }
  host.append(el('h3',w[4]),el('p',w[6],'ramen-contact-note'),el('h3',w[5]));
  let cfg;try{cfg=model.settings(localStorage);}catch{}
  if(cfg?.coupon){const offer=el('article',undefined,'ramen-contact-item');offer.append(el('small',w[7]),el('strong',cfg.coupon+' · '+nf.format(cfg.percent)+'%'));host.append(offer);}else host.append(el('p',w[8],'ramen-contact-note'));
  const used=member.orders.filter(order=>order.offer);
  if(used.length){host.append(el('h4',w[9]));for(const order of used){const offer=el('article',undefined,'ramen-contact-item');offer.append(el('small',new Date(order.createdAt).toLocaleDateString(lang())),el('strong',order.offer.code+' · '+nf.format(order.offer.percent)+'%'));host.append(offer);}}
  }
  window.RomanoCustomerPanels=Object.freeze({render,renderDemoProfile});
})();
