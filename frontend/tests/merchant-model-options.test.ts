import assert from 'node:assert/strict';
import test from 'node:test';
import { filterAvailableMerchantModelOptions } from '../src/features/account/components/merchant/merchant-model-options.ts';

const options = [
  { id: 1, identifier: 'gpt-5.6-luna' },
  { id: 2, identifier: 'gpt-5.6-sol' },
  { id: 3, identifier: 'gpt-5.6-terra' },
];

const listings = [
  { channelId: 'channel-a', id: 'listing-a', modelId: 2 },
  { channelId: 'channel-b', id: 'listing-b', modelId: 3 },
];

test('hides a model already uploaded through the selected channel', () => {
  assert.deepEqual(
    filterAvailableMerchantModelOptions(options, listings, 'channel-a').map(
      (option) => option.identifier,
    ),
    ['gpt-5.6-luna', 'gpt-5.6-terra'],
  );
});

test('keeps the current model available while editing its listing', () => {
  assert.deepEqual(
    filterAvailableMerchantModelOptions(options, listings, 'channel-a', 'listing-a').map(
      (option) => option.identifier,
    ),
    ['gpt-5.6-luna', 'gpt-5.6-sol', 'gpt-5.6-terra'],
  );
});

test('does not hide the same model when it belongs to another channel', () => {
  assert.deepEqual(
    filterAvailableMerchantModelOptions(options, listings, 'channel-b').map(
      (option) => option.identifier,
    ),
    ['gpt-5.6-luna', 'gpt-5.6-sol'],
  );
});
