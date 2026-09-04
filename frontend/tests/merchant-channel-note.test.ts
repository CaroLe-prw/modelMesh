import assert from 'node:assert/strict';
import test from 'node:test';
import { merchantChannelDisplayNote } from '../src/features/account/components/merchant/merchant-channel-note.ts';

test('administrator operation note is shown before the earlier review note', () => {
  assert.equal(merchantChannelDisplayNote('审核通过', '有问题'), '有问题');
  assert.equal(merchantChannelDisplayNote('需要补充资料', ''), '需要补充资料');
  assert.equal(merchantChannelDisplayNote('', undefined), '');
});
