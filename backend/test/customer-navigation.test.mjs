import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");

test("Cart stays accessible from header and mobile nav",()=>{
 const html=read("index.html"),js=read("js/commerce.js");
 assert.match(html,/id="ramen-header-cart"/);
 assert.match(html,/id="ramen-bottom-cart"/);
 assert.match(html,/aria-controls="commerce-drawer"/);
 assert.match(js,/initializeCustomerNavigation\(\)/);
 assert.match(js,/updateCustomerNavigation\(\)/);
 assert.match(js,/document\.getElementById\(id\)\?\.addEventListener\("click",openDrawer\)/);
});
test("Nav links map only to existing content",()=>{
 const html=read("index.html");
 for(const target of ["home","menu","featured","contact"]) {
  assert.match(html,new RegExp('href="#'+target+'"'));
  assert.match(html,new RegExp('id="'+target+'"'));
 }
});
test("Four-language navigation and accessible responsive layout",()=>{
 const js=read("js/commerce.js"),css=read("css/ramen-navigation.css"),sw=read("sw.js");
 for(const locale of ["fa","en","tr","ar"])assert.match(js,new RegExp(locale+':\\{home:'));
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css, /safe-area-inset-bottom/);
 assert.match(css,/:focus-visible/);
 assert.match(sw,/css\/ramen-navigation\.css/);
});
