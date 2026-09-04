import assert from 'node:assert/strict';
import test from 'node:test';
import type { MerchantModel } from '../src/features/account/api/merchant-models.ts';
import { merchantModelPricingViews } from '../src/features/account/components/admin/admin-merchant-model-pricing.ts';

const model: MerchantModel = {
  billingMode: 'token',
  channelId: '00000000-0000-4000-8000-000000000001',
  channelName: 'openai',
  channelStatus: 'active',
  contextWindow: 1_050_000,
  createdAt: '2026-09-04T09:00:00Z',
  hasApprovedPrice: true,
  id: '00000000-0000-4000-8000-000000000002',
  inputPrice: 2,
  modelId: 1,
  modelIdentifier: 'gpt-5.6-sol',
  modelName: 'GPT-5.6 Sol',
  outputPrice: 20,
  pendingPrice: {
    billingMode: 'token',
    effectiveAt: '2026-09-04T10:24:39Z',
    inputPrice: 2,
    outputPrice: 20,
    priceCurrency: 'USD',
    pricing: {
      base: { input: 2, output: 20 },
      tiers: [
        {
          rates: { input: 8, output: 0 },
          size: 1_050_000,
          tierType: 'context',
        },
      ],
    },
  },
  priceCurrency: 'USD',
  pricing: {
    base: { input: 2, output: 20 },
    tiers: [
      {
        rates: { input: 8, output: 30 },
        size: 1_050_000,
        tierType: 'context',
      },
    ],
  },
  providerId: 'openai',
  reviewNote: '',
  reviewStatus: 'approved',
  status: 'published',
  updatedAt: '2026-09-04T10:24:39Z',
};

test('administrator pricing includes a scheduled context-tier price change', () => {
  const views = merchantModelPricingViews(model);

  assert.deepEqual(
    views.map((view) => view.kind),
    ['current', 'pending'],
  );
  assert.equal(views[0]?.pricing?.tiers?.[0]?.rates.output, 30);
  assert.equal(views[1]?.pricing?.tiers?.[0]?.rates.output, 0);
  assert.equal(views[1]?.effectiveAt, '2026-09-04T10:24:39Z');
});
