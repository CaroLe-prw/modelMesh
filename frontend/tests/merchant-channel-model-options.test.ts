import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeModelOptions } from '../src/features/account/components/merchant/merchant-channel-model-options.ts';

test('keeps an unchecked discovered model available after reopening the editor', () => {
  const supportedModels = ['gpt-5.4'];
  const discoveredModels = ['gpt-5.4', 'gpt-5.5', 'gpt-5.6-sol'];

  const availableModels = mergeModelOptions(supportedModels, discoveredModels);

  assert.deepEqual(availableModels, discoveredModels);
  assert.deepEqual(supportedModels, ['gpt-5.4']);
});

test('deduplicates and sorts merged model options', () => {
  assert.deepEqual(mergeModelOptions(['gpt-5.6-sol', 'gpt-5.4'], ['gpt-5.4', 'gpt-5.5']), [
    'gpt-5.4',
    'gpt-5.5',
    'gpt-5.6-sol',
  ]);
});
