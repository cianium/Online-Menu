import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const src=fs.readFileSync(path.join(root,"js/commerce.js"),"utf8");
test("Cart dialog has a keyboard focus boundary and Escape closes it",()=>{
 assert.match(src,/event\.key==="Tab"/);
 assert.match(src,/event\.key==="Escape"/);
 assert.match(src,/event\.preventDefault\(\);last\.focus\(\)/);
 assert.match(src,/event\.preventDefault\(\);first\.focus\(\)/);
 assert.match(src,/tabindex="-1" inert/);
});
test("Cart restores focus to its originating control",()=>{
 assert.match(src,/cartFocusOrigin = document\.activeElement/);
 assert.match(src,/cartFocusOrigin\?\.isConnected/);
 assert.match(src,/cartFocusOrigin\.focus\(\)/);
});
