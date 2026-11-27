/* On-demand customer panels; shared state is passed explicitly by commerce.js. */
(() => {
  "use strict";
  function render(deps) {
    const {panel,content,element,demo,mode,labels,words,chat,profileId,lang,h,x,panelText,guestContext,contextLabel,config,tenant,renderHeroRating,close,openPanel,origin,dialog,isDemo}=deps;
    const requestKinds=["waiter","bill","water","napkin"];
  function guestServices(content, element, demo, kinds=requestKinds, compact=false) {
    const section=element("section",null,"hp-services");
    section.classList.toggle("connect-service-compact",compact);
    section.append(element("h3",h("quick")));if(!compact)section.append(element("p",contextLabel(),"hp-context"));
    const context=guestContext();
    const enabled=demo && Boolean(context.code) && Boolean(navigator.locks?.request);
    const model=window.RomanoDemoMembers;
    const key= model.requestPrefix+context.code;
    const status=element("p",enabled?h("local"):demo&&!context.code?h("selectTable")+" "+h("local"):demo?panelText().storageError:h("unconnected"),"hp-service-notice");
    const grid=element("div",null,"hp-service-grid");
    const live=element("p",null,"hp-service-live");live.setAttribute("role","status");
    function readRequests() {
      try{return enabled?model.requestDetails(localStorage,context.code):{};}catch{live.textContent=panelText().storageError;return null;}
    }
    const icons={waiter:"M3 17h18M5 17a7 7 0 0 1 14 0M12 7V5m-2 0h4M2 20h20",bill:"M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6",water:"M12 3c-2 4-6 8-6 12a6 6 0 0 0 12 0c0-4-4-8-6-12Z",napkin:"M4 4h16v16H4zM4 20 20 4M12 12h8v8"};
    for(const kind of kinds) {
      const button=element("button",null,"hp-service-action");button.type="button";button.disabled=!enabled;
      const icon=document.createElementNS("http://www.w3.org/2000/svg","svg");icon.setAttribute("viewBox","0 0 24 24");icon.setAttribute("class","hp-service-icon");icon.setAttribute("aria-hidden","true");icon.setAttribute("focusable","false");
      const stroke=document.createElementNS("http://www.w3.org/2000/svg","path");stroke.setAttribute("d",icons[kind]);icon.append(stroke);
      const label=element("strong",h(kind));const detail=element("span",null,"hp-service-detail");
      button.append(icon,label,detail);
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
        if(!section.isConnected||!isDemo()||guestContext().code!==context.code||!enabled||inFlight)return;
        const before=displayed?.state,expectedId=displayed?.id??null,next=before==="pending"?undefined:"pending";
        inFlight=true;button.disabled=true;
        try {
          await model.mutateRequest(context.code,()=>{
            if(!section.isConnected||!isDemo()||guestContext().code!==context.code)throw Error("HP_TABLE");
            return model.setRequest(localStorage,context.code,kind,next,before,expectedId);
          });
          live.textContent=h(kind)+" — "+h(next?"request":"cancel")+" · "+h("local");
        }catch{live.textContent=panelText().storageError;}
        finally{inFlight=false;section.dispatchEvent(new Event("hp-request-updated"));}
      });
      section.addEventListener("hp-request-updated",refresh);
      refresh();grid.append(button);
    }
    section.dataset.requestKey=key;
    section.append(status,grid,live);content.append(section);
  }
      if(panel==='chat'&&chat){
        let branchId=null;
        if(demo){try{window.RomanoDemoBranches?.context();branchId='primary';}catch{/* invalid demo branch */}}
        chat.render(content,{language:lang(),mode,branchId,tableCode:guestContext().code,profileId:profileId(),context:contextLabel(),brand:document.querySelector('[data-restaurant-brand]')?.textContent.trim(),onServices:host=>guestServices(host,element,demo,requestKinds,true),onContact:()=>openPanel('contact',origin,true),onLanguage:value=>window.ROMANO_I18N.setLanguage(value,false)});
      }else{
      if(panel==='waiter')guestServices(content,element,demo,['waiter']);
      if(panel==='contact'){
        const identity=element('div',null,'hp-identity');
        const brand=element('strong',document.querySelector('[data-restaurant-brand]')?.textContent.trim() || 'RAMEN');
        identity.append(brand,element('span',contextLabel(),'hp-context'));content.append(identity);
        guestServices(content,element,demo);
      }else if(demo)content.append(element('p',words.demo,'ramen-contact-note'));
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
          commentLabel.append(element("span",labels.comment));const comment=element("textarea");comment.maxLength=500;comment.rows=3;comment.value=existing?.comment||"";commentLabel.append(comment);
          const button=element('button',labels.save,'feedback-save');button.type='button';button.disabled=!field.querySelector('input:checked');
          const status=element('p',null,'ramen-contact-note');status.setAttribute('role','status');
          field.addEventListener('change',()=>{button.disabled=false;status.textContent='';});
          button.addEventListener('click',()=>{const selected=Number(field.querySelector('input:checked')?.value);if(!Number.isInteger(selected)||selected<1||selected>5||menuDataMode!=="demo")return;try{const id=globalThis.crypto.randomUUID();review.submit(localStorage,tenant(),selected,comment.value,id);renderHeroRating();status.textContent=labels.saved;}catch{status.textContent=labels.storageError;}});
          content.append(field,commentLabel,button,status);
        }
      }
      const appendInfo=(label,value,href,direction)=>{
        if(!value)return;
        const item=element(href?'a':'div',null,'ramen-contact-item');
        if(href){item.href=href;if(href.startsWith('https:')||href.startsWith('http:')){item.target='_blank';item.rel='noopener noreferrer';}}
        const valueNode=element('span',value);
        if(direction)valueNode.dir=direction;
        item.append(element('small',label),valueNode);content.append(item);
      };
      // Read only the current rendered restaurant information. Never introduce a fake chat or map destination.
      const address=document.querySelector('[data-restaurant-address]')?.textContent.trim();
      const phone=document.querySelector('[data-restaurant-phone]')?.textContent.trim();
      const social=document.querySelector('[data-restaurant-instagram]')?.getAttribute('href');
      if((panel==='contact'||panel==='chat') && (demo || mode==='public' || mode==='offline') && phone)appendInfo(words.phone,phone,!demo && /^\+?[\d\s().-]{5,25}$/.test(phone)?'tel:'+phone.replace(/[^+\d]/g,''):null,'ltr');
      if(panel==='contact' && (demo || mode==='public' || mode==='offline') && address)appendInfo(words.address,address,null,'auto');
      if((panel==='contact'||panel==='chat') && social && /^https?:\/\//i.test(social) && (mode==='public' || mode==='offline')){const url=getSafeExternalUrl(social);if(url)appendInfo(words.social,words.social,url);}
      if(panel==='contact'){
        {const backToChat=element('button',chat?chat.words(lang()).chat:labels.chat,chat?'connect-secondary':'feedback-save');backToChat.type='button';backToChat.dataset.connectChat='';backToChat.addEventListener('click',()=>openPanel('chat',origin,true));content.prepend(backToChat);}
        if(!content.querySelector('.ramen-contact-item'))content.append(element('p',words.missing,'ramen-contact-note'));
        const cfg=config();
        if(cfg?.hours[lang()])appendInfo(x(8),cfg.hours[lang()],null);
        if(cfg?.map)appendInfo(x(9),x(9),cfg.map);
        if(cfg?.whatsapp)appendInfo(x(10),x(10),cfg.whatsapp);
        if(demo)content.append(element('p',words.demo,'ramen-contact-note'));
        const actions=element('div',null,'hp-contact-actions');
        if(address && navigator.clipboard?.writeText && (demo||mode==='public'||mode==='offline')){
          const copy=element('button',h('copy'));copy.type='button';
          const result=element('p',null,'hp-service-live');result.setAttribute('role','status');
          copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(address);result.textContent=h('copied');}catch{result.textContent=h('copyFailed');}});
          actions.append(copy,result);
        }
        const feedback=element('button',h('review'));feedback.type='button';
        feedback.addEventListener('click',()=>{const previous=origin;dialog.addEventListener('close',()=>openPanel('feedback',previous),{once:true});close();});
        actions.append(feedback);content.append(actions);
      }
      }
  }
  window.RomanoCustomerPanels=Object.freeze({render});
})();
