/* Pure browser-local branch-directory domain model. Not server authentication or tenant isolation. */
(function(root,factory){
    const api=factory();
    if(typeof module==="object" && module.exports) module.exports=api;
    else root.RomanoDemoBranches=api;
})(globalThis,function factory(){
    "use strict";
    const VERSION = 1;
    const MAX_BRANCHES = 50;
    const validId = id => typeof id === "string" && /^[a-z0-9][a-z0-9-]{0,63}$/.test(id);
    const normalizedName = value => typeof value === "string" ? value.normalize("NFKC").trim().replace(/\s+/gu," ") : "";
    const validName = name => name.length > 0 && name.length <= 80 && !/[\p{Cc}\p{Cf}]/u.test(name);
    const nameKey = name => normalizedName(name).toLowerCase();
    const fail = code => { throw new Error(code); };
    function checkedName(value) {
        const name = normalizedName(value);
        if (!validName(name)) fail("INVALID_NAME");
        return name;
    }
    function validate(value) {
        if (!value || value.version !== VERSION || !Number.isSafeInteger(value.revision) || value.revision < 0 ||
            !Array.isArray(value.branches) || value.branches.length < 1 || value.branches.length > MAX_BRANCHES ||
            !validId(value.primaryId)) fail("INVALID_DIRECTORY");
        const ids = new Set(), names = new Set();
        const branches = value.branches.map(row => {
            if (!row || !validId(row.id) || typeof row.name !== "string" || !validName(row.name) ||
                row.name !== normalizedName(row.name) || typeof row.active !== "boolean" ||
                ids.has(row.id) || names.has(nameKey(row.name))) fail("INVALID_DIRECTORY");
            ids.add(row.id); names.add(nameKey(row.name));
            return {id:row.id, name:row.name, active:row.active};
        });
        if (!branches.some(row => row.id === value.primaryId && row.active)) fail("INVALID_DIRECTORY");
        return {version:VERSION, revision:value.revision, primaryId:value.primaryId, branches};
    }
    function initialize(id, name) {
        if (!validId(id)) fail("INVALID_ID");
        return validate({version:VERSION, revision:0, primaryId:id, branches:[{id,name:checkedName(name),active:true}]});
    }
    function evolve(value, operation) {
        const state = validate(value);
        if (!operation || typeof operation !== "object" || !validId(operation.id)) fail("INVALID_OPERATION");
        if (!Number.isSafeInteger(operation.expectedRevision) || operation.expectedRevision !== state.revision) fail("STALE_REVISION");
        const index = state.branches.findIndex(row => row.id === operation.id);
        const duplicate = name => state.branches.some(row => row.id !== operation.id && nameKey(row.name) === nameKey(name));
        switch (operation.type) {
            case "create": {
                if (index !== -1) fail("DUPLICATE_ID");
                if (state.branches.length >= MAX_BRANCHES) fail("LIMIT");
                const name = checkedName(operation.name);
                if (duplicate(name)) fail("DUPLICATE_NAME");
                state.branches.push({id:operation.id,name,active:true});
                break;
            }
            case "rename": {
                if (index === -1) fail("NOT_FOUND");
                const name = checkedName(operation.name);
                if (duplicate(name)) fail("DUPLICATE_NAME");
                if (state.branches[index].name === name) return state;
                state.branches[index].name = name;
                break;
            }
            case "set-active": {
                if (index === -1) fail("NOT_FOUND");
                if (typeof operation.active !== "boolean") fail("INVALID_OPERATION");
                if (operation.id === state.primaryId && !operation.active) fail("PRIMARY_REQUIRED");
                if (state.branches[index].active === operation.active) return state;
                state.branches[index].active = operation.active;
                break;
            }
            default: fail("INVALID_OPERATION");
        }
        if (state.revision === Number.MAX_SAFE_INTEGER) fail("REVISION_LIMIT");
        state.revision++;
        return validate(state);
    }
    return Object.freeze({VERSION,MAX_BRANCHES,initialize,validate,evolve});
});
