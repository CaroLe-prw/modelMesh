import assert from 'node:assert/strict';
import test from 'node:test';
import { adminMerchantResourceUrl } from '../src/features/account/components/admin/admin-merchant-resource-navigation.ts';
import { isMerchantModelRoutable } from '../src/features/account/components/admin/admin-merchant-resource-state.ts';

test('admin merchant resource links stay in the admin merchant section', () => {
  assert.equal(
    adminMerchantResourceUrl(47, 'channels'),
    '/admin/merchants?merchantId=47&resource=channels',
  );
  assert.equal(
    adminMerchantResourceUrl(47, 'models'),
    '/admin/merchants?merchantId=47&resource=models',
  );
  assert.equal(
    adminMerchantResourceUrl(47, 'modelLogs'),
    '/admin/merchants?merchantId=47&resource=modelLogs',
  );
});

test('a published model is not routable while its channel is offline', () => {
  assert.equal(
    isMerchantModelRoutable({
      channelStatus: 'offline',
      hasApprovedPrice: true,
      reviewStatus: 'approved',
      status: 'published',
    }),
    false,
  );
  assert.equal(
    isMerchantModelRoutable({
      channelStatus: 'active',
      hasApprovedPrice: true,
      reviewStatus: 'approved',
      status: 'published',
    }),
    true,
  );
});
