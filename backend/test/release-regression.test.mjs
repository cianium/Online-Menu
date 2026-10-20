import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {parseCookie} from '../../supabase/functions/romano-order/core.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = rel => fs.readFileSync(path.join(root,rel),'utf8');

test('Malformed percent-encoded table session cookie fails closed', () => {
  assert.equal(parseCookie('romano_table_session=%', 'romano_table_session'), null);
  assert.equal(parseCookie('romano_table_session=%E0%A4%A', 'romano_table_session'), null);
  assert.equal(parseCookie('other=1; romano_table_session=valid', 'romano_table_session'), 'valid');
});

test('Payment start rejects JSON primitives before accessing payment fields', () => {
  assert.match(read('supabase/functions/romano-payment/index.ts'), /Array\.isArray\(value\).*INVALID_PAYMENT_REQUEST/);
});

test('KDS translates runtime statuses, actions and messages in four languages', () => {
  const dictionary = read('admin/admin-i18n.js');
  const kds = read('admin/orders.js');
  for (const source of ['سفارش فعال', 'پذیرش سفارش', 'پرداخت‌نشده', 'تغییر وضعیت انجام نشد.']) {
    assert.ok(dictionary.includes(JSON.stringify(source)), `Missing dictionary key ${source}`);
  }
  assert.match(kds,/romano:language-changed/);
  assert.match(kds,/safe\(t\(action\[1\]\)\)/);
  assert.match(kds,/number\(item\.quantity\)/);
});
