import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const model=require('../../js/demo-branches.js');
function suite(test,assert,model){
    const init=()=>model.initialize("primary","Main branch");
    const op=(state,type,id,extra={})=>model.evolve(state,{type,id,expectedRevision:state.revision,...extra});
    test("Directory starts with a stable active primary branch",()=>{
        const s=init(); assert.equal(s.primaryId,"primary"); assert.equal(s.revision,0); assert.deepEqual(s.branches,[{id:"primary",name:"Main branch",active:true}]);
    });
    test("Create multilingual names without mutating previous state",()=>{
        const s=init(), a=op(s,"create","branch-2",{name:"  شعبه   دوم  "}), b=op(a,"create","branch-3",{name:"İstanbul Şubesi"}), c=op(b,"create","branch-4",{name:"فرع باكو"});
        assert.equal(s.branches.length,1); assert.equal(c.revision,3); assert.equal(c.branches[1].name,"شعبه دوم"); assert.equal(c.branches[2].name,"İstanbul Şubesi"); assert.equal(c.branches[3].name,"فرع باكو");
    });
    test("Reject duplicate IDs and case/width/space-normalized names",()=>{
        const s=init(); assert.throws(()=>op(s,"create","primary",{name:"Other"}),/DUPLICATE_ID/); assert.throws(()=>op(s,"create","second",{name:"ＭＡＩＮ  branch"}),/DUPLICATE_NAME/);
    });
    test("Reject invalid IDs, blank/oversize names and hidden controls",()=>{
        const s=init(); assert.throws(()=>op(s,"create","../x",{name:"Other"}),/INVALID_OPERATION/);
        for(const name of [" ","x".repeat(81),"a\u202eb",null]) assert.throws(()=>op(s,"create","second",{name}),/INVALID_NAME/);
    });
    test("Rename preserves identity and rejects collisions",()=>{
        const s=op(init(),"create","second",{name:"Second"}), a=op(s,"rename","second",{name:"New name"});
        assert.equal(a.branches[1].id,"second"); assert.equal(a.branches[1].name,"New name"); assert.equal(s.branches[1].name,"Second"); assert.throws(()=>op(s,"rename","second",{name:"main branch"}),/DUPLICATE_NAME/);
    });
    test("Archive and reactivate retain IDs; primary cannot be archived",()=>{
        const s=op(init(),"create","second",{name:"Second"}), a=op(s,"set-active","second",{active:false}), b=op(a,"set-active","second",{active:true});
        assert.equal(a.branches[1].active,false); assert.equal(b.branches[1].active,true); assert.equal(b.branches[1].id,"second"); assert.throws(()=>op(s,"set-active","primary",{active:false}),/PRIMARY_REQUIRED/); assert.throws(()=>op(a,"create","third",{name:"Second"}),/DUPLICATE_NAME/);
    });
    test("Stale revisions and unknown operations fail closed",()=>{
        const s=op(init(),"create","second",{name:"Second"});
        assert.throws(()=>op(s,"rename","second",{name:"New",expectedRevision:0}),/STALE_REVISION/); assert.throws(()=>op(s,"delete","second"),/INVALID_OPERATION/); assert.throws(()=>op(s,"rename","missing",{name:"New"}),/NOT_FOUND/);
    });
    test("Corrupt persisted directories are rejected; validated data is copied",()=>{
        const s=init(), a=model.validate(s); a.branches[0].name="Changed"; assert.equal(s.branches[0].name,"Main branch");
        assert.throws(()=>model.validate({...s,version:2}),/INVALID_DIRECTORY/); assert.throws(()=>model.validate({...s,branches:[]}),/INVALID_DIRECTORY/); assert.throws(()=>model.validate({...s,branches:[{...s.branches[0],active:false}]}),/INVALID_DIRECTORY/); assert.throws(()=>model.validate({...s,branches:[...s.branches,...s.branches]}),/INVALID_DIRECTORY/);
    });
    test("Directory size is bounded; no-op does not increment revision",()=>{
        let s=init(); assert.equal(op(s,"rename","primary",{name:"Main branch"}).revision,0);
        for(let i=1;i<model.MAX_BRANCHES;i++) s=op(s,"create",`b-${i}`,{name:`Branch ${i}`});
        assert.equal(s.branches.length,model.MAX_BRANCHES); assert.throws(()=>op(s,"create","overflow",{name:"Overflow"}),/LIMIT/);
    });
}
suite(test,assert,model);
