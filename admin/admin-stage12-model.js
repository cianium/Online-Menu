/* Local-only rule drafts and input validation. No SMS, discount or network execution. */
(function (root) {
    "use strict";
    const triggers = new Set(['birthday','new-year','first-purchase','threshold','custom']);
    const rewards = new Set(['none','percent','fixed','gift']);
    function clean(value, max) { return typeof value === 'string' ? value.trim().slice(0,max) : ''; }
    function positiveInteger(value, max) { if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value))) return null; const n = Number(value); return Number.isSafeInteger(n) && n > 0 && n <= max ? n : null; }
    function date(value) {
        if (!value) return '';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
        const parsed = new Date(`${value}T00:00:00Z`);
        return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0,10) !== value ? null : value;
    }
    function validateRule(input) {
        if (!input || typeof input !== 'object') return null;
        const name = clean(input.name,100), message = clean(input.message,500);
        const trigger = input.trigger, reward = input.reward;
        if (!name || !message || !triggers.has(trigger) || !rewards.has(reward)) return null;
        const threshold = trigger === 'threshold' ? positiveInteger(input.threshold,1e12) : null;
        const condition = trigger === 'custom' ? clean(input.condition,200) : '';
        const value = ['percent','fixed'].includes(reward) ? positiveInteger(input.value,reward === 'percent' ? 100 : 1e12) : null;
        const gift = reward === 'gift' ? clean(input.gift,200) : '';
        const expires = date(input.expires);
        if ((trigger==='threshold' && !threshold) || (trigger==='custom' && !condition) || (['percent','fixed'].includes(reward) && !value) || (reward==='gift' && !gift) || expires===null) return null;
        return {name,trigger,threshold,condition,reward,value,gift,message,expires};
    }
    function readRules(raw) {
        const parsed = JSON.parse(raw ?? '[]');
        if (!Array.isArray(parsed) || parsed.length > 100) throw new Error('Invalid draft collection');
        const ids = new Set();
        return parsed.map(item => {
            const rule = validateRule(item);
            if (!rule || typeof item.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(item.id) || ids.has(item.id)) throw new Error('Invalid draft');
            ids.add(item.id);
            return {...rule,id:item.id,enabled:item.enabled === true};
        });
    }
    function validPhone(raw) {
        if (typeof raw !== 'string') return false;
        const value = raw.trim().replace(/[۰-۹٠-٩]/g, ch => String(ch.charCodeAt(0) - (ch >= '۰' ? 1776 : 1632)));
        return !value || (/^\+?[\d\s().-]+$/.test(value) && /^\d{5,20}$/.test(value.replace(/\D/g,'')));
    }
    function validSocialUrl(raw) {
        if (raw == null || raw === '' || raw === '#') return true;
        if (typeof raw !== 'string' || raw.length > 500) return false;
        try { const url = new URL(raw); return ['https:','http:'].includes(url.protocol) && !url.username && !url.password && Boolean(url.hostname); }
        catch { return false; }
    }
    function localRating(value) { return Number.isInteger(value) && value >= 1 && value <= 5 ? value : null; }
    function moveCategory(items, id, delta) {
        if (!Array.isArray(items) || ![-1,1].includes(delta)) return null;
        const index = items.findIndex(item => item.id === id), destination = index + delta;
        if (index < 0 || destination < 0 || destination >= items.length) return null;
        const next = [...items]; [next[index],next[destination]] = [next[destination],next[index]];
        return next.map((item,sortOrder)=>({...item,sortOrder}));
    }
    // The existing API returns at most 100 most recent orders, not a complete history.
    function summarizeOrders(rows) {
        if (!Array.isArray(rows) || rows.length > 100) return null;
        const seen=new Set(), counts={submitted:0,preparing:0,ready:0,other:0};
        const valid=new Set(['submitted','accepted','preparing','ready','served','delivered','completed','rejected','cancelled']);
        for(const row of rows){
            if(!row||typeof row.id!=='string'||!row.id||seen.has(row.id)||!valid.has(row.status))return null;
            seen.add(row.id);
            if(row.status==='submitted')counts.submitted++;
            else if(['accepted','preparing'].includes(row.status))counts.preparing++;
            else if(row.status==='ready')counts.ready++;
            else if(['served','delivered'].includes(row.status))counts.other++;
        }
        return {count:Object.values(counts).reduce((a,b)=>a+b,0),counts,sampleSize:rows.length,limited:rows.length===100};
    }
    const api = Object.freeze({validateRule,readRules,validPhone,validSocialUrl,localRating,moveCategory,summarizeOrders});
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.AdminStage12Model = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
