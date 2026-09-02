import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatRelativeTime,
  formatMarketplacePrice,
  merchantComparablePrice,
  merchantMatchesId,
  merchantMatchesBillingMode,
  merchantSignals,
  merchantTags,
  sortMarketplaceMerchants,
  type MarketplaceMerchant,
} from '../src/features/models/data/marketplace.ts';

const merchant: MarketplaceMerchant = {
  billingMode: 'token',
  channelId: 7,
  description: 'Low latency',
  healthUpdatedAt: '2026-08-31T08:00:00Z',
  id: 'merchant-7',
  inputPrice: 0.01,
  isInRoute: false,
  isPinned: false,
  latencyMs: 2_400,
  name: 'Atlas Route',
  outputPrice: 0.06,
  pricing: {
    official: {
      cacheRead: '0.001',
      cacheWrite: '0.01',
      input: '0.01',
      output: '0.06',
      request: null,
    },
    merchant: {
      cacheRead: '0.0012',
      cacheWrite: '0.012',
      input: '0.01',
      output: '0.06',
      request: null,
    },
  },
  priceMultiplier: 0.9,
  requestPrice: 0,
  successRate: 99.2,
};

test('mixed merchant billing uses the comparable price for its own mode', () => {
  assert.equal(merchantComparablePrice(merchant), 0.01);
  assert.equal(
    merchantComparablePrice({
      ...merchant,
      billingMode: 'request',
      requestPrice: 0.25,
    }),
    0.25,
  );
});

test('marketplace prices use the selected configured display currency', () => {
  assert.equal(formatMarketplacePrice(1.25, { code: 'USD', exchangeRate: '1' }), '$1.2500');
  assert.equal(formatMarketplacePrice(1.25, { code: 'CNY', exchangeRate: '7.2' }), '¥9.0000');
  assert.equal(formatMarketplacePrice(0.001, { code: 'EUR', exchangeRate: '0.92' }), '€0.000920');
});

test('merchant tags are derived from live price and health metrics', () => {
  assert.deepEqual(merchantTags(merchant), ['stable', 'lowCost', 'fast', 'quality']);
});

test('merchant ID query matches public channel ID and listing ID', () => {
  assert.equal(merchantMatchesId(merchant, '7'), true);
  assert.equal(merchantMatchesId(merchant, 'MERCHANT-7'), true);
  assert.equal(merchantMatchesId(merchant, 'missing'), false);
  assert.equal(merchantMatchesId(merchant, '  '), true);
});

test('merchant billing mode filter supports all, token, and request listings', () => {
  assert.equal(merchantMatchesBillingMode(merchant, 'all'), true);
  assert.equal(merchantMatchesBillingMode(merchant, 'token'), true);
  assert.equal(merchantMatchesBillingMode(merchant, 'request'), false);
});

test('merchant sorting supports recent, token prices, latency, and success rate', () => {
  const fasterMerchant: MarketplaceMerchant = {
    ...merchant,
    healthUpdatedAt: '2026-08-31T09:00:00Z',
    id: 'merchant-8',
    inputPrice: 0.02,
    latencyMs: 900,
    name: 'Northstar',
    outputPrice: 0.04,
    successRate: 98,
  };
  const requestMerchant: MarketplaceMerchant = {
    ...merchant,
    billingMode: 'request',
    healthUpdatedAt: '2026-08-31T10:00:00Z',
    id: 'merchant-9',
    inputPrice: 0,
    name: 'Request Route',
    outputPrice: 0,
    requestPrice: 0.1,
  };
  const unknownRecentMerchant: MarketplaceMerchant = {
    ...merchant,
    healthUpdatedAt: 'invalid',
    id: 'merchant-10',
    name: 'Unknown Recent Route',
  };
  const merchants = [merchant, fasterMerchant, requestMerchant, unknownRecentMerchant];

  assert.deepEqual(
    sortMarketplaceMerchants(merchants, 'recent').map((item) => item.id),
    ['merchant-9', 'merchant-8', 'merchant-7', 'merchant-10'],
  );
  assert.deepEqual(
    sortMarketplaceMerchants(merchants, 'input').map((item) => item.id),
    ['merchant-7', 'merchant-10', 'merchant-8', 'merchant-9'],
  );
  assert.deepEqual(
    sortMarketplaceMerchants(merchants, 'output').map((item) => item.id),
    ['merchant-8', 'merchant-7', 'merchant-10', 'merchant-9'],
  );
  assert.equal(sortMarketplaceMerchants(merchants, 'latency')[0]?.id, 'merchant-8');
  assert.equal(sortMarketplaceMerchants(merchants, 'success')[0]?.id, 'merchant-7');
});

test('signal bars always contain eight bounded health samples', () => {
  assert.equal(merchantSignals(100).length, 8);
  assert.deepEqual(
    merchantSignals(100),
    Array.from({ length: 8 }, () => 'good'),
  );
  assert.equal(merchantSignals(-10).length, 8);
  assert.equal(merchantSignals(140).length, 8);
});

test('relative health timestamps use the selected locale', () => {
  assert.equal(
    formatRelativeTime('2026-08-31T07:59:00Z', 'en', Date.parse('2026-08-31T08:00:00Z')),
    '1 minute ago',
  );
  assert.equal(formatRelativeTime('invalid', 'en'), '—');
});
