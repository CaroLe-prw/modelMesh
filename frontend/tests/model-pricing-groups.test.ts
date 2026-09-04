import assert from 'node:assert/strict';
import test from 'node:test';
import { modelPricingGroups } from '../src/features/account/components/admin/model-pricing.ts';

test('merchant pricing keeps base, context, and fast-mode context groups', () => {
  const groups = modelPricingGroups({
    base: { cache_read: 0.4, cache_write: 5, input: 2, output: 20 },
    experimentalModes: {
      fast: { cache_read: 0.8, cache_write: 10, input: 8, output: 40 },
    },
    experimentalModeTiers: {
      fast: [
        {
          rates: { cache_read: 1.6, cache_write: 20, input: 16, output: 60 },
          size: 272_000,
          tierType: 'context',
        },
      ],
    },
    tiers: [
      {
        rates: { cache_read: 0.8, cache_write: 10, input: 8, output: 30 },
        size: 272_000,
        tierType: 'context',
      },
    ],
  });

  assert.deepEqual(
    groups.map((group) => group.id),
    ['base', 'tier-context-272000', 'experimental-fast', 'experimental-fast-tier-context-272000'],
  );
  assert.equal(groups[0]?.maximumInclusive, 272_000);
  assert.equal(groups[1]?.rates.input, 8);
  assert.equal(groups[3]?.rates.output, 60);
});
