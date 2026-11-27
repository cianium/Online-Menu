import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const model=require('../../admin/revenue-model.js'),members=require('../../js/demo-members.js');
const now=new Date(2026,10,26,15);
const order=(id,day,total,currency='IRT',hour=10)=>({id,createdAt:new Date(2026,10,day,hour).toISOString(),total,currency});
test('Revenue buckets use local days, previous equal period, and exclude future and other currencies',()=>{
 const rows=[order('a',26,100),order('b',20,200),order('c',19,50),order('d',26,10,'TRY'),order('e',26,300,'IRT',16),{...order('f',26,99),currency:undefined}];
 const r=model.report(rows,'IRT',7,now);
 assert.equal(r.total,300);assert.equal(r.count,2);assert.equal(r.average,150);assert.equal(r.previousTotal,50);assert.equal(r.change,500);
 assert.equal(r.buckets.length,7);assert.equal(r.buckets[0].total,200);assert.equal(r.buckets[6].total,100);
 assert.equal(r.legacyCount,1);assert.equal(r.otherCurrencyCount,1);
 assert.deepEqual(model.currencies(rows),['IRT','TRY']);
});
test('Today hourly, annual monthly, empty and no baseline remain valid',()=>{
 const today=model.report([order('a',26,12)],'IRT',1,now);
 assert.equal(today.buckets.length,24);assert.equal(today.buckets[10].total,12);assert.equal(today.change,null);
 const year=model.report([],'IRT',365,now);assert.equal(year.buckets.length,13);assert.equal(year.total,0);assert.equal(year.average,0);
 assert.throws(()=>model.report([],'IRT',8,now));assert.throws(()=>model.report([],'IRR',7,now));
});
test('CSV contains only aggregate fields and the selected currency, not customer identity',()=>{
 const rows=model.orders([{name:'Private name',phone:'123456789',orders:[order('a',26,50)]}]);
 const csv=model.csv(model.report(rows,'IRT',7,now));
 assert.equal(csv.split('\r\n').filter(Boolean).length,8);
 assert.match(csv,/2026-11-26,2026-11-26,,IRT,50,1,50/);
 assert.doesNotMatch(csv,/Private name|123456789/);
 assert.throws(()=>model.orders([{orders:[rows[0],rows[0]]}]),/DUPLICATE_ORDER/);
});
test('Decimal sample amounts stay exact in bucket totals and CSV',()=>{
 const r=model.report([order('a',26,0.1,'USD'),order('b',26,0.2,'USD')],'USD',7,now);
 assert.equal(r.total,0.3);
 assert.equal(r.buckets.at(-1).total,0.3);
 assert.match(model.csv(r),/,USD,0\.3,2,0\.15\r\n/);
});
test('New sample orders snapshot catalog currency; old records remain readable without attribution',()=>{
 const store=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
 const db=store(),session=store();members.register(db,session,'Sample','123456789');
 const item=[{name:'Dish',price:5,quantity:1}];
 assert.equal(members.addOrder(db,session,item,5,'IRR').currency,'IRT');
 assert.equal(members.addOrder(db,session,item,5,'TRY').currency,'TRY');
 const data=members.read(db);delete data[0].orders[0].currency;db.setItem(members.key,JSON.stringify(data));
 assert.equal(members.read(db)[0].orders[0].currency,undefined);
});

test('Counts distinct ordering customers and ranks recorded item quantities inside the selected period and currency',()=>{
 const dish=(name,quantity)=>({name,quantity});
 const rows=model.orders([
   {orders:[{...order('a',26,20),items:[dish('Tea',2)]},{...order('b',25,20),items:[dish('Soup',3)]}]},
   {orders:[{...order('c',26,10),items:[dish('Tea',2)]},{...order('d',10,99),items:[dish('Cake',8)]}]},
   {orders:[{...order('e',26,2,'USD'),items:[dish('Cake',17)]}]}
 ]);
 const result=model.report(rows,'IRT',7,now);
 assert.equal(result.customers,2);
 assert.deepEqual(result.topItems,[['Tea',4],['Soup',3]]);
 assert.doesNotMatch(model.csv(result),/Tea|Soup/);
});
