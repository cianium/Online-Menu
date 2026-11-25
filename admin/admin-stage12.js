/* Stage 12: UI-only operations. Local drafts never cross into a connected tenant. */
(() => {
    'use strict';
    const model = window.AdminStage12Model;
    const ruleKey = 'online_menu_loyalty_drafts_v1:romano';
    const ratingKey = 'online_menu_demo_rating:romano';
    const reviewModel = window.RomanoDemoReview;
    const reviewKey = reviewModel.key('romano');
    let displayedReview = null;
    const t = key => window.ROMANO_ADMIN_I18N.get(key);
    const local = () => typeof adminInitialized !== 'undefined' && adminInitialized && !window.RomanoAPI?.enabled && !document.querySelector('.admin-app').inert;
    const $ = id => document.getElementById(id);
    const make = (tag, text, cls) => { const node=document.createElement(tag); if(text!==undefined) node.textContent=text; if(cls) node.className=cls; return node; };
    const userText = (tag,text,cls) => {const node=make(tag,text,cls);node.dataset.adminUserText='true';return node;};
    const format = n => new Intl.NumberFormat(document.documentElement.lang).format(n);
    let orderSummary = {available:false};
    let editing = null, drafts = [], baseline = null, draftsReadable = true;
    const triggers = {birthday:'تولد','new-year':'سال نو','first-purchase':'اولین خرید',threshold:'حداقل مبلغ خرید',custom:'مناسبت دلخواه'};
    const rewards = {none:'بدون پاداش',percent:'درصد تخفیف',fixed:'مبلغ تخفیف',gift:'هدیه'};
    function renderOrders() {
        const available = orderSummary.available && window.RomanoAPI?.enabled && Number.isSafeInteger(orderSummary.count) && orderSummary.count>=0;
        $('overview-order-count').textContent = available ? format(orderSummary.count) : '—';
        $('overview-order-note').textContent = t(available ? (orderSummary.limited?'بر اساس حداکثر ۱۰۰ سفارش اخیر':'بر اساس سفارش‌های دریافت‌شده') : 'داده زنده در دسترس نیست.');
        const breakdown=$('overview-order-breakdown');breakdown.hidden=!available;
        for(const item of breakdown.querySelectorAll('[data-order-metric]')){
            const n=orderSummary.counts?.[item.dataset.orderMetric];item.textContent=available&&Number.isSafeInteger(n)&&n>=0?format(n):'—';
        }
    }
    function renderRating() {
        const value = $('overview-rating-value'), note = $('overview-rating-note'), actions = $('overview-rating-actions'), comment = $('overview-rating-comment');
        displayedReview=null; value.textContent='—'; actions.hidden=true; comment.hidden=true; comment.textContent='';
        note.textContent=t('امتیاز تأییدشده در دسترس نیست.');
        if (!local()) return;
        try {
            const review=reviewModel.read(localStorage,'romano');
            if (!review) return;
            displayedReview=review;
            if(review.status==='approved') {
                value.textContent=`${format(review.rating)} / ${format(5)}`; note.textContent=t('یک امتیاز آزمایشی تأییدشده در همین مرورگر');
            } else if(review.status==='rejected') {
                note.textContent=t('امتیاز آزمایشی رد شد.');
            } else {
                note.textContent=`${t('امتیاز آزمایشی در انتظار بررسی')}: ${format(review.rating)} / ${format(5)}`;
            }
            comment.textContent=review.comment;comment.hidden=!review.comment;
            actions.hidden=false;
        } catch { note.textContent=t('خواندن داده محلی ممکن نیست.'); }
    }
    function status(key) { $('loyalty-status').textContent=t(key); }
    function updateFields() {
        const form=$('loyalty-form'), f=form.elements;
        for (const [id,name,show] of [['loyalty-threshold','threshold',f.trigger.value==='threshold'],['loyalty-custom','condition',f.trigger.value==='custom'],['loyalty-value','value',['percent','fixed'].includes(f.reward.value)],['loyalty-gift','gift',f.reward.value==='gift']]) {
            $(id).hidden=!show; f[name].disabled=!show; f[name].required=show;
        }
        f.value.max=f.reward.value==='percent'?'100':'1000000000000';
    }
    function updatePreview(){
        const message=$('loyalty-form').elements.message.value;
        $('loyalty-message-preview').textContent=message||t('پیش‌نمایش متن پیامک');
        $('loyalty-message-count').textContent=`${format(message.length)} / ${format(500)}`;
    }
    function lockDraftActions(){
        const editingForm=!$('loyalty-form').hidden;
        $('loyalty-add').disabled=editingForm||!draftsReadable;
        $('loyalty-list').querySelectorAll('button').forEach(button=>button.disabled=editingForm);
    }
    function renderDrafts() {
        const list=$('loyalty-list'), add=$('loyalty-add'), form=$('loyalty-form');
        const available=local(); list.replaceChildren(); add.hidden=!available; $('loyalty-connected').hidden=available;
        if(!available){form.hidden=true; return;}
        if(!drafts.length) list.append(make('p',t('هنوز پیش‌نویسی ثبت نشده است.'),'panel'));
        for(const rule of drafts) {
            const card=make('article',undefined,'panel loyalty-card');
            const top=make('div',undefined,'loyalty-card-heading');
            top.append(userText('h2',rule.name), make('span',t(rule.enabled?'پیش‌نویس فعال':'پیش‌نویس غیرفعال'),'loyalty-badge'));
            card.append(top,make('p',`${t(triggers[rule.trigger])} · ${t(rewards[rule.reward])}`));
            if(rule.threshold) card.append(make('p',`${t('حداقل مبلغ خرید')}: ${format(rule.threshold)}`));
            if(rule.value) card.append(make('p',`${t('مقدار تخفیف')}: ${format(rule.value)}${rule.reward==='percent'?'%':''}`));
            if(rule.condition) card.append(userText('p',rule.condition));
            if(rule.gift) card.append(userText('p',rule.gift));
            if(rule.expires) card.append(make('p',`${t('تاریخ انقضا')}: ${rule.expires}`));
            card.append(userText('p',rule.message,'loyalty-preview'));
            const row=make('div',undefined,'loyalty-actions');
            for(const [action,label] of [['edit','ویرایش'],['toggle',rule.enabled?'غیرفعال‌کردن':'فعال‌کردن'],['delete','حذف']]) {
                const button=make('button',t(label),'secondary-button');button.type='button';button.dataset.ruleAction=action;button.dataset.id=rule.id;row.append(button);
            }
            card.append(row);list.append(card);
        }
        lockDraftActions();
    }
    function reloadDrafts() {
        if(!local()){drafts=[];baseline=null;renderDrafts();return false;}
        try { baseline=localStorage.getItem(ruleKey);drafts=model.readRules(baseline);draftsReadable=true;renderDrafts();return true; }
        catch {drafts=[];baseline=null;draftsReadable=false;renderDrafts();$('loyalty-add').disabled=true;status('خواندن داده محلی ممکن نیست.');return false;}
    }
    function save(next) {
        if(!local())return false;
        try {
            if(localStorage.getItem(ruleKey)!==baseline){status('پیش‌نویس در تب دیگری تغییر کرده است. دوباره صفحه را باز کنید.');return false;}
            const raw=JSON.stringify(next);model.readRules(raw);localStorage.setItem(ruleKey,raw);baseline=raw;drafts=next;renderDrafts();status('پیش‌نویس فقط در این مرورگر ذخیره شد.');return true;
        } catch {status('ذخیره انجام نشد. اطلاعات فرم حفظ شده است؛ دوباره تلاش کنید.');return false;}
    }
    function openRule(rule) {
        if(!local())return;
        const form=$('loyalty-form');form.reset();editing=rule?.id??null;
        if(rule)for(const key of ['name','trigger','threshold','condition','reward','value','gift','message','expires'])form.elements[key].value=rule[key]??'';
        form.hidden=false;updateFields();updatePreview();lockDraftActions();form.elements.name.focus();
    }
    function init() {
        const form=$('loyalty-form');
        $('loyalty-add').addEventListener('click',()=>{if(!form.hidden||!reloadDrafts())return;if(drafts.length>=100){status('حداکثر ۱۰۰ پیش‌نویس مجاز است.');return;}openRule(null);});
        $('loyalty-cancel').addEventListener('click',async()=>{if(!await window.RomanoConfirm(t('پیش‌نویس ذخیره‌نشده کنار گذاشته شود؟')))return;form.hidden=true;editing=null;reloadDrafts();$('loyalty-add').focus();});
        form.addEventListener('change',updateFields);
        form.addEventListener('input',updatePreview);
        window.addEventListener('beforeunload',event=>{if(local()&&!form.hidden){event.preventDefault();event.returnValue='';}});
        form.addEventListener('submit',event=>{
            event.preventDefault();if(!local())return;
            const rule=model.validateRule(Object.fromEntries(new FormData(form)));
            if(!rule){status('اطلاعات قانون معتبر نیست.');return;}
            const previous=drafts.find(item=>item.id===editing);
            if(editing&&!previous){status('اطلاعات قانون معتبر نیست.');return;}
            const item={...rule,id:previous?.id??(globalThis.crypto?.randomUUID?.()||`draft-${Date.now()}-${Math.random().toString(36).slice(2)}`),enabled:previous?.enabled??false};
            if(save(previous?drafts.map(r=>r.id===editing?item:r):[...drafts,item])){form.hidden=true;editing=null;lockDraftActions();$('loyalty-add').focus();}
        });
        $('loyalty-list').addEventListener('click',async event=>{
            const button=event.target.closest('[data-rule-action]');if(!button||!local()||!form.hidden)return;
            const rule=drafts.find(item=>item.id===button.dataset.id);if(!rule)return;
            if(button.dataset.ruleAction==='edit'){openRule(rule);return;}
            if(button.dataset.ruleAction==='toggle'){save(drafts.map(r=>r.id===rule.id?{...r,enabled:!r.enabled}:r));return;}
            if(button.dataset.ruleAction==='delete'){const expectedBaseline=baseline;if(await window.RomanoConfirm(t('این پیش‌نویس حذف شود؟'))){if(baseline!==expectedBaseline||!form.hidden){status('پیش‌نویس در تب دیگری تغییر کرده است. دوباره صفحه را باز کنید.');return;}save(drafts.filter(r=>r.id!==rule.id));}}
        });
        $('overview-rating-actions').addEventListener('click',event=>{
            const action=event.target.closest('[data-rating-action]')?.dataset.ratingAction;if(!local()||!['approve','reject'].includes(action))return;
            try {const updated=reviewModel.moderate(localStorage,'romano',displayedReview,action==='approve'?'approved':'rejected');renderRating();if(!updated)$('overview-rating-note').textContent=t('نظر تغییر کرده است؛ دوباره بررسی کنید.');}catch{$('overview-rating-note').textContent=t('خواندن داده محلی ممکن نیست.');}
        });
        document.addEventListener('romano:orders-summary',event=>{orderSummary=event.detail;renderOrders();});
        document.addEventListener('romano:admin-page-changed',event=>{
            if(event.detail.page==='loyalty' && form.hidden) reloadDrafts();
            if(event.detail.page==='dashboard')renderRating();
            if(event.detail.page==='loyalty'&&!local())renderDrafts();
        });
        document.addEventListener('romano:language-changed',()=>{renderOrders();renderRating();renderDrafts();updatePreview();});
        document.addEventListener('romano:dashboard-rendered',()=>{queueMicrotask(renderRating);});
        window.addEventListener('storage',event=>{if(event.key===ratingKey||event.key===reviewKey||event.key===null)renderRating();if((event.key===ruleKey||event.key===null)&&local()){if(form.hidden)reloadDrafts();else status('پیش‌نویس در تب دیگری تغییر کرده است. دوباره صفحه را باز کنید.');}});
        updateFields();renderRating();renderOrders();
    }
    document.addEventListener('DOMContentLoaded',init,{once:true});
})();
