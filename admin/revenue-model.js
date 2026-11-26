/* Pure sample-order analytics. Never represents verified payments. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RomanoRevenueModel=api;})(globalThis,()=>{
  "use strict";
  const periods=[1,7,30,365], DAY=86400000, SCALE=1000;
  const dayKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const ordinal=d=>Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/DAY;
  const key=n=>new Date(n*DAY).toISOString().slice(0,10);
  const validCurrency=c=>typeof c==='string'&&/^[A-Z]{3}$/.test(c)&&c!=='IRR';
  function orders(members){
    const result=[],ids=new Set();
    for(const member of members)for(const order of member.orders){
      if(ids.has(order.id))throw Error('DUPLICATE_ORDER');
      ids.add(order.id);
      if(!Number.isFinite(order.total)||order.total<=0||order.total>Number.MAX_SAFE_INTEGER/SCALE||!Number.isFinite(Date.parse(order.createdAt)))throw Error('INVALID_ORDER');
      result.push(order);
    }
    return result;
  }
  function currencies(rows){return [...new Set(rows.filter(o=>validCurrency(o.currency)).map(o=>o.currency))].sort();}
  function report(rows,currency,days,now=new Date()){
    if(!periods.includes(days)||!validCurrency(currency)||!Number.isFinite(now.getTime()))throw Error('INVALID_FILTER');
    const end=ordinal(now),start=end-days+1,previousStart=start-days;
    const buckets=[],lookup=new Map();
    if(days===1){
      for(let h=0;h<24;h++)buckets.push({start:key(end),end:key(end),hour:h,total:0,count:0});
    }else{
      for(let n=start;n<=end;n++){
        const date=key(n),group=days===365?date.slice(0,7):date;
        if(!lookup.has(group)){const b={start:date,end:date,hour:null,total:0,count:0};lookup.set(group,b);buckets.push(b);}
        lookup.get(group).end=date;
      }
    }
    let total=0,count=0,previousTotal=0,previousCount=0,legacyCount=0,otherCurrencyCount=0;
    for(const o of rows){
      const date=new Date(o.createdAt),n=ordinal(date);
      if(date>now||n<previousStart||n>end)continue;
      if(!validCurrency(o.currency)){legacyCount++;continue;}
      if(o.currency!==currency){otherCurrencyCount++;continue;}
      const amount=Math.round(o.total*SCALE);
      if(n<start){previousTotal+=amount;previousCount++;continue;}
      const b=days===1?buckets[date.getHours()]:lookup.get(days===365?dayKey(date).slice(0,7):dayKey(date));
      b.total+=amount;b.count++;total+=amount;count++;
    }
    if(!Number.isSafeInteger(total)||!Number.isSafeInteger(previousTotal))throw Error('TOTAL_LIMIT');
    total/=SCALE;
    previousTotal/=SCALE;
    for(const bucket of buckets)bucket.total/=SCALE;
    return {currency,days,start:key(start),end:key(end),previousStart:key(previousStart),previousEnd:key(start-1),total,count,average:count?total/count:0,previousTotal,previousCount,change:previousTotal?(total-previousTotal)/previousTotal*100:null,legacyCount,otherCurrencyCount,buckets};
  }
  function csv(r){
    const lines=['start_date,end_date,local_hour,currency,sample_order_total,sample_order_count,average_order_amount'];
    for(const b of r.buckets)lines.push([b.start,b.end,b.hour===null?'':b.hour,r.currency,b.total,b.count,b.count?Number((b.total/b.count).toFixed(3)):0].join(','));
    return lines.join('\r\n')+'\r\n';
  }
  return Object.freeze({orders,currencies,report,csv,validCurrency});
});
