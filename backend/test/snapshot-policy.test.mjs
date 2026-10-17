import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSnapshotPermissions } from '../lib/snapshot-policy.mjs';
const current = { restaurant: { name: 'Cafe', currency: 'TRY', translations: { en: { name: 'Cafe' } } }, categories: ['food'], products: ['dish'] };
const slugs = { categories: ['food'], products: ['dish'] };
const input = { mode: 'replace', restaurant: { name: 'Cafe', currency: 'TRY', translations: { en: { name: 'Cafe' } } } };
test('snapshot editor can save catalog with unchanged settings', () => {
  assert.doesNotThrow(() => assertSnapshotPermissions('editor', input, current, slugs));
});
test('snapshot cannot bypass manager-only settings or translation authorization', () => {
  for (const restaurant of [{name:'Changed'}, {currency:'USD'}, {translations:{en:{name:'Changed'}}}]) {
    assert.throws(() => assertSnapshotPermissions('editor', {...input, restaurant}, current, slugs), {statusCode:403});
  }
});
test('snapshot cannot bypass manager-only category/product deletion', () => {
  for (const kind of ['categories','products']) assert.throws(() => assertSnapshotPermissions('editor', input, current, {...slugs,[kind]:[]}), {statusCode:403});
  assert.doesNotThrow(() => assertSnapshotPermissions('editor', {...input,mode:'merge'}, current, {categories:[],products:[]}));
});
test('manager can replace/empty catalog; viewer and unknown roles cannot write', () => {
  assert.doesNotThrow(() => assertSnapshotPermissions('manager', {...input,restaurant:{name:'Changed'}}, current, {categories:[],products:[]}));
  for (const role of ['viewer','unknown']) assert.throws(() => assertSnapshotPermissions(role, input, current, slugs), {statusCode:403});
});
