import assert from 'node:assert/strict';
import test from 'node:test';
import { fixedSettlementCurrency } from '../src/features/account/components/merchant/merchant-settlement-form.ts';

test('keeps fixed settlement currencies visible for Alipay and USDT', () => {
  assert.equal(fixedSettlementCurrency('alipay'), 'CNY');
  assert.equal(fixedSettlementCurrency('usdt'), 'USDT');
  assert.equal(fixedSettlementCurrency('bank'), null);
});
