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
  window.RomanoCustomerPanels=Object.freeze({render});
})();
